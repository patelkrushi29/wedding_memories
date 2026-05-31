export const dynamic = 'force-dynamic';

import { TopNav } from '@/components/TopNav';
import { AlbumCard } from '@/components/AlbumCard';
import { EmptyState } from '@/components/EmptyState';
import { listAlbumsForGallery } from '@/lib/albums/queries';

export default async function AlbumsPage() {
  const albums = await listAlbumsForGallery();

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-gray-800">Albums</h1>
          <p className="text-gray-500 mt-1">{albums.length} albums</p>
        </div>

        {albums.length === 0 ? (
          <EmptyState
            message="No albums yet"
            description="Run npm run sync:r2 after uploading files to R2 media/."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
