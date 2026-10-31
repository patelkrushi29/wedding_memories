import { AppShell } from '@/components/AppShell';
import { PostComposer } from '@/components/PostComposer';
import { getSiteConfig } from '@/lib/settings';

export default async function PostPage() {
  const { coupleNames } = await getSiteConfig();
  return (
    <AppShell>
      <PostComposer coupleNames={coupleNames} />
    </AppShell>
  );
}
