'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleSaved, useIsSaved } from '@/lib/savedStore';
import { SaveToDeviceButton } from './SaveToDeviceButton';
import { AddToPostButton } from './AddToPostButton';
import type { Asset } from '@/types/asset';

export interface ReelItem extends Asset {
  /** Big line on the slide, e.g. the function name. */
  title?: string;
  /** Small line under it, e.g. "Friday · 7:36 pm". */
  sub?: string;
}

interface Props {
  slides: ReelItem[];
  startIndex?: number;
  /** Label in the header, e.g. "The weekend" or "Sangeet". */
  label: string;
  onClose: () => void;
  /** Shown after the last slide. */
  endCard?: { title: string; body?: string; href: string; cta: string };
  /** Seconds per slide. */
  seconds?: number;
}

const DISMISS_PX = 110;

/**
 * Full-screen highlights, story-style. Photos are shown whole (contain) over a
 * blurred fill of themselves — a story crop would cut heads off group shots.
 */
export function StoryReel({ slides, startIndex = 0, label, onClose, endCard, seconds = 5 }: Props) {
  const total = slides.length + (endCard ? 1 : 0);
  const [index, setIndex] = useState(Math.min(startIndex, total - 1));
  const [progress, setProgress] = useState(0); // 0..1 within the current slide
  const [held, setHeld] = useState(false);
  const [dragY, setDragY] = useState(0);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const progressRef = useRef(0);

  const onEnd = index >= slides.length;
  const slide = onEnd ? null : slides[index];
  const saved = useIsSaved(slide?.id ?? '');

  const go = useCallback(
    (delta: number) => {
      progressRef.current = 0;
      setProgress(0);
      setIndex((i) => {
        const next = i + delta;
        if (next >= total) {
          onClose();
          return i;
        }
        return Math.max(0, next);
      });
    },
    [total, onClose]
  );

  // Timer: requestAnimationFrame so pausing (hold, hidden tab) is exact.
  useEffect(() => {
    if (onEnd) return;
    const tick = (now: number) => {
      if (last.current !== null && !held && document.visibilityState === 'visible') {
        const p = progressRef.current + (now - last.current) / (seconds * 1000);
        if (p >= 1) {
          go(1);
        } else {
          progressRef.current = p;
          setProgress(p);
        }
      }
      last.current = now;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = null;
    };
  }, [index, held, onEnd, seconds, go]);

  // Preload the next two so a slide never paints from blank.
  useEffect(() => {
    slides.slice(index + 1, index + 3).forEach((s) => {
      const img = new Image();
      img.src = s.previewUrl;
    });
  }, [index, slides]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a')) return;
    touch.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setHeld(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!touch.current) return;
    const dy = e.clientY - touch.current.y;
    if (dy > 0) setDragY(dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = touch.current;
    touch.current = null;
    setHeld(false);
    if (!start) return;
    const dy = e.clientY - start.y;
    const dx = e.clientX - start.x;
    setDragY(0);
    if (dy > DISMISS_PX) return onClose();
    // A long press is a pause, not a tap.
    if (Date.now() - start.t > 350 || Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      if (dx < -50) go(1);
      else if (dx > 50) go(-1);
      return;
    }
    go(e.clientX < window.innerWidth * 0.33 ? -1 : 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] touch-none select-none bg-pitch text-paper"
      style={{ transform: dragY ? `translateY(${dragY}px) scale(${1 - dragY / 2000})` : undefined, borderRadius: dragY ? 24 : 0, transition: dragY ? 'none' : 'transform .25s ease' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        touch.current = null;
        setHeld(false);
        setDragY(0);
      }}
      role="dialog"
      aria-label={`${label} highlights`}
    >
      {slide && (
        <>
          {slide.blurDataUrl && (
            <img src={slide.blurDataUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
          )}
          <img
            key={slide.id}
            src={slide.previewUrl}
            alt={slide.title ?? ''}
            draggable={false}
            className="rise absolute inset-0 h-full w-full object-contain"
          />
          <div className="scrim-t" />
          <div className="scrim-b" style={{ height: '48%' }} />
        </>
      )}

      {/* Progress */}
      <div className="absolute inset-x-3 flex gap-[3px]" style={{ top: 'calc(10px + env(safe-area-inset-top))' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-paper"
              style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute inset-x-0 flex items-center gap-3 pl-4 pr-1" style={{ top: 'calc(22px + env(safe-area-inset-top))' }}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{label}</div>
          {slide && <div className="truncate text-[12px] text-paper/75">{index + 1} of {slides.length}</div>}
        </div>
        <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center">
          <X className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>

      {slide ? (
        <div className="absolute inset-x-0 bottom-0 px-4" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
          {(slide.title || slide.sub) && (
            <div key={`t-${slide.id}`} className="rise mb-4 px-1">
              {slide.title && <div className="display text-[34px]">{slide.title}</div>}
              {slide.sub && <div className="mt-1.5 text-[14px] text-paper/80">{slide.sub}</div>}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => toggleSaved(slide.id)}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved' : 'Keep'}
              className={cn('btn w-[52px] px-0', saved ? 'bg-accent-deep text-accent border border-accent' : 'btn-ghost')}
            >
              <Heart className="h-[20px] w-[20px]" fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
            </button>
            <AddToPostButton assetId={slide.id} compact />
            <SaveToDeviceButton asset={slide} className="flex-1" />
          </div>
        </div>
      ) : (
        endCard && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="display text-[38px]">{endCard.title}</div>
            {endCard.body && <p className="max-w-[300px] text-[15px] text-ash">{endCard.body}</p>}
            <Link href={endCard.href} className="btn btn-accent mt-4" onClick={onClose}>
              {endCard.cta}
            </Link>
            <button onClick={() => go(-slides.length)} className="mt-1 h-11 px-4 text-[14px] font-medium text-ash">
              Watch again
            </button>
          </div>
        )
      )}
    </div>
  );
}
