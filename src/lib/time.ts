/**
 * Display helpers for capture times.
 *
 * EXIF times are the camera's wall clock with no zone, and the sync stores them
 * as if they were UTC. Formatting in UTC therefore shows the time the camera
 * showed — and gives the same answer on the server and in every browser, so
 * there is no hydration mismatch.
 */
const ZONE = 'UTC';

/** "7:36 pm" */
export function weekdayTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: ZONE })
    .toLowerCase();
}

/** "morning" / "afternoon" / "evening" / "night", from a start time. */
export function dayPart(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const h = new Date(iso).getUTCHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}
