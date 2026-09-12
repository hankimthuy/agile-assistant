import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from './errors';
import type { Doc, DocsData } from '../types';

const FIXTURE_PATH = path.join(process.cwd(), 'data', 'confluence-pages-sample.json');

function validate(raw: unknown): DocsData {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('confluence-pages-sample.json must contain a JSON object');
  }
  const data = raw as Partial<DocsData>;
  if (!Array.isArray(data.pages)) {
    throw new ValidationError('confluence-pages-sample.json is missing the required "pages" array');
  }
  data.pages.forEach((page, index) => {
    for (const field of ['title', 'url', 'labels', 'lastUpdated'] as (keyof Doc)[]) {
      const value = (page as Partial<Doc>)[field];
      if (value === undefined || value === null || value === '') {
        throw new ValidationError(`Doc at index ${index} is missing required field "${field}"`);
      }
    }
  });
  return data as DocsData;
}

export async function loadDocsData(): Promise<DocsData> {
  const raw = await fs.readFile(FIXTURE_PATH, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('confluence-pages-sample.json is not valid JSON');
  }
  return validate(parsed);
}
