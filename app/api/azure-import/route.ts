import { NextResponse } from 'next/server';
import { loadAzureSampleCsv, parseAzureImport } from '@/lib/data/azure';
import { ValidationError } from '@/lib/data/errors';
import { computeAzureImportReport } from '@/lib/azure-metrics';
import { DEFAULT_STALE_DAYS } from '@/lib/config';

// GET — backs the "Load sample data" button, so the feature is demoable
// with zero setup (no Azure export required to try it).
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = await loadAzureSampleCsv();
    return NextResponse.json({ format: 'csv', raw });
  } catch (err) {
    console.error('[api/azure-import] Failed to load sample data:', err);
    return NextResponse.json({ error: 'Failed to load sample data' }, { status: 500 });
  }
}

// POST — "Analyze" is an action on data the user pastes/uploads each
// time, not something the app tracks or stores (spec.md Epic 6). Nothing
// is written to disk or kept between requests; nothing is sent to Azure
// DevOps.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { format, raw, staleDays } = body ?? {};

    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json({ error: 'format must be "json" or "csv"' }, { status: 422 });
    }
    if (typeof raw !== 'string') {
      return NextResponse.json({ error: 'raw must be the pasted/uploaded export text' }, { status: 422 });
    }

    const importResult = parseAzureImport({ format, raw });
    const report = computeAzureImportReport(
      importResult,
      typeof staleDays === 'number' && staleDays >= 0 ? staleDays : DEFAULT_STALE_DAYS
    );
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/azure-import] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to process the Azure import' }, { status: 500 });
  }
}
