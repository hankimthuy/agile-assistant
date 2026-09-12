import { NextResponse } from 'next/server';
import { loadSprintData } from '@/lib/data/jira';
import { ValidationError } from '@/lib/data/errors';

// Always re-read the fixture on request — "Refresh data" (FR-1) must reflect
// on-disk changes without a rebuild.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadSprintData();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/sprint] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load sprint data' }, { status: 500 });
  }
}
