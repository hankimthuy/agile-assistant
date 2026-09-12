import { NextResponse } from 'next/server';
import { loadOpsInboxData } from '@/lib/data/ops-inbox';
import { suggestDelegations } from '@/lib/llm/suggest-delegate';
import { ValidationError } from '@/lib/data/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadOpsInboxData();
    const suggestions = await suggestDelegations(data.items);
    return NextResponse.json({ suggestions });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/delegate] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to compute delegation suggestions' }, { status: 500 });
  }
}
