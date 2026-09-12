import { NextRequest, NextResponse } from 'next/server';
import { loadSprintData } from '@/lib/data/jira';
import { loadDocsData } from '@/lib/data/confluence';
import { matchTicketsToDocs } from '@/lib/llm/match-docs';
import { computeProcessHealth, sortBySeverity } from '@/lib/process-health';
import { DEFAULT_STALE_DAYS } from '@/lib/config';
import { ValidationError } from '@/lib/data/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const staleDaysParam = request.nextUrl.searchParams.get('staleDays');
    const staleDays = staleDaysParam ? Number(staleDaysParam) : DEFAULT_STALE_DAYS;
    if (!Number.isFinite(staleDays) || staleDays < 0) {
      return NextResponse.json({ error: '"staleDays" must be a non-negative number' }, { status: 400 });
    }

    const [sprintData, docsData] = await Promise.all([loadSprintData(), loadDocsData()]);
    const docLinks = matchTicketsToDocs(sprintData, docsData.pages);
    const violations = sortBySeverity(computeProcessHealth(sprintData, docLinks, staleDays));

    return NextResponse.json({ violations, staleDays });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/process-health] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to compute process health' }, { status: 500 });
  }
}
