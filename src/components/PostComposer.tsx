'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Loader2, Share, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { movePostItem, POST_LIMIT, toggleInPost, usePostBasket } from '@/lib/postBasket';
import { prefersShareSheet } from '@/lib/saveMedia';
import { loadImage, render, TEMPLATES, toFile, type Template } from '@/lib/postRender';
import type { Asset } from '@/types/asset';

interface Props {
  coupleNames: string;
}

type Preview = { key: string; urls: string[]; error?: 'cors' | 'load' };

function dateLabel(assets: Asset[]): string {
  const times = assets.map((a) => a.takenAt).filter(Boolean).map((t) => new Date(t!));
  if (times.length === 0) return '';
  const d = new Date(Math.max(...times.map((t) => t.getTime())));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear()).slice(2)}`;
}

function fontOf(className: string): string {
  const probe = document.createElement('span');
  probe.className = className;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || 'system-ui, sans-serif';
}

/** Make a post: pick a layout, reorder, render on-device, share. */
export function PostComposer({ coupleNames }: Props) {
  const ids = usePostBasket();
  const [details, setDetails] = useState<Map<string, Asset>>(new Map());
  const [template, setTemplate] = useState<Template>('story');
  const [caption, setCaption] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sharing, setSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const canvases = useRef<HTMLCanvasElement[]>([]);
  const images = useRef(new Map<string, Promise<HTMLImageElement>>());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser capability once
    setCanShare(prefersShareSheet());
  }, []);

  // Fetch details for any id we don't know yet.
  const missing = ids.filter((id) => !details.has(id));
  const missingKey = missing.join(',');
  useEffect(() => {
    if (!missingKey) return;
    let live = true;
    fetch(`/api/assets?ids=${missingKey}&limit=${POST_LIMIT}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (!live) return;
        setDetails((prev) => {
          const next = new Map(prev);
          for (const a of data.items as Asset[]) next.set(a.id, a);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [missingKey]);

  const assets = useMemo(() => ids.map((id) => details.get(id)).filter((a): a is Asset => Boolean(a)), [ids, details]);
  const used = assets.slice(0, TEMPLATES[template].max);
  const renderKey = `${template}|${caption}|${used.map((a) => a.id).join(',')}`;
  const ready = assets.length === ids.length && ids.length > 0;

  // Render whenever the layout, order or caption changes.
  useEffect(() => {
    if (!ready || used.length === 0) return;
    let live = true;
    (async () => {
      try {
        await document.fonts?.ready;
        const imgs = await Promise.all(
          used.map((a) => {
            if (!images.current.has(a.id)) images.current.set(a.id, loadImage(a.previewUrl));
            return images.current.get(a.id)!;
          })
        );
        const out = render(template, imgs, {
          coupleNames,
          dateLabel: dateLabel(used),
          displayFont: fontOf('display'),
          bodyFont: fontOf('font-sans'),
          caption,
        });
        // Reading the canvas back proves it isn't tainted; previews are small JPEGs.
        const urls = out.map((c) => c.toDataURL('image/jpeg', 0.7));
        if (!live) return;
        canvases.current = out;
        setPreview({ key: renderKey, urls });
      } catch (err) {
        if (!live) return;
        const cors = (err as DOMException)?.name === 'SecurityError';
        setPreview({ key: renderKey, urls: [], error: cors ? 'cors' : 'load' });
      }
    })();
    return () => {
      live = false;
    };
    // renderKey captures template, caption and order; used/assets follow from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey, ready, coupleNames]);

  const share = async () => {
    if (!canvases.current.length) return;
    setSharing(true);
    try {
      const slug = coupleNames.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wedding';
      const files = await Promise.all(
        canvases.current.map((c, i) => toFile(c, `${slug}-${template}${canvases.current.length > 1 ? `-${i + 1}` : ''}.jpg`))
      );
      if (canShare && navigator.canShare?.({ files })) {
        await navigator.share({ files }).catch(() => {});
      } else {
        for (const f of files) {
          const href = URL.createObjectURL(f);
          const a = document.createElement('a');
          a.href = href;
          a.download = f.name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(href), 10_000);
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const current = preview?.key === renderKey ? preview : null;
  const t = TEMPLATES[template];

  if (ids.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-5 pt-8">
        <h1 className="display text-[40px]">Make a post</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ash">
          Tap <b className="text-paper">Add to post</b> on any photo — in the highlights or the viewer — and it lands
          here. Pick up to {POST_LIMIT}.
        </p>
        <Link href="/" className="btn btn-accent mt-6 w-full">
          Watch the highlights
        </Link>
        <Link href="/saved" className="btn btn-ghost mt-3 w-full">
          Use my saved photos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl pt-3">
      <header className="flex items-center justify-between px-2">
        <Link href="/saved" aria-label="Back" className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
        </Link>
        <h1 className="display text-[20px] tracking-normal">Make a post</h1>
        <span className="meta w-11 text-right">{used.length}/{t.max}</span>
      </header>

      {/* Preview */}
      <section className="flex justify-center px-5 pb-4 pt-2" aria-live="polite">
        {current?.error ? (
          <div className="flex aspect-[9/16] max-h-[52svh] w-full max-w-[290px] flex-col items-center justify-center gap-2 rounded-card bg-plate p-6 text-center">
            <p className="text-[15px] font-semibold">The photos couldn&rsquo;t be drawn</p>
            <p className="text-[13px] text-ash">
              {current.error === 'cors'
                ? 'The photo storage needs to allow this site (see DEPLOY.md, “R2 CORS rule”).'
                : 'Check your connection and try again.'}
            </p>
          </div>
        ) : current ? (
          <div className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-none">
            {current.urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Post preview ${i + 1} of ${current.urls.length}`}
                className="max-h-[52svh] shrink-0 snap-center rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                style={{ aspectRatio: `${t.w} / ${t.h}`, width: template === 'story' ? 'auto' : current.urls.length > 1 ? '78%' : '100%' }}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex max-h-[52svh] w-full max-w-[290px] items-center justify-center rounded-[16px] bg-plate"
            style={{ aspectRatio: `${t.w} / ${t.h}` }}
          >
            <Loader2 className="h-6 w-6 animate-spin text-ash" />
          </div>
        )}
      </section>

      {/* Layout */}
      <section className="px-5">
        <div className="eyebrow mb-2">Layout</div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TEMPLATES) as Template[]).map((key) => (
            <button
              key={key}
              onClick={() => setTemplate(key)}
              aria-pressed={template === key}
              className={cn(
                'flex h-[60px] flex-col items-center justify-center rounded-[14px] border text-[14px] font-semibold',
                template === key ? 'border-accent bg-accent-deep text-accent' : 'border-veil text-paper'
              )}
            >
              {TEMPLATES[key].label}
              <span className={cn('text-[11.5px] font-normal', template === key ? 'text-accent/80' : 'text-ash')}>
                {TEMPLATES[key].hint}
              </span>
            </button>
          ))}
        </div>
        <label className="mt-3 flex h-11 items-center justify-between text-[14px]">
          Names and date on the image
          <input type="checkbox" checked={caption} onChange={(e) => setCaption(e.target.checked)} className="h-5 w-5 accent-[#F4B23E]" />
        </label>
      </section>

      {/* Photos */}
      <section className="pt-3">
        <div className="eyebrow mb-2 px-5">
          Photos{assets.length > t.max ? ` · first ${t.max} used for ${t.label.toLowerCase()}` : ''}
        </div>
        <ol className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
          {assets.map((a, i) => (
            <li key={a.id} className={cn('relative shrink-0', i >= t.max && 'opacity-40')}>
              <img src={a.thumbnailUrl} alt="" className="h-[92px] w-[74px] rounded-[10px] object-cover" />
              <button
                onClick={() => toggleInPost(a.id)}
                aria-label="Remove from post"
                className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-veil bg-plate-2"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
              <div className="mt-1 flex justify-between">
                <button onClick={() => movePostItem(i, i - 1)} disabled={i === 0} aria-label="Move earlier" className="flex h-8 w-8 items-center justify-center text-ash disabled:opacity-25">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => movePostItem(i, i + 1)} disabled={i === assets.length - 1} aria-label="Move later" className="flex h-8 w-8 items-center justify-center text-ash disabled:opacity-25">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="px-5 pt-4">
        <button onClick={share} disabled={!current || Boolean(current.error) || sharing} className="btn btn-accent w-full">
          {sharing ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : canShare ? <Share className="h-[18px] w-[18px]" strokeWidth={2} /> : <Download className="h-[18px] w-[18px]" strokeWidth={2} />}
          {canShare ? 'Share to Instagram, WhatsApp…' : `Download ${current?.urls.length && current.urls.length > 1 ? `${current.urls.length} images` : 'image'}`}
        </button>
        <p className="mt-2 text-center text-[12.5px] text-dim">Made on your phone. Nothing is posted for you.</p>
      </div>
    </main>
  );
}
