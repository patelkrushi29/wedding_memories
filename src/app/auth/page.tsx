import { AuthForm } from '@/components/AuthForm';
import { getSiteConfig } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AuthPage() {
  const { coupleNames } = await getSiteConfig();
  return <AuthForm coupleNames={coupleNames} />;
}
