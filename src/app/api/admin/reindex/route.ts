import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.ADMIN_REINDEX_SECRET || 'local-admin-secret';
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    execSync('npx tsx scripts/import-media.ts', {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
      timeout: 120000,
    });
    return NextResponse.json({ ok: true, message: 'Reindex complete' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
