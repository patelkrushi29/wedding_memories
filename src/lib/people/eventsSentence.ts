/** Browser-safe people types and copy helpers (no database imports). */
import type { PersonCluster } from './tiers';

export interface PersonSummary extends PersonCluster {
  slug: string;
}

export interface PersonDetail extends PersonSummary {
  /** Events this person appears in, in order, with how many photos of them each holds. */
  functions: { slug: string; name: string; count: number }[];
}

/** ["Sangeet", "Ceremony"] → "the Sangeet and the Ceremony". */
export function eventsSentence(names: string[]): string {
  const the = names.map((n) => `the ${n}`);
  if (the.length <= 1) return the[0] ?? '';
  return `${the.slice(0, -1).join(', ')} and ${the.at(-1)}`;
}

/** The recap line: "You came for the Sangeet and the Ceremony." */
export function recapLine(opts: { isMe: boolean; name: string | null; events: string[] }): string {
  const list = eventsSentence(opts.events);
  if (!list) return '';
  if (opts.isMe) return opts.events.length > 2 ? `You were there for all of it — ${list}.` : `You came for ${list}.`;
  if (opts.name) return `${opts.name} was at ${list}.`;
  return `Seen at ${list}.`;
}
