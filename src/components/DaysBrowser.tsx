'use client';

import { useState } from 'react';
import { FunctionCard } from './FunctionCard';
import { cn } from '@/lib/utils';
import type { DaySummary, FunctionSummary } from '@/lib/tags/queries';

interface Props {
  days: DaySummary[];
}

/** A function earns a full-width card when it clearly dominates its day. */
function layoutRows(functions: FunctionSummary[]): FunctionSummary[][] {
  if (functions.length <= 1) return functions.map((f) => [f]);
  const min = Math.min(...functions.map((f) => f.assetCount)) || 1;

  const rows: FunctionSummary[][] = [];
  let pending: FunctionSummary | null = null;

  for (const fn of functions) {
    const dominant = fn.assetCount >= min * 2;
    if (dominant) {
      if (pending) {
        rows.push([pending]);
        pending = null;
      }
      rows.push([fn]);
    } else if (pending) {
      rows.push([pending, fn]);
      pending = null;
    } else {
      pending = fn;
    }
  }
  if (pending) rows.push([pending]);
  return rows;
}

function shortDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function DaysBrowser({ days }: Props) {
  const [selected, setSelected] = useState<string>('');
  const shown = selected ? days.filter((d) => d.slug === selected) : days;

  return (
    <>
      {days.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-5 sm:px-0 pb-5">
          <button
            onClick={() => setSelected('')}
            className={cn('chip', !selected && 'chip-on')}
          >
            All {days.length} days
          </button>
          {days.map((day) => (
            <button
              key={day.slug}
              onClick={() => setSelected(day.slug)}
              className={cn('chip', selected === day.slug && 'chip-on')}
            >
              {shortDate(day.date)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-7 px-5 sm:px-0">
        {shown.map((day) => (
          <section key={day.id}>
            <div className="mono mb-3">{day.name}</div>
            <div className="flex flex-col gap-2.5">
              {layoutRows(day.functions).map((row, i) => (
                <div key={i} className={row.length === 2 ? 'grid grid-cols-2 gap-2.5' : ''}>
                  {row.map((fn) => (
                    <FunctionCard key={fn.id} fn={fn} featured={row.length === 1} />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
