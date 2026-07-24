export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { EmptyState } from '@/components/EmptyState';
import { listEventTags } from '@/lib/tags/queries';
import { listAlbumsForGallery } from '@/lib/albums/queries';

export default async function EventsPage() {
  const events = (await listEventTags()).filter((e) => e.assetCount > 0);
  // Until events are named, albums act as the grouping
  const albums = events.length === 0 ? await listAlbumsForGallery() : [];

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-gray-800">Events</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            {events.length > 0 ? `${events.length} events` : 'Browse by moment'}
          </p>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/photos?event=${event.slug}`}
                className="group relative rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] shadow-sm hover:shadow-md transition-all"
              >
                {event.coverThumbnailUrl && (
                  <img
                    src={event.coverThumbnailUrl}
                    alt={event.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-4">
                  <h2 className="font-serif text-xl font-semibold text-white">{event.name}</h2>
                  <p className="text-white/80 text-sm">{event.assetCount} photos</p>
                </div>
              </Link>
            ))}
          </div>
        ) : albums.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/albums/${album.slug}`}
                className="group relative rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] shadow-sm hover:shadow-md transition-all"
              >
                {album.coverThumbnailUrl && (
                  <img
                    src={album.coverThumbnailUrl}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-4">
                  <h2 className="font-serif text-xl font-semibold text-white">{album.title}</h2>
                  <p className="text-white/80 text-sm">{album.totalCount} items</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState message="No events yet" description="Events appear once photos are grouped." />
        )}
      </main>
    </div>
  );
}
