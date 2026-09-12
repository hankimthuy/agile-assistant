import { daysSince } from './config';
import type { DocLinksResult, ProcessHealthViolation, SprintData } from './types';

// FR-7: three fixed rules, no ML needed.
export function computeProcessHealth(
  data: SprintData,
  docLinks: DocLinksResult,
  staleDays: number
): ProcessHealthViolation[] {
  const missingDocSet = new Set(docLinks.missingDocTicketIds);
  const violations: ProcessHealthViolation[] = [];

  for (const ticket of data.tickets) {
    if (!ticket.acceptanceCriteria) {
      violations.push({
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        type: 'missing_acceptance_criteria',
        severity: 'high',
        detail: 'No acceptance criteria is recorded on this ticket.',
      });
    }

    if (missingDocSet.has(ticket.id)) {
      violations.push({
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        type: 'missing_documentation',
        severity: 'medium',
        detail: 'No Confluence page matches this ticket by label or title.',
      });
    }

    const age = daysSince(ticket.lastUpdated);
    if (age > staleDays) {
      violations.push({
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        type: 'stale',
        severity: 'low',
        detail: `Not updated in ${age} days (threshold: ${staleDays}).`,
      });
    }
  }

  return violations;
}

const SEVERITY_RANK: Record<ProcessHealthViolation['severity'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function sortBySeverity(violations: ProcessHealthViolation[]): ProcessHealthViolation[] {
  return [...violations].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}
