import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from './errors';
import type { SprintData, Ticket } from '../types';

const FIXTURE_PATH = path.join(process.cwd(), 'data', 'jira-sprint-sample.json');

const REQUIRED_TICKET_FIELDS: (keyof Ticket)[] = [
  'id',
  'title',
  'type',
  'status',
  'storyPoints',
  'assignee',
  'labels',
  'lastUpdated',
];

function validate(raw: unknown): SprintData {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('jira-sprint-sample.json must contain a JSON object');
  }
  const data = raw as Partial<SprintData>;

  if (!data.sprint || typeof data.sprint !== 'object') {
    throw new ValidationError('jira-sprint-sample.json is missing the required "sprint" field');
  }
  for (const field of ['id', 'name', 'startDate', 'endDate'] as const) {
    if (!data.sprint[field]) {
      throw new ValidationError(`Sprint is missing required field "${field}"`);
    }
  }

  if (!Array.isArray(data.tickets)) {
    throw new ValidationError('jira-sprint-sample.json is missing the required "tickets" array');
  }

  data.tickets.forEach((ticket, index) => {
    for (const field of REQUIRED_TICKET_FIELDS) {
      const value = (ticket as Partial<Ticket>)[field];
      const isMissing = value === undefined || value === null || value === '';
      if (isMissing) {
        throw new ValidationError(
          `Ticket at index ${index} (${(ticket as Partial<Ticket>).id ?? 'unknown id'}) is missing required field "${field}"`
        );
      }
    }
    // acceptanceCriteria is allowed to be an empty string — that's a Process
    // Health signal (Rule 1), not an ingestion error.
    if (typeof (ticket as Partial<Ticket>).acceptanceCriteria !== 'string') {
      throw new ValidationError(
        `Ticket ${(ticket as Partial<Ticket>).id ?? index} is missing the "acceptanceCriteria" field entirely (empty string is fine, the field itself must exist)`
      );
    }
  });

  return data as SprintData;
}

export async function loadSprintData(): Promise<SprintData> {
  const raw = await fs.readFile(FIXTURE_PATH, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('jira-sprint-sample.json is not valid JSON');
  }
  return validate(parsed);
}
