import { BottomTabs } from './BottomTabs';
import { DesktopNav } from './DesktopNav';
import { getSiteConfig } from '@/lib/settings';

interface Props {
  children: React.ReactNode;
  /** Mono line under the couple name on wide screens, e.g. "3 days · 5 functions · 8,412" */
  subtitle?: string;
}

/** Page chrome: desktop nav on top, tab bar on mobile. Pages own their own headers. */
export async function AppShell({ children, subtitle }: Props) {
  const { coupleNames } = await getSiteConfig();

  return (
    <div className="min-h-screen bg-ink">
      <DesktopNav coupleNames={coupleNames} subtitle={subtitle} />
      {children}
      <BottomTabs />
    </div>
  );
}
