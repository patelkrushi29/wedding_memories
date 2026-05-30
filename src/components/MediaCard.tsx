'use client';

import { Download } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';

interface Asset {
  id: string;
  filename: string;
  thumbnailUrl: string;
  downloadUrl: string;
  width?: number | null;
  height?: number | null;
}

interface MediaCardProps {
  asset: Asset;
  onClick: () => void;
}

export function MediaCard({ asset, onClick }: MediaCardProps) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 aspect-square"
      onClick={onClick}
    >
      <img
        src={asset.thumbnailUrl}
        alt={asset.filename}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
      <div className="absolute bottom-0 inset-x-0 p-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <FavoriteButton assetId={asset.id} size="sm" />
        <a
          href={asset.downloadUrl}
          download
          className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
