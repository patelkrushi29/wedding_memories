import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import { prisma } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();

  const data: { name?: string; slug?: string; isVisible?: boolean } = {};

  if (typeof body.name === 'string' && body.name.trim()) {
    const name = body.name.trim();
    data.name = name;
    const newSlug = slugify(name, { lower: true, strict: true });
    // Keep slugs unique — only update if free or already ours
    const clash = await prisma.tag.findUnique({ where: { slug: newSlug } });
    if (!clash || clash.id === id) data.slug = newSlug;
  }
  if (typeof body.isVisible === 'boolean') data.isVisible = body.isVisible;

  const tag = await prisma.tag.update({ where: { id }, data });
  return NextResponse.json({ ok: true, tag: { id: tag.id, name: tag.name, slug: tag.slug, isVisible: tag.isVisible } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await prisma.tag.delete({ where: { id } }); // AssetTag rows cascade
  return NextResponse.json({ ok: true });
}
