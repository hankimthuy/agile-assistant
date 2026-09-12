import { NextRequest, NextResponse } from 'next/server';
import { sendToTeams } from '@/lib/teams';

interface SendReportBody {
  sprintId: string;
  sprintName: string;
  summary: string;
  doneCount: number;
  totalCount: number;
  velocity: number;
  missingDocCount: number;
}

// FR-3: posts a report summary to the configured Teams Incoming Webhook. A
// webhook failure is logged and returned as { ok: false } — never a thrown
// error — so the Report view can toast it without crashing (AD-3).
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as SendReportBody | null;
  if (!body || !body.sprintId || !body.summary) {
    return NextResponse.json({ error: '"sprintId" and "summary" are required' }, { status: 400 });
  }

  const dashboardUrl = `${request.nextUrl.origin}/report/${encodeURIComponent(body.sprintId)}`;
  const missingDocLine =
    body.missingDocCount > 0
      ? ` ${body.missingDocCount} ticket${body.missingDocCount === 1 ? '' : 's'} missing documentation.`
      : '';

  const text =
    `**${body.sprintName} — Automated Report**\n` +
    `${body.doneCount}/${body.totalCount} stories completed (velocity ${body.velocity} points). ` +
    `${body.summary}${missingDocLine} View details: ${dashboardUrl}`;

  const result = await sendToTeams(text);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
