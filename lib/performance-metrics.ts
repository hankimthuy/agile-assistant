// The 3 fixed report templates for Performance Import (spec.md Epic 6):
// Velocity & Completion, Quality & Bug Health, Workload & Aging. Pure
// functions, no I/O — same shape as lib/metrics.ts and (for the
// stale-item rule) lib/process-health.ts, which this deliberately mirrors
// rather than duplicating logic for. Source-agnostic: these operate on
// the normalized ImportedWorkItem shape regardless of which tool the
// export came from.

import { daysSince } from './config';
import type {
  ImportedWorkItem,
  PerformanceImportReport,
  PerformanceImportResult,
  QualityReport,
  TicketType,
  VelocityReport,
  WorkloadReport,
} from './types';

const WORK_ITEM_TYPES: (TicketType | 'other')[] = ['story', 'task', 'bug', 'other'];

export function computeVelocityReport(items: ImportedWorkItem[]): VelocityReport {
  const doneItems = items.filter((i) => i.state === 'done');
  const velocity = doneItems.reduce((sum, i) => sum + i.storyPoints, 0);
  const completionRate = items.length === 0 ? 0 : doneItems.length / items.length;

  const byType = Object.fromEntries(
    WORK_ITEM_TYPES.map((type) => {
      const ofType = items.filter((i) => i.workItemType === type);
      return [type, { total: ofType.length, done: ofType.filter((i) => i.state === 'done').length }];
    })
  ) as VelocityReport['byType'];

  const pct = Math.round(completionRate * 100);
  const headline = `${velocity} point${velocity === 1 ? '' : 's'} done across ${doneItems.length}/${items.length} item${
    items.length === 1 ? '' : 's'
  } (${pct}% complete).`;

  return { totalItems: items.length, doneItems: doneItems.length, completionRate, velocity, byType, headline };
}

export function computeQualityReport(items: ImportedWorkItem[]): QualityReport {
  const bugs = items.filter((i) => i.workItemType === 'bug');
  const openBugs = bugs.filter((i) => i.state !== 'done').length;
  const closedBugs = bugs.filter((i) => i.state === 'done').length;
  const bugRatio = items.length === 0 ? 0 : bugs.length / items.length;

  const severityCounts = new Map<string, number>();
  for (const bug of bugs) {
    if (!bug.severity) continue;
    severityCounts.set(bug.severity, (severityCounts.get(bug.severity) ?? 0) + 1);
  }
  const bySeverity = [...severityCounts.entries()]
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => b.count - a.count);

  const headline =
    bugs.length === 0
      ? 'No bugs in this export.'
      : `${bugs.length} bug${bugs.length === 1 ? '' : 's'} total — ${openBugs} open, ${closedBugs} closed.`;

  return { totalBugs: bugs.length, openBugs, closedBugs, bugRatio, hasSeverityData: bySeverity.length > 0, bySeverity, headline };
}

export function computeWorkloadReport(items: ImportedWorkItem[], staleDays: number): WorkloadReport {
  const byAssigneeMap = new Map<string, { total: number; done: number }>();
  for (const item of items) {
    const entry = byAssigneeMap.get(item.assignedTo) ?? { total: 0, done: 0 };
    entry.total++;
    if (item.state === 'done') entry.done++;
    byAssigneeMap.set(item.assignedTo, entry);
  }
  const byAssignee = [...byAssigneeMap.entries()]
    .map(([assignee, counts]) => ({ assignee, ...counts }))
    .sort((a, b) => b.total - a.total);

  // Mirrors lib/process-health.ts's stale rule: not updated in > N days.
  // Only items with a usable date can be judged — undated rows are
  // skipped (already reflected as a warning by lib/data/performance-import.ts
  // when the whole export lacks a date column).
  const staleItems = items
    .filter((i) => !!(i.changedDate ?? i.createdDate) && i.state !== 'done')
    .map((i) => ({ id: i.id, title: i.title, daysSinceUpdate: daysSince((i.changedDate ?? i.createdDate)!) }))
    .filter((i) => i.daysSinceUpdate > staleDays)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

  const headline =
    staleItems.length === 0
      ? `No open items are stale (threshold: ${staleDays} days).`
      : `${staleItems.length} open item${staleItems.length === 1 ? '' : 's'} not updated in over ${staleDays} days.`;

  return { byAssignee, staleDays, staleItems, headline };
}

export function computePerformanceImportReport(
  data: PerformanceImportResult,
  staleDays: number
): PerformanceImportReport {
  return {
    sprintLabel: data.sprintLabel,
    velocity: computeVelocityReport(data.workItems),
    quality: computeQualityReport(data.workItems),
    workload: computeWorkloadReport(data.workItems, staleDays),
    warnings: data.warnings,
  };
}
