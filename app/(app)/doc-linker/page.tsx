'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { CompletionDonut } from '@/components/charts';
import { useToast } from '@/components/ToastProvider';
import type { DocLinksResult } from '@/lib/types';

export default function DocLinkerPage() {
  const { showToast } = useToast();
  const [result, setResult] = useState<DocLinksResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/doc-links');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load doc links');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doc links');
    }
  }

  const confident = useMemo(() => result?.matches.filter((m) => m.confidence === 'high') ?? [], [result]);
  const needsReview = useMemo(
    () => (result?.matches.filter((m) => m.confidence !== 'high' && !dismissed.has(m.ticketId)) ?? []),
    [result, dismissed]
  );
  const total = result ? result.matches.length + result.missingDocTicketIds.length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">
            {total > 0 ? `${total} tickets · ${result?.matches.length ?? 0} matched` : 'Doc Linker'}
          </div>
          <h1 className="mt-1 text-[28px] md:text-[32px]">Doc Linker</h1>
        </div>
        <div className="flex gap-2.5">
          <button onClick={load} className="btn btn-secondary">
            Re-index
          </button>
          <button
            onClick={() => {
              setAccepted((prev) => new Set([...prev, ...confident.map((m) => m.ticketId)]));
              showToast('High-confidence links accepted (local to this session)', 'success');
            }}
            className="btn btn-primary"
          >
            Accept all high-confidence
          </button>
        </div>
      </div>

      {error && <Panel className="p-3 text-sm">{error}</Panel>}
      {!error && !result && (
        <div className="flex flex-col gap-3">
          <div className="skel w-2/5" style={{ height: 26 }} />
          <div className="skel w-full" />
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_1.6fr]">
          <Panel className="flex flex-col gap-3 p-4">
            <div className="eyebrow">Documentation coverage</div>
            <div className="flex items-center gap-4">
              <CompletionDonut
                pct={total ? Math.round((result.matches.length / total) * 100) : 0}
                centerLabel={`${result.matches.length} OF ${total}`}
                segments={
                  total
                    ? [
                        { value: (confident.length / total) * 100, color: 'var(--color-accent)' },
                        { value: ((result.matches.length - confident.length) / total) * 100, color: 'var(--color-accent-300)' },
                      ]
                    : undefined
                }
              />
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: 'var(--color-accent)' }} />
                  {confident.length} confident link{confident.length === 1 ? '' : 's'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: 'var(--color-accent-300)' }} />
                  {result.matches.length - confident.length} need review
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: 'color-mix(in srgb, var(--color-text) 12%, transparent)' }} />
                  {result.missingDocTicketIds.length} unmatched
                </div>
              </div>
            </div>
            {result.orphanedDocs.length > 0 && (
              <div className="mt-auto border-t border-line pt-2.5">
                <div className="lbl mb-1.5">Orphan pages</div>
                <div className="text-[13px] text-muted">
                  {result.orphanedDocs.length} Confluence page{result.orphanedDocs.length === 1 ? '' : 's'} match{result.orphanedDocs.length === 1 ? 'es' : ''} no ticket
                  in this sprint — {result.orphanedDocs.map((d) => `"${d.title}"`).join(', ')}.
                </div>
              </div>
            )}
          </Panel>

          <div className="flex flex-col gap-3">
            <div className="eyebrow">
              Suggested links{needsReview.length > 0 ? ` · ${needsReview.length} need your review` : ''}
            </div>

            {needsReview.map((m) => (
              <Panel
                key={m.ticketId}
                className="grid grid-cols-1 items-center gap-3.5 p-3.5 sm:grid-cols-[1fr_auto_1fr_auto]"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}
              >
                <div>
                  <div className="lbl">Ticket</div>
                  <div className="font-heading text-base font-semibold">{m.ticketId}</div>
                </div>
                <div className="hidden text-lg text-accent sm:block">→</div>
                <div>
                  <div className="lbl">Confluence page</div>
                  <div className="font-heading text-base font-semibold">{m.doc.title}</div>
                  <div className="mt-0.5 text-xs text-muted">Score {m.score.toFixed(2)} · <ConfidenceBadge confidence={m.confidence} /></div>
                </div>
                <div className="flex flex-col gap-1.5 sm:flex-row">
                  <button
                    onClick={() => {
                      setAccepted((prev) => new Set(prev).add(m.ticketId));
                      showToast('Link accepted (local to this session)', 'success');
                    }}
                    disabled={accepted.has(m.ticketId)}
                    className="btn btn-primary"
                  >
                    {accepted.has(m.ticketId) ? 'Linked' : 'Link'}
                  </button>
                  <button onClick={() => setDismissed((prev) => new Set(prev).add(m.ticketId))} className="btn btn-secondary">
                    Dismiss
                  </button>
                </div>
              </Panel>
            ))}

            <Panel className="overflow-x-auto p-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th colSpan={2}>Linked page</th>
                    <th className="text-right">Confidence / score</th>
                  </tr>
                </thead>
                <tbody>
                  {confident.map((m) => (
                    <tr key={m.ticketId}>
                      <td className="font-medium">{m.ticketId}</td>
                      <td colSpan={2}>
                        <a href={m.doc.url} target="_blank" rel="noreferrer">
                          {m.doc.title}
                        </a>
                      </td>
                      <td className="text-right">
                        <ConfidenceBadge confidence={m.confidence} /> <span className="text-muted">{m.score.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                  {result.missingDocTicketIds.map((id) => (
                    <tr key={id}>
                      <td className="font-medium text-muted">{id}</td>
                      <td colSpan={2} className="text-muted">
                        No page matched — documentation missing
                      </td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
