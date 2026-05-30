'use client';

import { Play, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatBytes } from '@/lib/utils';

interface Asset {
  id: string;
  filename: string;
  thumbnailUrl: string;
  downloadUrl: string;
  durationSeconds?: number | null;
  fileSizeBytes: number;
  album?: { title: string; slug: string } | null;
}

interface VideoCardProps {
  asset: Asset;
  onClick: () => void;
}

export function VideoCard({ asset, onClick }: VideoCardProps) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-gray-900 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <div className="aspect-video">
        <img
          src={asset.thumbnailUrl}
          alt={asset.filename}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      </div>
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Play className="h-5 w-5 text-white ml-0.5 fill-white" />
        </div>
      </div>
      {/* Duration badge */}
      {asset.durationSeconds && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {formatDuration(asset.durationSeconds)}
        </div>
      )}
      {/* Bottom info */}
      <div className="p-3 bg-white">
        <p className="text-sm font-medium text-gray-800 truncate" title={asset.filename}>
          {asset.filename}
        </p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            {asset.album && (
              <Badge variant="secondary" className="text-xs">{asset.album.title}</Badge>
            )}
            <span className="text-xs text-gray-400">{formatBytes(asset.fileSizeBytes)}</span>
          </div>
          <a
            href={asset.downloadUrl}
            download
            className="p-1 rounded text-gray-400 hover:text-[#c9a96e] transition-colors"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
