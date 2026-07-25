import Link from 'next/link';
import type { FunctionSummary } from '@/lib/tags/queries';

interface Props {
  fn: FunctionSummary;
  /** Full-width, larger type — earned by photo count within its day. */
  featured?: boolean;
  /** Photos containing the claimed person, once faces exist. */
  ofYouCount?: number;
}

function timeSpan(startAt: string | null, endAt: string | null): string | null {
  if (!startAt) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const start = fmt(startAt);
  if (!endAt) return start;
  const end = fmt(endAt);
  return start === end ? start : `${start}–${end}`;
}

export function FunctionCard({ fn, featured = false, ofYouCount }: Props) {
  const span = timeSpan(fn.startAt, fn.endAt);
  const meta = [span, fn.assetCount.toLocaleString()].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/functions/${fn.slug}`}
      className="group relative block overflow-hidden rounded-card bg-plate"
      style={
        fn.coverBlurDataUrl
          ? { backgroundImage: `url(${fn.coverBlurDataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      <div className={`grain relative ${featured ? 'h-[168px] sm:h-[240px]' : 'h-[126px] sm:h-[170px]'}`}>
        {fn.coverThumbnailUrl && (
          <img
            src={fn.coverThumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        )}
      </div>
      <div className="scrim-b" />

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <h3 className={`display ${featured ? 'text-[21px] sm:text-[26px]' : 'text-[17px] sm:text-[19px]'}`}>
          {fn.name}
        </h3>
        {meta && <div className="numeral mt-1 text-ash">{meta}</div>}
      </div>

      {ofYouCount ? (
        <div className="mono mono-on absolute right-3 top-3">{ofYouCount} of you</div>
      ) : null}
    </Link>
  );
}
