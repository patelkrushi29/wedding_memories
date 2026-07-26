/**
 * Suggest a name for each unnamed candidate function.
 *
 * CLIP puts text and images in the same vector space, so a cluster's centroid can
 * be scored directly against phrases like "a wedding ceremony" with no training
 * and no labelled data. The host still decides — this only replaces a blank field
 * with a starting point.
 *
 * Usage:
 *   npm run suggest:names              # print suggestions
 *   npm run suggest:names -- --apply   # write them onto unnamed candidates
 */
import 'dotenv/config';
import { AutoTokenizer, CLIPTextModelWithProjection, env } from '@huggingface/transformers';
import slugify from 'slugify';
import { prisma } from './db';
import { MODEL_ID, configureLocalModels, cosine, normalize } from './clip';

configureLocalModels(env);
const APPLY = process.argv.includes('--apply');

/**
 * Candidate labels. Deliberately broad and wedding-specific; the phrasing matters
 * more than the word count because CLIP was trained on captions.
 */
const PROMPTS: { label: string; prompt: string }[] = [
  { label: 'Getting ready', prompt: 'a bride and her bridesmaids getting ready, hair and makeup' },
  { label: 'Mehendi', prompt: 'a mehendi ceremony, henna being applied to hands' },
  { label: 'Haldi', prompt: 'a haldi ceremony, yellow turmeric paste on the bride and groom' },
  { label: 'Sangeet', prompt: 'a sangeet night, family dancing on a stage with lights' },
  { label: 'The ceremony', prompt: 'a wedding ceremony with the couple at the altar or mandap' },
  { label: 'Portraits', prompt: 'formal posed portraits of the bride and groom outdoors' },
  { label: 'Family photographs', prompt: 'a large formal group photograph of the whole family' },
  { label: 'The reception', prompt: 'a wedding reception dinner, speeches and toasts at tables' },
  { label: 'The dance floor', prompt: 'guests dancing at a party on a dark dance floor' },
  { label: 'The cake', prompt: 'a wedding cake being cut' },
  { label: 'The venue', prompt: 'an empty decorated venue, flowers and table settings' },
  { label: 'Baraat', prompt: 'a baraat procession in the street with drums and dancing' },
  { label: 'Candid moments', prompt: 'candid photographs of guests talking and laughing' },
];

async function main() {
  const candidates = await prisma.tag.findMany({
    where: { kind: 'FUNCTION', source: 'clip-cluster' },
    include: { assets: { select: { asset: { select: { embedding: true } } } } },
    orderBy: { sortOrder: 'asc' },
  });

  if (candidates.length === 0) {
    console.error('No visual candidates found. Run `npm run cluster:visual` first.');
    process.exit(1);
  }

  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'q8' });

  const labelVectors: { label: string; vec: number[] }[] = [];
  for (const { label, prompt } of PROMPTS) {
    const inputs = tokenizer([prompt], { padding: true, truncation: true });
    const { text_embeds } = await textModel(inputs);
    labelVectors.push({ label, vec: normalize(text_embeds.data as Float32Array) });
  }

  console.log(`Scoring ${candidates.length} candidate(s) against ${PROMPTS.length} labels:\n`);

  for (const tag of candidates) {
    const vectors = tag.assets.map((a) => a.asset.embedding).filter((e) => e.length > 0);
    if (vectors.length === 0) continue;

    const dims = vectors[0].length;
    const mean = new Array<number>(dims).fill(0);
    for (const v of vectors) for (let i = 0; i < dims; i++) mean[i] += v[i] / vectors.length;
    const centroid = normalize(mean);

    // Raw image↔text cosines all sit around 0.3 and differ by ~0.01, which reads
    // as noise. CLIP is trained with a logit scale of 100, so scale and softmax
    // over the label set to get a probability you can actually judge.
    const LOGIT_SCALE = 100;
    const logits = labelVectors.map((l) => ({
      label: l.label,
      logit: cosine(centroid, l.vec) * LOGIT_SCALE,
    }));
    const max = Math.max(...logits.map((l) => l.logit));
    const exps = logits.map((l) => ({ label: l.label, e: Math.exp(l.logit - max) }));
    const sum = exps.reduce((s, l) => s + l.e, 0);
    const ranked = exps
      .map((l) => ({ label: l.label, p: l.e / sum }))
      .sort((a, b) => b.p - a.p);

    const top = ranked[0];
    const runnerUp = ranked[1];
    const pct = (p: number) => `${(p * 100).toFixed(0)}%`;
    const confident = top.p > 0.5;

    console.log(
      `  ${tag.name} (${String(vectors.length).padStart(3)} photos) → ${top.label} ${pct(top.p)}` +
        `   [then ${runnerUp.label} ${pct(runnerUp.p)}]${confident ? '' : '   ← low confidence'}`
    );

    if (APPLY && /^Scene \d+$/.test(tag.name)) {
      const name = top.label;
      const desired = slugify(name, { lower: true, strict: true });
      const clash = await prisma.tag.findUnique({ where: { slug: desired } });
      await prisma.tag.update({
        where: { id: tag.id },
        data: { name, ...(clash && clash.id !== tag.id ? {} : { slug: desired }) },
      });
    }
  }

  console.log(
    APPLY
      ? '\nApplied to unnamed candidates. Review and publish them in /admin.'
      : '\nRe-run with --apply to write these onto the candidates.'
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
