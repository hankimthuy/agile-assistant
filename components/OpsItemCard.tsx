'use client';

import { useState } from 'react';
import { daysSince } from '@/lib/config';
import { Panel } from './Panel';
import { useToast } from './ToastProvider';
import type { DelegationSuggestion, DraftResult, OpsItem } from '@/lib/types';

const SOURCE_LABELS: Record<OpsItem['source'], string> = {
  jira: 'Jira',
  teams: 'Teams',
  email: 'Email',
};

const TYPE_LABELS: Record<OpsItem['type'], string> = {
  task: 'My work',
  delegatable: 'Delegatable',
  pending_approval: 'Awaiting approval',
  needs_email: 'Needs reply',
};

interface Props {
  item: OpsItem;
  suggestion?: DelegationSuggestion;
  approvalWarnDays: number;
  delegated: boolean;
  onDelegate: () => void;
  wide?: boolean;
}

export function OpsItemCard({ item, suggestion, approvalWarnDays, delegated, onDelegate, wide }: Props) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [showDraft, setShowDraft] = useState(false);

  const referenceDate = item.sentDate ?? item.createdDate;
  const daysOpen = referenceDate ? daysSince(referenceDate) : undefined;
  const waitedTooLong = item.type === 'pending_approval' && (daysOpen ?? 0) > approvalWarnDays;

  async function requestDraft(force = false) {
    setShowDraft(true);
    if (draft && !force) return; // already fetched — user is just re-opening
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
    <Panel
      className={`flex flex-col gap-2 p-3.5 ${wide ? 'md:col-span-2' : ''}`}
      style={waitedTooLong ? { background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        {waitedTooLong ? (
          <span className="tag tag-strong">Overdue {daysOpen}d</span>
        ) : (
          <span className="tag tag-neutral">{TYPE_LABELS[item.type]}</span>
        )}
        <span className="lbl">
          {SOURCE_LABELS[item.source]}
          {daysOpen !== undefined && !waitedTooLong && ` · ${item.type === 'pending_approval' ? 'waiting' : 'open'} ${daysOpen}d`}
        </span>
        {showDraft && draft && <span className="lbl ml-auto">Draft open</span>}
      </div>

      <div className="font-heading text-lg font-semibold leading-snug">{item.title}</div>

      {item.type === 'pending_approval' && item.waitingOn && (
        <div className="text-xs text-muted">Needs {item.waitingOn}</div>
      )}

      {item.type === 'delegatable' && suggestion && (
        <div className="blueprint bg-surface p-2.5 text-xs">
          <span className={suggestion.label === 'can_delegate' ? 'font-semibold text-accent-800' : 'font-semibold'}>
            {suggestion.label === 'can_delegate' ? 'Can delegate' : 'Should do myself'}
          </span>{' '}
          <span className="text-muted">— {suggestion.reason}</span>
        </div>
      )}

      {item.type === 'task' && (
        <div className="text-xs text-muted">
          {item.candidateAssignees.length > 0
            ? `Candidates: ${item.candidateAssignees.join(', ')}`
            : 'Stays with you — no candidate assignee identified.'}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-0.5">
        {item.type === 'delegatable' && (
          <button onClick={onDelegate} disabled={delegated} className="btn btn-primary">
            {delegated ? 'Delegated' : 'Delegate'}
          </button>
        )}
        {(item.type === 'needs_email' || item.type === 'pending_approval') && !showDraft && (
          <button onClick={() => requestDraft()} className="btn btn-primary">
            {item.type === 'pending_approval' ? 'Draft reminder' : 'Draft'}
          </button>
        )}
      </div>

      {showDraft && (
        <div className="blueprint flex flex-col gap-2.5 bg-surface p-3">
          {draftLoading || !draft ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              <span className="spinner" /> Generating draft…
            </p>
          ) : (
            <>
              <input readOnly value={draft.subject} className="input min-h-[32px] text-xs" />
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={5}
                className="input text-xs leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2.5">
                <button onClick={copyDraft} className="btn btn-primary">
                  Copy
                </button>
                <button onClick={() => requestDraft(true)} className="btn btn-secondary">
                  Regenerate
                </button>
                <span className="ml-auto text-[11px] text-muted">
                  {draft.generatedByLLM ? 'Generated by Gemini' : 'Drafted from template'} — never sent automatically
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
