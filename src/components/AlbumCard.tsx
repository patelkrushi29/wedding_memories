import Link from 'next/link';
import { Image as ImageIcon } from 'lucide-react';

interface AlbumCardProps {
  album: {
    id: string;
    title: string;
    slug: string;
    totalCount: number;
    coverThumbnailUrl: string | null;
  };
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link href={`/albums/${album.slug}`} className="block group">
      <div className="rounded-xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="aspect-video relative overflow-hidden bg-gray-200">
          {album.coverThumbnailUrl ? (
            <img
              src={album.coverThumbnailUrl}
              alt={album.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-gray-300" />
            </div>
          )}
        </div>
        <div className="p-4 bg-white">
          <h3 className="font-serif font-semibold text-gray-800 group-hover:text-[#c9a96e] transition-colors">
            {album.title}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">{album.totalCount} items</p>
        </div>
      </div>
    </Link>
  );
}
