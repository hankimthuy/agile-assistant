'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Panel } from '@/components/Panel';
import { useToast } from '@/components/ToastProvider';
import { daysSince, DEFAULT_APPROVAL_WARN_DAYS, DEFAULT_STALE_DAYS } from '@/lib/config';
import type {
  DelegationSuggestion,
  DraftResult,
  OpsItem,
  ProcessHealthViolation,
  SprintData,
} from '@/lib/types';

type Highlight = {
  key: string;
  tag: string;
  tagStrong?: boolean;
  meta: string;
  title: string;
  body: string;
  primary: { label: string; kind: 'draft' | 'delegate' | 'link'; href?: string };
  secondary?: { label: string };
};

type ActivityEntry = { id: string; text: string; date: string };

function CompletionRing({ pct, size = 104 }: { pct: number; size?: number }) {
  const r = (size - 22) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="color-mix(in srgb, var(--color-text) 12%, transparent)" strokeWidth="11" />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="11"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform={`rotate(-90 ${cx} ${cx})`}
        strokeLinecap="butt"
      />
      <text x={cx} y={cx - 2} textAnchor="middle" fontFamily="var(--font-heading)" fontWeight={600} fontSize={size * 0.26} fill="var(--color-text)">
        {pct}%
      </text>
    </svg>
  );
}

export default function OverviewPage() {
  const { showToast } = useToast();
  const [opsItems, setOpsItems] = useState<OpsItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, DelegationSuggestion>>({});
  const [sprintData, setSprintData] = useState<SprintData | null>(null);
  const [violations, setViolations] = useState<ProcessHealthViolation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftResult | 'loading'>>({});
  const [delegatedIds, setDelegatedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    try {
      const [inboxRes, delegateRes, sprintRes, healthRes] = await Promise.all([
        fetch('/api/ops-inbox'),
        fetch('/api/delegate'),
        fetch('/api/sprint'),
        fetch(`/api/process-health?staleDays=${DEFAULT_STALE_DAYS}`),
      ]);
      const inboxData = await inboxRes.json();
      if (!inboxRes.ok) throw new Error(inboxData.error ?? 'Failed to load the ops inbox');
      const delegateData = await delegateRes.json();
      const sprint = await sprintRes.json();
      if (!sprintRes.ok) throw new Error(sprint.error ?? 'Failed to load sprint data');
      const health = await healthRes.json();

      setOpsItems(inboxData.items);
      const byId: Record<string, DelegationSuggestion> = {};
      for (const s of (delegateData.suggestions ?? []) as DelegationSuggestion[]) byId[s.itemId] = s;
      setSuggestions(byId);
      setSprintData(sprint);
      setViolations(health.violations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading the overview');
    }
  }

  async function requestDraft(itemId: string) {
    setDrafts((d) => ({ ...d, [itemId]: 'loading' }));
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate draft');
      setDrafts((d) => ({ ...d, [itemId]: data }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate draft', 'error');
      setDrafts((d) => {
        const next = { ...d };
        delete next[itemId];
        return next;
      });
    }
  }

  function delegate(itemId: string) {
    setDelegatedIds((prev) => new Set(prev).add(itemId));
    showToast('Marked as delegated (local to this session)', 'success');
  }

  const highlights: Highlight[] = useMemo(() => {
    if (!opsItems) return [];
    const list: Highlight[] = [];

    const overdueApproval = opsItems
      .filter((i) => i.type === 'pending_approval' && i.sentDate && !dismissedIds.has(i.id))
      .sort((a, b) => daysSince(a.sentDate!) - daysSince(b.sentDate!))
      .find((i) => daysSince(i.sentDate!) > DEFAULT_APPROVAL_WARN_DAYS);
    if (overdueApproval) {
      const waited = daysSince(overdueApproval.sentDate!);
      list.push({
        key: overdueApproval.id,
        tag: `Overdue ${waited}d`,
        tagStrong: true,
        meta: `Email · ${overdueApproval.waitingOn}`,
        title: overdueApproval.title,
        body: `Past the ${DEFAULT_APPROVAL_WARN_DAYS}-day threshold by ${waited - DEFAULT_APPROVAL_WARN_DAYS} day${
          waited - DEFAULT_APPROVAL_WARN_DAYS === 1 ? '' : 's'
        }.`,
        primary: { label: 'Review draft', kind: 'draft' },
      });
    }

    const delegatable = opsItems.find(
      (i) => i.type === 'delegatable' && suggestions[i.id]?.label === 'can_delegate' && !delegatedIds.has(i.id)
    );
    if (delegatable) {
      list.push({
        key: delegatable.id,
        tag: 'Can delegate',
        meta: `${delegatable.source === 'teams' ? 'Teams' : delegatable.source} · open ${daysSince(
          delegatable.createdDate!
        )}d`,
        title: delegatable.title,
        body: suggestions[delegatable.id].reason,
        primary: { label: `Delegate`, kind: 'delegate' },
      });
    }

    const needsReply = opsItems.find((i) => i.type === 'needs_email');
    if (needsReply) {
      list.push({
        key: needsReply.id,
        tag: 'Needs reply',
        meta: `Email · open ${daysSince(needsReply.createdDate!)}d`,
        title: needsReply.title,
        body: 'A draft reply is ready for you to review and edit before sending.',
        primary: { label: 'Open draft', kind: 'draft' },
      });
    }

    if (violations && violations.length > 0) {
      const highSeverity = violations.filter((v) => v.severity === 'high');
      const flagged = highSeverity.length > 0 ? highSeverity : violations;
      const ticketIds = [...new Set(flagged.map((v) => v.ticketId))];
      list.push({
        key: 'hygiene',
        tag: 'Hygiene',
        meta: `${flagged.length} ${highSeverity.length > 0 ? 'high-severity' : ''} flag${flagged.length === 1 ? '' : 's'}`.trim(),
        title: `${ticketIds.slice(0, 2).join(' and ')}${ticketIds.length > 2 ? `, +${ticketIds.length - 2} more` : ''} — process health flags`,
        body: 'Review the detail on Process Health before this rolls into the next sprint.',
        primary: { label: 'Open Process Health', kind: 'link', href: '/process-health' },
      });
    }

    return list;
  }, [opsItems, suggestions, violations, delegatedIds, dismissedIds]);

  const activity: ActivityEntry[] = useMemo(() => {
    if (!sprintData || !opsItems) return [];
    const entries: ActivityEntry[] = [];
    for (const t of sprintData.tickets) {
      const label =
        t.status === 'done'
          ? `${t.id} marked done — ${t.assignee}`
          : t.status === 'in_progress'
          ? `${t.id} in progress — ${t.assignee}`
          : `${t.id} to do — ${t.assignee}`;
      entries.push({ id: `ticket-${t.id}`, text: label, date: t.lastUpdated });
    }
    for (const i of opsItems) {
      if (i.createdDate) entries.push({ id: `ops-${i.id}`, text: `${i.title} landed in the Ops Hub`, date: i.createdDate });
    }
    return entries.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [sprintData, opsItems]);

  const metrics = useMemo(() => {
    if (!sprintData) return null;
    const done = sprintData.tickets.filter((t) => t.status === 'done');
    const inProgress = sprintData.tickets.filter((t) => t.status === 'in_progress');
    const velocity = done.reduce((sum, t) => sum + t.storyPoints, 0);
    const pct = sprintData.tickets.length === 0 ? 0 : Math.round((done.length / sprintData.tickets.length) * 100);
    return { pct, velocity, doneCount: done.length, total: sprintData.tickets.length, rollingOver: inProgress.length };
  }, [sprintData]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{today}</div>
          <h1 className="mt-1 text-[28px] md:text-[32px]">
            {highlights.length > 0
              ? `${highlights.length} thing${highlights.length === 1 ? '' : 's'} need${highlights.length === 1 ? 's' : ''} you today`
              : 'Nothing needs you right now'}
          </h1>
        </div>
        <div className="flex gap-2.5">
          <span className="btn btn-secondary cursor-default">{sprintData ? sprintData.sprint.name : 'Sprint'}</span>
          <Link href="/report" className="btn btn-primary">
            Generate report
          </Link>
        </div>
      </div>

      {error && (
        <Panel className="border-accent-900 bg-bg p-3 text-sm">
          {error}{' '}
          <button onClick={load} className="btn-ghost btn underline">
            Retry
          </button>
        </Panel>
      )}

      {!error && !opsItems && (
        <div className="flex flex-col gap-3">
          <div className="skel w-2/5" style={{ height: 26 }} />
          <div className="skel w-full" />
          <div className="skel w-[92%]" />
        </div>
      )}

      {opsItems && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="flex flex-col gap-3">
            <div className="eyebrow">Needs me today</div>

            {highlights.length === 0 && (
              <Panel className="flex flex-col items-center gap-2 border-dashed p-9 text-center">
                <div className="font-heading text-xl font-semibold">Nothing needs you right now</div>
                <p className="max-w-[42ch] text-sm text-muted">
                  No overdue approvals, no unanswered messages, no delegatable work waiting.
                </p>
              </Panel>
            )}

            {highlights.map((h) => {
              const draft = h.primary.kind === 'draft' ? drafts[h.key] : undefined;
              return (
                <Panel
                  key={h.key}
                  className="flex gap-3.5 p-4"
                  style={h.tagStrong ? { background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' } : undefined}
                >
                  {h.tagStrong && <div className="w-1 shrink-0 self-stretch bg-accent-700" />}
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`tag ${h.tagStrong ? 'tag-strong' : 'tag-accent'}`}>{h.tag}</span>
                      <span className="lbl">{h.meta}</span>
                    </div>
                    <div className="font-heading text-lg font-semibold">{h.title}</div>
                    <p className="text-[13px] text-muted">{h.body}</p>

                    {h.primary.kind === 'link' ? (
                      <div className="flex gap-2 pt-0.5">
                        <Link href={h.primary.href!} className="btn btn-secondary">
                          {h.primary.label}
                        </Link>
                      </div>
                    ) : draft ? (
                      <div className="blueprint mt-1 flex flex-col gap-2 bg-surface p-3">
                        {draft === 'loading' ? (
                          <p className="text-xs text-muted">Generating draft…</p>
                        ) : (
                          <>
                            <input readOnly value={draft.subject} className="input min-h-[32px] text-xs" />
                            <textarea readOnly value={draft.body} rows={4} className="input text-xs" />
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={async () => {
                                  await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`).catch(() => {});
                                  showToast('Draft copied to clipboard', 'success');
                                }}
                                className="btn btn-primary"
                              >
                                Copy
                              </button>
                              <span className="text-[11px] text-muted">
                                {draft.generatedByLLM ? 'Generated by Gemini' : 'Generated by template'} — never sent automatically
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={() =>
                            h.primary.kind === 'draft' ? requestDraft(h.key) : delegate(h.key)
                          }
                          className="btn btn-primary"
                        >
                          {h.primary.label}
                        </button>
                        <button
                          onClick={() => setDismissedIds((prev) => new Set(prev).add(h.key))}
                          className="btn btn-secondary"
                        >
                          {h.primary.kind === 'delegate' ? 'Keep it' : 'Dismiss'}
                        </button>
                      </div>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>

          <div className="flex flex-col gap-5">
            {metrics && (
              <Panel className="p-4">
                <div className="eyebrow mb-3">{sprintData?.sprint.name} completion</div>
                <div className="flex items-center gap-4">
                  <CompletionRing pct={metrics.pct} />
                  <div className="flex flex-col gap-2 text-[13px]">
                    <div>
                      <div className="metric-sm">{metrics.velocity}</div>
                      <div className="lbl">Velocity (pts)</div>
                    </div>
                    <div>
                      <div className="metric-sm">{metrics.rollingOver}</div>
                      <div className="lbl">Rolling over</div>
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="eyebrow">Recent activity</div>
              <div className="flex flex-col border-l border-line pl-4">
                {activity.length === 0 && <p className="text-xs text-muted">Nothing recorded yet.</p>}
                {activity.map((a, i) => (
                  <div key={a.id} className="relative pb-4 last:pb-0">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2.5 w-2.5"
                      style={
                        i === 0
                          ? { background: 'var(--color-accent)' }
                          : { border: '1px solid var(--color-neutral-500)' }
                      }
                    />
                    <div className="text-[13px] font-medium">{a.text}</div>
                    <div className="lbl mt-0.5">{a.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
