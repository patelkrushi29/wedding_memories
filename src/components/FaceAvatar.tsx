import { cn } from '@/lib/utils';

interface Props {
  url: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
}

/** A round face crop. Falls back to a quiet disc if the crop is missing. */
export function FaceAvatar({ url, size = 72, ring = false, className }: Props) {
  return (
    <span
      className={cn('block shrink-0 overflow-hidden rounded-full bg-plate-2', ring && 'ring-2 ring-accent ring-offset-2 ring-offset-ink', className)}
      style={{ width: size, height: size }}
    >
      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </span>
  );
}
