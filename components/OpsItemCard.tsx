'use client';

import { useState } from 'react';
import { daysSince } from '@/lib/config';
import { useToast } from './ToastProvider';
import type { DelegationSuggestion, DraftResult, OpsItem } from '@/lib/types';

const SOURCE_LABELS: Record<OpsItem['source'], string> = {
  jira: 'Jira',
  teams: 'Teams',
  email: 'Email',
};

function SourceBadge({ source }: { source: OpsItem['source'] }) {
  return (
    <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
      {SOURCE_LABELS[source]}
    </span>
  );
}

interface Props {
  item: OpsItem;
  suggestion?: DelegationSuggestion;
  approvalWarnDays: number;
  delegated: boolean;
  onDelegate: () => void;
}

export function OpsItemCard({ item, suggestion, approvalWarnDays, delegated, onDelegate }: Props) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [showDraft, setShowDraft] = useState(false);

  const referenceDate = item.sentDate ?? item.createdDate;
  const daysOpen = referenceDate ? daysSince(referenceDate) : undefined;
  const waitedTooLong = item.type === 'pending_approval' && (daysOpen ?? 0) > approvalWarnDays;

  async function requestDraft() {
    setShowDraft(true);
    if (draft) return; // already fetched — user is just re-opening
    setDraftLoading(true);
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate draft');
      setDraft(data);
      setEditedBody(data.body);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate draft', 'error');
      setShowDraft(false);
    } finally {
      setDraftLoading(false);
    }
  }

  async function copyDraft() {
    const text = draft ? `Subject: ${draft.subject}\n\n${editedBody}` : '';
    try {
      await navigator.clipboard.writeText(text);
      showToast('Draft copied to clipboard', 'success');
    } catch {
      showToast('Could not copy — select and copy manually', 'error');
    }
  }

  return (
    <div className="rounded-lg border bg-white p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{item.title}</p>
        <SourceBadge source={item.source} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {daysOpen !== undefined && (
          <span className={waitedTooLong ? 'font-semibold text-red-700' : ''}>
            {item.type === 'pending_approval' ? `Waiting ${daysOpen}d` : `Open ${daysOpen}d`}
          </span>
        )}
        {item.type === 'pending_approval' && item.waitingOn && <span>· Needs {item.waitingOn}</span>}
        {waitedTooLong && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800">Overdue</span>
        )}
      </div>

      {item.type === 'delegatable' && suggestion && (
        <div className="rounded bg-gray-50 p-2 text-xs text-gray-700">
          <span
            className={`font-semibold ${suggestion.label === 'can_delegate' ? 'text-green-700' : 'text-gray-700'}`}
          >
            {suggestion.label === 'can_delegate' ? 'Can delegate' : 'Should do myself'}
          </span>
          <span> — {suggestion.reason}</span>
        </div>
      )}

      <div className="flex gap-2">
        {item.type === 'delegatable' && (
          <button
            onClick={onDelegate}
            disabled={delegated}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              delegated ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
          >
            {delegated ? 'Delegated' : 'Delegate'}
          </button>
        )}
        {(item.type === 'needs_email' || item.type === 'pending_approval') && !showDraft && (
          <button
            onClick={requestDraft}
            className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
          >
            {item.type === 'pending_approval' ? 'Draft reminder' : 'Draft'}
          </button>
        )}
      </div>

      {showDraft && (
        <div className="space-y-2 rounded border bg-gray-50 p-2">
          {draftLoading || !draft ? (
            <p className="text-xs text-gray-500">Generating draft…</p>
          ) : (
            <>
              <input
                readOnly
                value={draft.subject}
                className="w-full rounded border bg-white px-2 py-1 text-xs text-gray-700"
              />
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={5}
                className="w-full rounded border bg-white px-2 py-1 text-xs text-gray-900"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={copyDraft}
                  className="rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
                >
                  Copy
                </button>
                <span className="text-[11px] text-gray-400">
                  {draft.generatedByLLM ? 'Generated by Gemini' : 'Generated by template (no API key set)'} — never
                  sent automatically
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
