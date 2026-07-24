'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/utils';
import type { Asset } from '@/types/asset';

interface MediaViewerModalProps {
  asset: Asset | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** Adjacent assets for image preloading (optional) */
  prevAsset?: Asset | null;
  nextAsset?: Asset | null;
}

const SWIPE_THRESHOLD = 70; // px to commit a horizontal swipe
const DISMISS_THRESHOLD = 90; // px downward to dismiss

export function MediaViewerModal({
  asset,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  prevAsset,
  nextAsset,
}: MediaViewerModalProps) {
  const [chromeVisible, setChromeVisible] = useState(true);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef(0);
  const axisLock = useRef<'x' | 'y' | null>(null);

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
    // Lock body scroll while viewer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [handleKey]);

  // Reset transient state when the photo changes
  useEffect(() => {
    setDrag(null);
    setZoomed(false);
    axisLock.current = null;
  }, [asset?.id]);

  // Preload neighbours so swipes feel instant
  useEffect(() => {
    [prevAsset, nextAsset].forEach((a) => {
      if (a && a.type === 'PHOTO') {
        const img = new Image();
        img.src = a.previewUrl;
      }
    });
  }, [prevAsset, nextAsset]);

  if (!asset) return null;

  const isVideo = asset.type === 'VIDEO';

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || zoomed) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    axisLock.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1 || zoomed) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    if (!axisLock.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      axisLock.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axisLock.current === 'x') setDrag({ x: dx, y: 0 });
    else if (axisLock.current === 'y' && dy > 0) setDrag({ x: 0, y: dy }); // only downward
  };

  const onTouchEnd = () => {
    const start = touchStart.current;
    touchStart.current = null;

    // Double-tap zoom toggle (photos only)
    const now = Date.now();
    if (start && drag === null && !isVideo) {
      if (now - lastTap.current < 300) {
        setZoomed((z) => !z);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      // Single tap toggles chrome (after the double-tap window, handled via click on desktop too)
      setTimeout(() => {
        if (lastTap.current !== 0 && Date.now() - lastTap.current >= 280) {
          setChromeVisible((v) => !v);
          lastTap.current = 0;
        }
      }, 300);
      return;
    }

    if (!drag) return;
    if (drag.y > DISMISS_THRESHOLD) {
      onClose();
      return;
    }
    if (drag.x < -SWIPE_THRESHOLD && hasNext && onNext) onNext();
    else if (drag.x > SWIPE_THRESHOLD && hasPrev && onPrev) onPrev();
    setDrag(null);
  };

  const dismissProgress = drag ? Math.min(1, drag.y / 300) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: `rgba(0,0,0,${0.95 - dismissProgress * 0.5})` }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-w-6xl w-full h-full sm:p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Top bar */}
        <div
          className={`absolute sm:relative top-0 inset-x-0 z-10 flex items-center justify-between p-3 sm:p-0 sm:mb-3 text-white transition-opacity duration-200 bg-gradient-to-b from-black/60 to-transparent sm:bg-none ${
            chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-medium text-sm truncate max-w-[40vw] sm:max-w-xs">{asset.filename}</span>
            {asset.album && (
              <Badge variant="secondary" className="hidden sm:inline-flex text-xs bg-white/10 text-white border-0">
                {asset.album.title}
              </Badge>
            )}
            <span className="hidden sm:inline text-xs text-white/50">{formatBytes(asset.fileSizeBytes)}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
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
        <div className="relative flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          {isVideo ? (
            <video
              src={asset.previewUrl}
              controls
              autoPlay
              preload="metadata"
              className="max-w-full max-h-full sm:rounded-lg"
            />
          ) : (
            <img
              src={asset.previewUrl}
              alt={asset.filename}
              draggable={false}
              className="max-w-full max-h-full object-contain sm:rounded-lg select-none"
              style={{
                maxHeight: 'calc(100dvh - 0px)',
                transform: drag
                  ? `translate(${drag.x}px, ${drag.y}px) scale(${1 - dismissProgress * 0.15})`
                  : zoomed
                  ? 'scale(2.2)'
                  : undefined,
                transition: drag ? 'none' : 'transform 0.25s ease',
                cursor: zoomed ? 'zoom-out' : 'zoom-in',
              }}
              onDoubleClick={() => setZoomed((z) => !z)}
            />
          )}

          {/* Prev/Next arrows — desktop */}
          {hasPrev && onPrev && (
            <button
              onClick={onPrev}
              className={`hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all ${
                chromeVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNext && onNext && (
            <button
              onClick={onNext}
              className={`hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all ${
                chromeVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
