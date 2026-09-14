import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from './errors';
import type { OpsInboxData, OpsItem } from '../types';

const FIXTURE_PATH = path.join(process.cwd(), 'data', 'ops-inbox-sample.json');

const VALID_TYPES: OpsItem['type'][] = ['task', 'delegatable', 'pending_approval', 'needs_email'];

function validate(raw: unknown): OpsInboxData {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('ops-inbox-sample.json must contain a JSON object');
  }
  const data = raw as Partial<OpsInboxData>;
  if (!Array.isArray(data.items)) {
    throw new ValidationError('ops-inbox-sample.json is missing the required "items" array');
  }
  data.items.forEach((item, index) => {
    const it = item as Partial<OpsItem>;
    for (const field of ['id', 'type', 'title', 'source', 'owner'] as (keyof OpsItem)[]) {
      if (!it[field]) {
        throw new ValidationError(`Ops inbox item at index ${index} is missing required field "${field}"`);
      }
    }
    if (!VALID_TYPES.includes(it.type as OpsItem['type'])) {
      throw new ValidationError(`Ops inbox item ${it.id} has an unrecognized type "${it.type}"`);
    }
    if (it.type === 'pending_approval' && (!it.waitingOn || !it.sentDate)) {
      throw new ValidationError(`Ops inbox item ${it.id} is type "pending_approval" but is missing "waitingOn" or "sentDate"`);
    }
    if (it.type !== 'pending_approval' && !it.createdDate) {
      throw new ValidationError(`Ops inbox item ${it.id} is type "${it.type}" but is missing "createdDate"`);
    }
    if (!Array.isArray(it.candidateAssignees)) {
      throw new ValidationError(`Ops inbox item ${it.id} is missing the "candidateAssignees" array (use [] if none)`);
    }
  });
  return data as OpsInboxData;
}

export async function loadOpsInboxData(): Promise<OpsInboxData> {
  const raw = await fs.readFile(FIXTURE_PATH, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('ops-inbox-sample.json is not valid JSON');
  }
  return validate(parsed);
}
