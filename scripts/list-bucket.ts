import 'dotenv/config';
import { listR2Objects } from './r2';

async function main() {
  const all = await listR2Objects('');
  const byPrefix: Record<string, { count: number; sample: string }> = {};
  for (const o of all) {
    const prefix = o.key.includes('/') ? `${o.key.split('/').slice(0, -1).join('/')}/` : '(root)';
    if (!byPrefix[prefix]) byPrefix[prefix] = { count: 0, sample: o.key };
    byPrefix[prefix].count++;
  }
  console.log(`Bucket "${process.env.R2_BUCKET_NAME}" — ${all.length} objects\n`);
  for (const [prefix, info] of Object.entries(byPrefix).sort()) {
    console.log(`  ${prefix}  ${info.count} files   e.g. ${info.sample}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
