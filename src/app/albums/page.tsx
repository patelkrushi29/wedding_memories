import { TopNav } from '@/components/TopNav';
import { AlbumCard } from '@/components/AlbumCard';
import { EmptyState } from '@/components/EmptyState';

interface Album {
  id: string;
  title: string;
  slug: string;
  totalCount: number;
  coverThumbnailUrl: string | null;
}

async function getAlbums(): Promise<Album[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/albums`, {
      cache: 'no-store',
    });
    return res.json();
  } catch {
    return [];
  }
}

export default async function AlbumsPage() {
  const albums = await getAlbums();

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
            description="Import your wedding photos to create albums automatically."
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
