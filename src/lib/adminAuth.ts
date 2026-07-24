import type { NextRequest } from 'next/server';

/** Admin routes: open in local dev, Bearer ADMIN_REINDEX_SECRET in production. */
export function isAdminAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const secret = process.env.ADMIN_REINDEX_SECRET;
  if (!secret || secret === 'change-me') return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}
