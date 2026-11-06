/**
 * Face detection and embedding on CPU, no GPU and no cloud service.
 *
 * Uses @vladmandic/human (MIT, models bundled in the npm package) on the
 * TensorFlow.js WebAssembly backend: BlazeFace to find faces, FaceMesh + Iris for
 * landmarks (which also yields blink detection), and FaceRes for a 1024-d
 * identity embedding. ~0.2 s per photo on a laptop core or a GitHub runner.
 *
 * Model choice was measured, not assumed: on a labelled test set FaceRes kept
 * every different-person pair apart at cosine 0.5 with average linkage; the
 * "deep" variant merged strangers, and the MobileFaceNet graphs produced constant
 * outputs under tfjs-wasm. See docs/DECISIONS.md D24.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const HUMAN_DIST = path.join(ROOT, 'node_modules/@vladmandic/human/dist/human.node-wasm.js');
const MODELS = path.join(ROOT, 'node_modules/@vladmandic/human/models/');
const WASM = path.join(ROOT, 'node_modules/@tensorflow/tfjs-backend-wasm/dist/');

export interface DetectedFace {
  /** [x, y, w, h] in pixels of the analysed image. */
  box: [number, number, number, number];
  score: number;
  embedding: number[];
  /** Either eye detected closed. */
  blink: boolean;
  /** "center" | "left" | "right" — from landmarks. */
  facing: string;
}

export interface Detection {
  width: number;
  height: number;
  faces: DetectedFace[];
}

// Node's fetch has no file:// support, and the library loads models and wasm via fetch.
function installFileFetch() {
  const g = globalThis as unknown as { __fileFetch?: boolean; fetch: typeof fetch };
  if (g.__fileFetch) return;
  const real = g.fetch;
  g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('file://')) {
      const body = fs.readFileSync(new URL(url));
      const type = url.endsWith('.json') ? 'application/json' : url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream';
      return new Response(body, { status: 200, headers: { 'Content-Type': type } });
    }
    return real(input, init);
  }) as typeof fetch;
  g.__fileFetch = true;
}

// The package's "exports" map lacks "./" prefixes, so Node refuses the subpath;
// load the built file by absolute path instead.
type HumanModule = { Human: new (config: object) => HumanInstance };
interface HumanInstance {
  load(): Promise<void>;
  warmup(): Promise<unknown>;
  detect(input: unknown): Promise<{
    face: { id: number; box: number[]; score: number; embedding?: number[] }[];
    gesture: { face?: number; gesture: string }[];
  }>;
  tf: {
    tensor3d(values: Uint8Array, shape: [number, number, number], dtype: 'int32'): unknown;
    dispose(t: unknown): void;
  };
}

let instance: Promise<HumanInstance> | null = null;

export function getDetector(): Promise<HumanInstance> {
  if (!instance) {
    instance = (async () => {
      installFileFetch();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Human } = require(HUMAN_DIST) as HumanModule;
      const human = new Human({
        backend: 'wasm',
        wasmPath: 'file://' + WASM,
        modelBasePath: 'file://' + MODELS,
        debug: false,
        // Stills, not video: never reuse the previous frame's results.
        cacheSensitivity: 0,
        face: {
          enabled: true,
          detector: { maxDetected: 40, minConfidence: 0.5, rotation: true, skipFrames: 0, skipTime: 0, return: false },
          mesh: { enabled: true },
          iris: { enabled: true },
          description: { enabled: true, skipFrames: 0, skipTime: 0 },
          emotion: { enabled: false },
          antispoof: { enabled: false },
          liveness: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: true },
        segmentation: { enabled: false },
      });
      await human.load();
      await human.warmup();
      return human;
    })();
  }
  return instance;
}

/** Detect faces in an encoded image (JPEG/WebP/PNG). Analysed at most 1600px on the long side. */
export async function detectFaces(image: Buffer): Promise<Detection> {
  const human = await getDetector();
  const { data, info } = await sharp(image)
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = human.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32');
  try {
    const res = await human.detect(tensor);
    const faces: DetectedFace[] = res.face
      .filter((f) => f.embedding && f.embedding.length > 0)
      .map((f) => {
        const gestures = res.gesture.filter((g) => g.face === f.id).map((g) => g.gesture);
        return {
          box: f.box.map((v) => Math.round(v)) as [number, number, number, number],
          score: Math.round(f.score * 1000) / 1000,
          embedding: Array.from(f.embedding!, (v) => Math.round(v * 1e5) / 1e5),
          blink: gestures.some((g) => g.startsWith('blink')),
          facing: gestures.find((g) => g.startsWith('facing'))?.replace('facing ', '') ?? 'center',
        };
      });
    return { width: info.width, height: info.height, faces };
  } finally {
    human.tf.dispose(tensor);
  }
}

/** Square, padded crop around a face, for the face wall. */
export async function cropFace(image: Buffer, analysed: { width: number; height: number }, box: DetectedFace['box'], size = 256): Promise<Buffer> {
  const base = sharp(image).rotate().resize(analysed.width, analysed.height, { fit: 'fill' });
  const [x, y, w, h] = box;
  // Tight enough that the face fills a round avatar, with a little hair and chin.
  const side = Math.round(Math.max(w, h) * 1.3);
  const cx = x + w / 2;
  const cy = y + h / 2 - h * 0.04;
  const left = Math.max(0, Math.round(cx - side / 2));
  const top = Math.max(0, Math.round(cy - side / 2));
  const width = Math.min(side, analysed.width - left);
  const height = Math.min(side, analysed.height - top);
  const raw = await base.raw().toBuffer({ resolveWithObject: true });
  return sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: raw.info.channels } })
    .extract({ left, top, width, height })
    .resize(size, size, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();
}
