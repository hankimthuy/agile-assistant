import { NextResponse } from 'next/server';
import { loadSprintData } from '@/lib/data/jira';
import { generateNarrativeReport } from '@/lib/llm/narrative';
import { ValidationError } from '@/lib/data/errors';

// POST — "Generate Report" is an action, not a passive GET, and the spec
// requires it complete in under 30 seconds (Story 1.2).
export async function POST() {
  try {
    const sprintData = await loadSprintData();
    const report = await generateNarrativeReport(sprintData);
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/report] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
