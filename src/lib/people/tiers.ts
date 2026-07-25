/**
 * Face-wall tiering. Pure functions so the thresholds are testable without a DB.
 * Rules come from the design notes: the gate scales with library size, and the
 * wall is tiered rather than truncated.
 */

export interface PersonCluster {
  id: string;
  /** Host-given name. Blank means unnamed — render nothing, never "Person 47". */
  name: string | null;
  photoCount: number;
  faceThumbnailUrl: string | null;
  isPinned?: boolean; // couple, host-named, or someone this visitor saved
}

export interface PersonTier {
  key: 'top' | 'mid' | 'rest';
  label: string;
  people: PersonCluster[];
  /** Collapsed tiers render behind a "Show" affordance. */
  collapsed: boolean;
}

/** A 300-photo album needs a gate of 3; a 20,000-photo wedding needs 25. */
export function faceThreshold(totalPhotos: number): number {
  return Math.min(25, Math.max(3, Math.round(totalPhotos / 400)));
}

/**
 * Split clusters into tiers. Pinned people are hoisted into the top tier
 * regardless of count, and the mid tier collapses once the wall gets long.
 */
export function tierPeople(people: PersonCluster[], totalPhotos: number): PersonTier[] {
  const threshold = faceThreshold(totalPhotos);
  const sorted = [...people].sort((a, b) => {
    if (Boolean(b.isPinned) !== Boolean(a.isPinned)) return a.isPinned ? -1 : 1;
    return b.photoCount - a.photoCount;
  });

  // Tier boundaries scale with the gate: 5× the gate is "a lot of photos"
  const topFloor = Math.max(threshold * 5, 20);

  const top = sorted.filter((p) => p.isPinned || p.photoCount >= topFloor);
  const mid = sorted.filter((p) => !top.includes(p) && p.photoCount >= threshold);
  const rest = sorted.filter((p) => !top.includes(p) && !mid.includes(p));

  const tiers: PersonTier[] = [];
  if (top.length) {
    tiers.push({
      key: 'top',
      label: `In ${topFloor}+ photos`,
      people: top,
      collapsed: false,
    });
  }
  if (mid.length) {
    tiers.push({
      key: 'mid',
      label: `In ${threshold}–${topFloor - 1} photos`,
      people: mid,
      // Keep the scroll short on big walls
      collapsed: sorted.length >= 80,
    });
  }
  if (rest.length) {
    tiers.push({
      key: 'rest',
      label: `Fewer than ${threshold} photos`,
      people: rest,
      collapsed: true, // mostly one-off faces in crowds
    });
  }
  return tiers;
}

/** Past ~200 faces the wall stops being the fastest route; lead with the selfie. */
export function shouldLeadWithSelfie(totalPeople: number): boolean {
  return totalPeople >= 200;
}
