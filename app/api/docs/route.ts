import { NextResponse } from 'next/server';
import { loadDocsData } from '@/lib/data/confluence';
import { ValidationError } from '@/lib/data/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadDocsData();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/docs] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load documentation data' }, { status: 500 });
  }
}
