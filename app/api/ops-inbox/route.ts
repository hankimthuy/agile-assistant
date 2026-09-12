import { NextResponse } from 'next/server';
import { loadOpsInboxData } from '@/lib/data/ops-inbox';
import { ValidationError } from '@/lib/data/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadOpsInboxData();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/ops-inbox] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load ops inbox data' }, { status: 500 });
  }
}
