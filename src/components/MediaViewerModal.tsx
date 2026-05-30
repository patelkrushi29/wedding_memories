'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/utils';

interface Asset {
  id: string;
  type: string;
  filename: string;
  width?: number | null;
  height?: number | null;
  fileSizeBytes: number;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  album?: { title: string; slug: string } | null;
}

interface MediaViewerModalProps {
  asset: Asset | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function MediaViewerModal({
  asset,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: MediaViewerModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!asset) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-w-6xl max-h-screen w-full h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 text-white">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm truncate max-w-xs">{asset.filename}</span>
            {asset.album && (
              <Badge variant="secondary" className="text-xs bg-white/10 text-white border-0">
                {asset.album.title}
              </Badge>
            )}
            <span className="text-xs text-white/50">{formatBytes(asset.fileSizeBytes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton assetId={asset.id} />
            <a
              href={asset.downloadUrl}
              download
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Media content */}
        <div className="relative flex-1 flex items-center justify-center min-h-0">
          {asset.type === 'VIDEO' ? (
            <video
              src={asset.previewUrl}
              controls
              autoPlay
              preload="metadata"
              className="max-w-full max-h-full rounded-lg"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={asset.previewUrl}
                alt={asset.filename}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ maxHeight: 'calc(100vh - 160px)' }}
              />
            </div>
          )}

          {/* Prev/Next arrows */}
          {hasPrev && onPrev && (
            <button
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNext && onNext && (
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
