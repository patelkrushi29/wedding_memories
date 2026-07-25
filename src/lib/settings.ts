import { prisma } from '@/lib/db';

export interface SiteConfig {
  appName: string;
  coupleNames: string;
  weddingDate: Date | null;
}

/** Site settings with sane fallbacks — the SiteSetting row is optional. */
export async function getSiteConfig(): Promise<SiteConfig> {
  const row = await prisma.siteSetting.findFirst().catch(() => null);
  return {
    appName: row?.appName || process.env.NEXT_PUBLIC_APP_NAME || 'Wedding Memories',
    coupleNames: row?.coupleNames || process.env.NEXT_PUBLIC_COUPLE_NAMES || 'Wedding Memories',
    weddingDate: row?.weddingDate ?? null,
  };
}
