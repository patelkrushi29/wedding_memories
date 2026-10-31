'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Download, Loader2, Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prefersShareSheet, saveMedia, type SaveOutcome } from '@/lib/saveMedia';
import type { Asset } from '@/types/asset';

interface Props {
  asset: Asset;
  className?: string;
  /** accent = the screen's main action; quiet = small translucent pill over a photo. */
  variant?: 'accent' | 'quiet';
}

type State = 'idle' | 'working' | 'needs-tap' | 'done';

/**
 * Save the full-resolution original to the device. On phones it opens the share
 * sheet ("Save Image" puts it in Photos); elsewhere it downloads the file.
 */
export function SaveToDeviceButton({ asset, className, variant = 'accent' }: Props) {
  const [state, setState] = useState<State>('idle');
  const [share, setShare] = useState(false);
  const fileRef = useRef<File | undefined>(undefined);

  // Decided after mount: the server render can't know the device.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser capability once
    setShare(prefersShareSheet());
  }, []);

  // A different photo: forget the bytes and the label.
  useEffect(() => {
    fileRef.current = undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per asset
    setState('idle');
  }, [asset.id]);

  const run = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === 'working') return;
    setState('working');
    try {
      const { outcome, file } = await saveMedia(asset.downloadUrl, asset.filename, fileRef.current);
      fileRef.current = file;
      const next: Record<SaveOutcome, State> = {
        shared: 'done',
        downloaded: 'done',
        opened: 'idle',
        cancelled: 'idle',
        'needs-tap': 'needs-tap',
      };
      setState(next[outcome]);
      if (next[outcome] === 'done') setTimeout(() => setState('idle'), 2200);
    } catch {
      setState('idle');
    }
  };

  const label =
    state === 'working'
      ? 'Preparing…'
      : state === 'needs-tap'
        ? 'Tap to save'
        : state === 'done'
          ? share
            ? 'Saved'
            : 'Downloaded'
          : share
            ? 'Save to Photos'
            : 'Download';

  const Icon =
    state === 'working' ? Loader2 : state === 'done' ? Check : share ? Share : Download;

  return (
    <button
      onClick={run}
      aria-live="polite"
      className={cn(
        variant === 'accent'
          ? 'btn btn-accent'
          : 'inline-flex h-10 items-center gap-2 rounded-full bg-black/40 px-4 text-[13.5px] font-semibold text-paper backdrop-blur-md',
        state === 'needs-tap' && 'ring-2 ring-paper',
        className
      )}
    >
      <Icon className={cn('h-[18px] w-[18px]', state === 'working' && 'animate-spin')} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
