/**
 * Stable, short identity for one version of today's plan.
 *
 * The note cache is keyed by this value, so it must change whenever the plan's
 * remaining work or the day's completed work changes. It is not a security
 * hash; an FNV-1a 32-bit digest is enough to key a one-user browser cache.
 */

export function hashFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export type FingerprintFacts = {
  day: string;
  minutes: number;
  tone: string;
  state: string;
  practicedToday: boolean;
  items: Array<{ kind: string; slug: string; difficulty: string; minutes: number }>;
  reviewsTarget: number;
  reviewsDone: number;
  newTarget: number;
  newDone: number;
};

export function coachPlanFingerprint(facts: FingerprintFacts): string {
  return hashFingerprint(
    JSON.stringify([
      1,
      facts.day,
      facts.minutes,
      facts.tone,
      facts.state,
      facts.practicedToday,
      facts.items.map(
        (item) =>
          `${item.kind}:${item.slug}:${item.difficulty}:${item.minutes}`,
      ),
      facts.reviewsTarget,
      facts.reviewsDone,
      facts.newTarget,
      facts.newDone,
    ]),
  );
}
