'use client';

import { useEffect, useLayoutEffect, useCallback, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';
import { formatBytes } from '@/lib/utils';
import type { Asset } from '@/types/asset';

interface MediaViewerModalProps {
  asset: Asset | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** Adjacent assets: enable the sliding carousel + preloading */
  prevAsset?: Asset | null;
  nextAsset?: Asset | null;
}

const SWIPE_THRESHOLD = 60; // px to commit a horizontal swipe
const DISMISS_THRESHOLD = 90; // px downward to dismiss

type Settle = 'next' | 'prev' | 'cancel' | null;

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
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [settle, setSettle] = useState<Settle>(null);
  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const axisLock = useRef<'x' | 'y' | null>(null);
  const settleRef = useRef<Settle>(null);
  settleRef.current = settle;
  const trackRef = useRef<HTMLDivElement>(null);

  const animateTo = useCallback(
    (dir: 'next' | 'prev') => {
      if (settleRef.current) return; // ignore while animating
      if (dir === 'next' && hasNext && onNext) setSettle('next');
      if (dir === 'prev' && hasPrev && onPrev) setSettle('prev');
    },
    [hasNext, hasPrev, onNext, onPrev]
  );

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') animateTo('prev');
      if (e.key === 'ArrowRight') animateTo('next');
    },
    [onClose, animateTo]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [handleKey]);

  // New photo arrived: recenter the track instantly (no transition)
  useLayoutEffect(() => {
    setSettle(null);
    setDragX(0);
    setDragY(0);
    setZoomed(false);
    axisLock.current = null;
    const el = trackRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = 'translate(-33.333%, 0px) scale(1)';
    }
  }, [asset?.id]);

  // Preload neighbours so slides are already decoded when they enter
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
    if (e.touches.length !== 1 || zoomed || settle) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    axisLock.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1 || zoomed || settle) return;
    const t = e.touches[0];
    let dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    if (!axisLock.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axisLock.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axisLock.current === 'x') {
      // Rubber-band at the ends
      if ((dx < 0 && !hasNext) || (dx > 0 && !hasPrev)) dx = dx / 3;
      setDragX(dx);
      setDragY(0);
    } else if (axisLock.current === 'y' && dy > 0) {
      setDragY(dy);
      setDragX(0);
    }
  };

  const onTouchEnd = () => {
    const started = touchStart.current !== null;
    touchStart.current = null;
    const moved = axisLock.current !== null;

    // Tap handling (no movement): double-tap zoom, single-tap chrome toggle
    if (started && !moved && !settle) {
      const now = Date.now();
      if (!isVideo && now - lastTap.current < 300) {
        setZoomed((z) => !z);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current !== 0 && Date.now() - lastTap.current >= 280) {
          setChromeVisible((v) => !v);
          lastTap.current = 0;
        }
      }, 300);
      return;
    }

    if (settle) return;
    if (dragY > DISMISS_THRESHOLD) {
      onClose();
      return;
    }
    if (dragX < -SWIPE_THRESHOLD && hasNext) setSettle('next');
    else if (dragX > SWIPE_THRESHOLD && hasPrev) setSettle('prev');
    else if (dragX !== 0 || dragY !== 0) setSettle('cancel');
  };

  // Drive the settle animation imperatively: setting `transition` and `transform`
  // in the same style recalc makes browsers snap without animating (and without
  // firing transitionend), so we force a reflow between the two writes and use a
  // timer instead of transitionend.
  useLayoutEffect(() => {
    if (!settle) return;
    const el = trackRef.current;
    if (!el) return;
    const targetPct = settle === 'next' ? -66.666 : settle === 'prev' ? 0 : -33.333;
    el.style.transition = 'none';
    void el.offsetHeight; // flush current (dragged) transform
    el.style.transition = 'transform 0.28s cubic-bezier(0.25, 0.8, 0.4, 1)';
    el.style.transform = `translate(${targetPct}%, 0px) scale(1)`;

    const timer = setTimeout(() => {
      const s = settleRef.current;
      if (s === 'next' && onNext) onNext();
      else if (s === 'prev' && onPrev) onPrev();
      else {
        setSettle(null);
        setDragX(0);
        setDragY(0);
      }
      // 'next'/'prev' reset happens in the asset?.id effect
    }, 300);
    return () => clearTimeout(timer);
  }, [settle, onNext, onPrev]);

  const dismissProgress = Math.min(1, dragY / 300);

  const slides: (Asset | null)[] = [prevAsset ?? null, asset, nextAsset ?? null];

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
          className={`absolute sm:relative top-0 inset-x-0 z-10 flex items-center justify-between p-3 sm:p-0 sm:mb-3 text-paper transition-opacity duration-200 bg-gradient-to-b from-black/70 to-transparent sm:bg-none ${
            chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="numeral truncate text-ash">{asset.filename}</span>
            {asset.album && (
              <span className="mono hidden sm:inline text-dim">{asset.album.title}</span>
            )}
            <span className="numeral hidden text-dim sm:inline">
              {formatBytes(asset.fileSizeBytes)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <FavoriteButton assetId={asset.id} />
            <a
              href={asset.downloadUrl}
              download
              className="rounded-full bg-white/10 p-2 text-paper transition-colors hover:bg-white/20"
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-5 w-5" strokeWidth={1.7} />
            </a>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
              title="Close"
            >
              <X className="h-5 w-5 text-paper" strokeWidth={1.7} />
            </button>
          </div>
        </div>

        {/* Sliding track: [prev | current | next] */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div
            ref={trackRef}
            className="absolute inset-y-0 left-0 flex h-full"
            style={{
              width: '300%',
              transform: `translate(calc(-33.333% + ${dragX}px), ${dragY}px) scale(${1 - dismissProgress * 0.12})`,
              transition: 'none',
            }}
          >
            {slides.map((slide, i) => (
              <div key={slide ? slide.id : `empty-${i}`} className="h-full flex items-center justify-center" style={{ width: '33.3333%' }}>
                {!slide ? null : slide.id === asset.id && isVideo ? (
                  <video
                    src={slide.previewUrl}
                    controls
                    autoPlay
                    preload="metadata"
                    className="max-w-full max-h-full sm:rounded-lg"
                  />
                ) : (
                  <img
                    src={slide.type === 'VIDEO' ? slide.thumbnailUrl : slide.previewUrl}
                    alt={slide.filename}
                    draggable={false}
                    className="max-w-full max-h-full object-contain sm:rounded-lg select-none"
                    style={
                      slide.id === asset.id
                        ? {
                            transform: zoomed ? 'scale(2.2)' : undefined,
                            transition: 'transform 0.25s ease',
                            cursor: zoomed ? 'zoom-out' : 'zoom-in',
                          }
                        : undefined
                    }
                    onDoubleClick={() => slide.id === asset.id && setZoomed((z) => !z)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Prev/Next arrows — desktop */}
          {hasPrev && onPrev && (
            <button
              onClick={() => animateTo('prev')}
              className={`hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-paper transition-all ${
                chromeVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNext && onNext && (
            <button
              onClick={() => animateTo('next')}
              className={`hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-paper transition-all ${
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
