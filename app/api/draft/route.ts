import { NextRequest, NextResponse } from 'next/server';
import { loadOpsInboxData } from '@/lib/data/ops-inbox';
import { draftText } from '@/lib/llm/draft-text';
import { ValidationError } from '@/lib/data/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const itemId = body?.itemId;
    if (typeof itemId !== 'string' || itemId.length === 0) {
      return NextResponse.json({ error: '"itemId" is required' }, { status: 400 });
    }

    const data = await loadOpsInboxData();
    const item = data.items.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json({ error: `No ops inbox item with id "${itemId}"` }, { status: 404 });
    }
    if (item.type !== 'needs_email' && item.type !== 'pending_approval') {
      return NextResponse.json(
        { error: `Draft is only available for "needs_email" or "pending_approval" items, got "${item.type}"` },
        { status: 400 }
      );
    }

    const draft = await draftText(item);
    return NextResponse.json(draft);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[api/draft] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
  }
}
