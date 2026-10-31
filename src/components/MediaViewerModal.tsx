'use client';

import { useEffect, useLayoutEffect, useCallback, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FavoriteButton } from './FavoriteButton';
import { SaveToDeviceButton } from './SaveToDeviceButton';
import { AddToPostButton } from './AddToPostButton';
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
const ZOOM = 2.4;

function takenLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  // Other takes of the same moment, when this photo leads a folded burst.
  const [takes, setTakes] = useState<Asset[]>([]);
  const [takeId, setTakeId] = useState<string | null>(null);
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const axisLock = useRef<'x' | 'y' | null>(null);
  const settleRef = useRef<Settle>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    settleRef.current = settle;
  }, [settle]);

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

  // New photo arrived: recenter the track instantly (no transition). This has to
  // run before paint alongside the imperative transform reset below, which is why
  // it is a layout effect rather than state derived during render.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setSettle(null);
    setDragX(0);
    setDragY(0);
    setZoomed(false);
    setPan({ x: 0, y: 0 });
    setTakeId(null);
    setTakes([]);
    axisLock.current = null;
    const el = trackRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = 'translate(-33.333%, 0px) scale(1)';
    }
  }, [asset?.id]);

  const burstSlug = asset?.burst?.slug;
  useEffect(() => {
    if (!burstSlug) return;
    let live = true;
    fetch(`/api/assets?burst=${encodeURIComponent(burstSlug)}&sort=oldest&limit=20`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => live && data && setTakes(data.items))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [burstSlug]);

  // Preload neighbours so slides are already decoded when they enter
  useEffect(() => {
    [prevAsset, nextAsset].forEach((a) => {
      if (a && a.type === 'PHOTO') {
        const img = new Image();
        img.src = a.previewUrl;
      }
    });
  }, [prevAsset, nextAsset]);

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

  if (!asset) return null;

  const shown = (takeId && takes.find((t) => t.id === takeId)) || asset;
  const isVideo = asset.type === 'VIDEO';
  const toggleZoom = () => {
    setZoomed((z) => !z);
    setPan({ x: 0, y: 0 });
  };
  const taken = takenLabel(shown.takenAt);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomed) {
      const t = e.touches[0];
      panStart.current = { x: t.clientX, y: t.clientY, px: pan.x, py: pan.y };
      setPanning(true);
      touchStart.current = { x: t.clientX, y: t.clientY };
      axisLock.current = null;
      return;
    }
    if (e.touches.length !== 1 || settle) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    axisLock.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (zoomed && panStart.current && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - panStart.current.x;
      const dy = t.clientY - panStart.current.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) axisLock.current = 'x';
      // Pan in image space; the image is scaled, so divide to keep it under the finger.
      setPan({ x: panStart.current.px + dx / ZOOM, y: panStart.current.py + dy / ZOOM });
      return;
    }
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
    panStart.current = null;
    setPanning(false);
    const moved = axisLock.current !== null;

    // Tap handling (no movement): double-tap zoom, single-tap chrome toggle
    if (started && !moved && !settle) {
      const now = Date.now();
      if (!isVideo && now - lastTap.current < 300) {
        toggleZoom();
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

    if (settle || zoomed) return;
    if (dragY > DISMISS_THRESHOLD) {
      onClose();
      return;
    }
    if (dragX < -SWIPE_THRESHOLD && hasNext) setSettle('next');
    else if (dragX > SWIPE_THRESHOLD && hasPrev) setSettle('prev');
    else if (dragX !== 0 || dragY !== 0) setSettle('cancel');
  };

  const dismissProgress = Math.min(1, dragY / 300);

  const slides: (Asset | null)[] = [prevAsset ?? null, shown, nextAsset ?? null];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: `rgba(0,0,0,${1 - dismissProgress * 0.5})` }}
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
          className={cn(
            'absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2 pb-6 text-paper transition-opacity duration-200 sm:px-0',
            chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
        >
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full">
            <ChevronDown className="h-7 w-7" strokeWidth={2} />
          </button>
          {/* A filename like IMG_4031.JPG is noise to a guest; when it was taken isn't. */}
          <span className="meta truncate text-paper/85">{taken}</span>
          <FavoriteButton assetId={shown.id} className="h-11 w-11 bg-transparent p-0 flex items-center justify-center" />
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
                {!slide ? null : i === 1 && isVideo ? (
                  <video
                    src={slide.previewUrl}
                    controls
                    autoPlay
                    preload="metadata"
                    className="max-w-full max-h-full sm:rounded-lg"
                  />
                ) : (
                  <img
                    src={
                      slide.type === 'VIDEO'
                        ? slide.thumbnailUrl
                        : i === 1 && zoomed && slide.fullUrl
                          ? slide.fullUrl
                          : slide.previewUrl
                    }
                    alt={slide.filename}
                    draggable={false}
                    className="max-w-full max-h-full object-contain sm:rounded-lg select-none"
                    style={
                      i === 1
                        ? {
                            transform: zoomed
                              ? `scale(${ZOOM}) translate(${pan.x}px, ${pan.y}px)`
                              : undefined,
                            transition: panning ? 'none' : 'transform 0.25s ease',
                            cursor: zoomed ? 'zoom-out' : 'zoom-in',
                          }
                        : undefined
                    }
                    onDoubleClick={() => i === 1 && toggleZoom()}
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

        {/* Actions */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-12 transition-opacity duration-200 sm:px-0',
            chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {takes.length > 1 && (
            <div className="mb-3">
              <div className="mb-2 text-[13px] text-paper/80">
                {takes.length} takes of this moment · {takeId && takeId !== asset.id ? 'your pick' : 'sharpest shown'}
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {takes.map((t) => {
                  const on = t.id === shown.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTakeId(t.id)}
                      aria-pressed={on}
                      aria-label={on ? 'Showing this take' : 'Show this take'}
                      className={cn('h-14 w-14 shrink-0 overflow-hidden rounded-[10px]', on ? 'ring-2 ring-accent ring-offset-2 ring-offset-black' : 'opacity-60')}
                    >
                      <img src={t.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-2.5">
            <AddToPostButton assetId={shown.id} className="flex-1" />
            <SaveToDeviceButton asset={shown} className="flex-[1.35]" />
          </div>
        </div>
      </div>
    </div>
  );
}
