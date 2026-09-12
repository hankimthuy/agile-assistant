// Performance Import (Pillar 5, spec.md Epic 6): turns a pasted/uploaded
// work-item export — CSV, TSV (e.g. cells copy-pasted straight out of
// Excel), or JSON — into the normalized ImportedWorkItem[] shape the
// templates in lib/performance-metrics.ts compute from. This is
// deliberately tool-agnostic: it doesn't matter whether the export came
// from Azure Boards, Jira, Trello, or a hand-built spreadsheet — any
// export with recognizable columns works, and the app never calls out to
// any of those tools' APIs; it only parses text the user already
// exported themselves.
//
// Deliberately more lenient than lib/data/jira.ts's fixture validator:
// that file validates a controlled fixture and should fail loudly on any
// gap; this parses free-form user-pasted data, so most gaps become a
// warning (and a safe default) rather than a hard failure — only truly
// unusable input throws ValidationError.

import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from './errors';
import type { ImportedWorkItem, PerformanceImportResult, TicketStatus, TicketType } from '../types';

const SAMPLE_CSV_PATH = path.join(process.cwd(), 'data', 'performance-import-sample.csv');

// Backs the "Load sample data" button on the Performance Import page —
// lets the feature be demoed with zero setup, same spirit as the Jira/
// Confluence/ops-inbox sample fixtures the rest of the app already ships
// with.
export async function loadSampleImportCsv(): Promise<string> {
  return fs.readFile(SAMPLE_CSV_PATH, 'utf-8');
}

export type ImportFormat = 'json' | 'csv';

// --- CSV / TSV parsing ------------------------------------------------

// Small dependency-free RFC4180-ish parser: handles quoted fields
// containing the delimiter, embedded newlines, and escaped ("") quotes.
// The repo has no spreadsheet-parsing library dependency today (matches
// its "no new dependency for the POC" ethos, same as lib/data/jira.ts
// hand-rolling its own JSON validation instead of pulling in a schema
// library). Delimiter is auto-detected per §"delimiter detection" below,
// since pasting cells straight out of Excel produces tab-separated text,
// not comma-separated.
function parseDelimited(raw: string, delimiter: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (inQuotes) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === '\r') {
      // swallow — \r\n and bare \r line endings both end on the \n check,
      // or are handled by the trailing bare-\r case below
      if (raw[i + 1] !== '\n') pushRow();
    } else if (char === '\n') {
      pushRow();
    } else {
      field += char;
    }
  }
  // final field/row, if the input didn't end with a newline
  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  if (nonEmptyRows.length === 0) {
    throw new ValidationError('The pasted data has no rows.');
  }

  const headers = nonEmptyRows[0].map((h) => h.trim());
  if (headers.length === 0 || headers.every((h) => h === '')) {
    throw new ValidationError('The pasted data has no header row.');
  }

  return nonEmptyRows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').trim();
    });
    return record;
  });
}

// Delimiter detection: count tabs vs. commas on the header line only
// (quoted fields containing the "wrong" character elsewhere shouldn't
// sway the decision). Copy-pasting a range of cells out of Excel/Google
// Sheets produces tab-separated text with no header decoration at all,
// which is the most common real-world path to "any Excel file with the
// right columns" — so tab wins whenever it's present at all on that line.
export function parseCsv(raw: string): Record<string, string>[] {
  const firstLine = raw.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  return parseDelimited(raw, delimiter);
}

// --- Field lookup (tolerates column names from several tools/export
// styles at once — e.g. Azure's "Story Points" / "Assigned To", Jira's
// "Story point estimate" / "Assignee", or a plain spreadsheet's "Points"
// / "Owner" — plus Azure's own JSON field-reference names such as
// "Microsoft.VSTS.Scheduling.StoryPoints") ----------------------------

type Row = Record<string, unknown>;

function getField(row: Row, aliases: string[]): string | undefined {
  const fields = (row.fields && typeof row.fields === 'object' ? (row.fields as Row) : undefined) ?? row;
  const lowerMap = new Map<string, unknown>();
  for (const key of Object.keys(fields)) lowerMap.set(key.toLowerCase(), fields[key]);

  for (const alias of aliases) {
    const value = lowerMap.get(alias.toLowerCase());
    if (value !== undefined && value !== null && value !== '') {
      return typeof value === 'string' ? value : String(value);
    }
  }
  return undefined;
}

const ALIASES = {
  id: ['id', 'key', 'work item id', 'issue key', 'ticket', 'system.id'],
  title: ['title', 'summary', 'name', 'system.title'],
  workItemType: ['work item type', 'workitemtype', 'issue type', 'type', 'system.workitemtype'],
  state: ['state', 'status', 'system.state'],
  storyPoints: [
    'story points',
    'storypoints',
    'story point estimate',
    'points',
    'estimate',
    'effort',
    'microsoft.vsts.scheduling.storypoints',
    'microsoft.vsts.scheduling.effort',
  ],
  assignedTo: ['assigned to', 'assignedto', 'assignee', 'owner', 'system.assignedto'],
  iterationPath: ['iteration path', 'iterationpath', 'sprint', 'iteration', 'system.iterationpath'],
  severity: ['severity', 'priority', 'bug severity', 'microsoft.vsts.common.severity'],
  createdDate: ['created date', 'createddate', 'created', 'system.createddate'],
  changedDate: ['changed date', 'changeddate', 'updated', 'last updated', 'system.changeddate'],
  closedDate: ['closed date', 'closeddate', 'resolved', 'resolution date', 'microsoft.vsts.common.closeddate'],
};

function normalizeWorkItemType(raw: string | undefined, warnings: string[], id: string): TicketType | 'other' {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('bug')) return 'bug';
  if (value.includes('story') || value.includes('backlog item') || value.includes('feature')) return 'story';
  if (value.includes('task')) return 'task';
  warnings.push(`Work item ${id}: unrecognized work item type "${raw ?? '(none)'}" — counted as "other".`);
  return 'other';
}

function normalizeState(raw: string | undefined, warnings: string[], id: string): TicketStatus | 'other' {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('closed') || value.includes('done') || value.includes('resolved')) return 'done';
  if (value.includes('active') || value.includes('in progress') || value.includes('committed')) return 'in_progress';
  if (value.includes('new') || value.includes('to do') || value.includes('proposed') || value.includes('approved'))
    return 'to_do';
  warnings.push(`Work item ${id}: unrecognized state "${raw ?? '(none)'}" — counted as "other".`);
  return 'other';
}

function normalizeDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Exports vary widely here — "9/9/2026 3:00:00 PM", ISO, or whatever
  // Excel serializes a date cell as when pasted as text — just take the
  // date portion for the day-granularity math this feature needs.
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

export function normalizeImportRows(rows: Row[], warnings: string[]): ImportedWorkItem[] {
  let missingStoryPoints = 0;

  const items = rows.map((row, index): ImportedWorkItem | null => {
    const id = getField(row, ALIASES.id) ?? `row-${index + 1}`;
    const title = getField(row, ALIASES.title);
    if (!title) {
      warnings.push(`Row ${index + 1} has no Title/Summary column — skipped.`);
      return null;
    }

    const rawWorkItemType = getField(row, ALIASES.workItemType) ?? '';
    const rawState = getField(row, ALIASES.state) ?? '';
    const storyPointsRaw = getField(row, ALIASES.storyPoints);
    let storyPoints = Number(storyPointsRaw);
    if (storyPointsRaw === undefined || Number.isNaN(storyPoints)) {
      storyPoints = 0;
      missingStoryPoints++;
    }

    return {
      id,
      title,
      workItemType: normalizeWorkItemType(rawWorkItemType, warnings, id),
      rawWorkItemType: rawWorkItemType || '(unspecified)',
      state: normalizeState(rawState, warnings, id),
      rawState: rawState || '(unspecified)',
      storyPoints,
      assignedTo: getField(row, ALIASES.assignedTo) ?? 'Unassigned',
      iterationPath: getField(row, ALIASES.iterationPath) ?? '',
      severity: getField(row, ALIASES.severity),
      createdDate: normalizeDate(getField(row, ALIASES.createdDate)),
      changedDate: normalizeDate(getField(row, ALIASES.changedDate)),
      closedDate: normalizeDate(getField(row, ALIASES.closedDate)),
    };
  });

  if (missingStoryPoints > 0) {
    warnings.push(`${missingStoryPoints} item(s) had no recognizable Story Points/Estimate column — defaulted to 0.`);
  }

  return items.filter((item): item is ImportedWorkItem => item !== null);
}

function deriveSprintLabel(items: ImportedWorkItem[], warnings: string[]): string {
  const paths = items.map((i) => i.iterationPath).filter((p) => p !== '');
  if (paths.length === 0) return 'Imported sprint';

  const counts = new Map<string, number>();
  for (const p of paths) counts.set(p, (counts.get(p) ?? 0) + 1);
  const distinct = [...counts.keys()];

  if (distinct.length === 1) return distinct[0];

  warnings.push(
    `This export spans ${distinct.length} sprints/iterations (${distinct.join(', ')}) — metrics below are computed across all of them combined.`
  );
  return `Mixed sprints (${distinct.length})`;
}

export function parsePerformanceImport(input: { format: ImportFormat; raw: string }): PerformanceImportResult {
  const raw = input.raw.trim();
  if (!raw) {
    throw new ValidationError('Paste or upload a sprint export first.');
  }

  const warnings: string[] = [];
  let rows: Row[];

  if (input.format === 'csv') {
    rows = parseCsv(raw);
  } else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ValidationError('The pasted JSON is not valid.');
    }
    if (Array.isArray(parsed)) {
      rows = parsed as Row[];
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Row;
      const candidate = (obj.workItems ?? obj.items ?? obj.value) as unknown;
      if (Array.isArray(candidate)) {
        rows = candidate as Row[];
      } else {
        throw new ValidationError(
          'The pasted JSON must be an array of work items, or an object with a "workItems"/"items"/"value" array.'
        );
      }
    } else {
      throw new ValidationError('The pasted JSON must be an array of work items.');
    }
  }

  if (rows.length === 0) {
    throw new ValidationError('The export has no work items.');
  }

  const workItems = normalizeImportRows(rows, warnings);
  if (workItems.length === 0) {
    throw new ValidationError('No row had a recognizable Title/Summary column — check the export and try again.');
  }

  const sprintLabel = deriveSprintLabel(workItems, warnings);
  return { sprintLabel, workItems, warnings };
}
