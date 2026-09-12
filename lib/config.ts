// Cross-cutting POC defaults. Both are "N days" thresholds from spec.md §5
// (Story 3.1, Story 5.4) and can be overridden per-request via query params —
// see app/api/process-health/route.ts and the Ops Hub UI.

export const DEFAULT_STALE_DAYS = 5; // Process Health rule 3
export const DEFAULT_APPROVAL_WARN_DAYS = 3; // Ops Hub pending-approval red badge

export function daysSince(dateStr: string, now: Date = new Date()): number {
  const then = new Date(`${dateStr}T00:00:00Z`);
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffMs = nowUTC - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
