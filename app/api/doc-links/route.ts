import { NextResponse } from 'next/server';
import { loadSprintData } from '@/lib/data/jira';
import { loadDocsData } from '@/lib/data/confluence';
import { matchTicketsToDocs } from '@/lib/llm/match-docs';
import { ValidationError } from '@/lib/data/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [sprintData, docsData] = await Promise.all([loadSprintData(), loadDocsData()]);
    const result = matchTicketsToDocs(sprintData, docsData.pages);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/doc-links] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to compute doc links' }, { status: 500 });
  }
}
