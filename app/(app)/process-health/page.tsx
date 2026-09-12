'use client';

import { useEffect, useMemo, useState } from 'react';
import { SeverityBadge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { DEFAULT_STALE_DAYS } from '@/lib/config';
import type { ProcessHealthViolation, ViolationType } from '@/lib/types';

const TYPE_LABELS: Record<ViolationType, string> = {
  missing_acceptance_criteria: 'Missing acceptance criteria',
  missing_documentation: 'Missing documentation',
  stale: 'Stale',
};

const SEVERITY_RANK: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };
const SEVERITY_BAR: Record<string, string> = {
  high: 'var(--color-accent-900)',
  medium: 'var(--color-accent-600)',
  low: 'var(--color-accent-300)',
};

const TABS: { type: ViolationType | 'all'; label: string }[] = [
  { type: 'all', label: 'All types' },
  { type: 'missing_acceptance_criteria', label: 'Acceptance criteria' },
  { type: 'missing_documentation', label: 'Documentation' },
  { type: 'stale', label: 'Stale' },
];

export default function ProcessHealthPage() {
  const [violations, setViolations] = useState<ProcessHealthViolation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staleDays, setStaleDays] = useState(DEFAULT_STALE_DAYS);
  const [typeFilter, setTypeFilter] = useState<ViolationType | 'all'>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    load(staleDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staleDays]);

  async function load(days: number) {
    setError(null);
    try {
      const res = await fetch(`/api/process-health?staleDays=${days}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load process health');
      setViolations(data.violations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load process health');
    }
  }

  const visible = useMemo(() => {
    if (!violations) return [];
    const filtered = typeFilter === 'all' ? violations : violations.filter((v) => v.type === typeFilter);
    return [...filtered].sort((a, b) =>
      sortDir === 'desc'
        ? SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
        : SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    );
  }, [violations, typeFilter, sortDir]);

  const bySeverity = useMemo(() => {
    if (!violations) return [];
    return (['high', 'medium', 'low'] as const).map((s) => ({
      severity: s,
      count: violations.filter((v) => v.severity === s).length,
    }));
  }, [violations]);

  const byType = useMemo(() => {
    if (!violations) return [];
    return (Object.keys(TYPE_LABELS) as ViolationType[])
      .map((type) => ({ type, label: TYPE_LABELS[type], count: violations.filter((v) => v.type === type).length }))
      .filter((t) => t.count > 0);
  }, [violations]);

  const worstOffender = useMemo(() => {
    if (!violations || violations.length === 0) return null;
    const byTicket = new Map<string, ProcessHealthViolation[]>();
    for (const v of violations) byTicket.set(v.ticketId, [...(byTicket.get(v.ticketId) ?? []), v]);
    const entries = [...byTicket.entries()];
    entries.sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      const aMax = Math.max(...a[1].map((v) => SEVERITY_RANK[v.severity]));
      const bMax = Math.max(...b[1].map((v) => SEVERITY_RANK[v.severity]));
      return bMax - aMax;
    });
    const [ticketId, flags] = entries[0];
    return { ticketId, title: flags[0].ticketTitle, flags };
  }, [violations]);

  const maxBySeverity = Math.max(1, ...bySeverity.map((s) => s.count));
  const maxByType = Math.max(1, ...byType.map((t) => t.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">
            {violations ? `${violations.length} violation${violations.length === 1 ? '' : 's'} across ${new Set(violations.map((v) => v.ticketId)).size} ticket${new Set(violations.map((v) => v.ticketId)).size === 1 ? '' : 's'}` : 'Process Health'}
          </div>
          <h1 className="mt-1 text-[28px] md:text-[32px]">Process Health</h1>
        </div>
        <div className="flex items-center gap-3.5">
          <label className="flex items-center gap-2 text-sm">
            Stale after
            <input
              type="number"
              min={0}
              value={staleDays}
              onChange={(e) => setStaleDays(Math.max(0, Number(e.target.value) || 0))}
              className="input min-h-[32px] w-14"
            />
            days
          </label>
          <button
            onClick={() => {
              if (!violations) return;
              const rows = ['Ticket,Violation,Detail,Severity']
                .concat(violations.map((v) => `${v.ticketId},${TYPE_LABELS[v.type]},"${v.detail.replace(/"/g, '""')}",${v.severity}`))
                .join('\n');
              const blob = new Blob([rows], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'process-health.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-secondary"
          >
            Export list
          </button>
        </div>
      </div>

      {error && <Panel className="p-3 text-sm">{error}</Panel>}

      {!error && !violations && (
        <div className="flex flex-col gap-3">
          <div className="skel w-2/5" style={{ height: 26 }} />
          <div className="skel w-full" />
        </div>
      )}

      {violations && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
            <Panel className="flex flex-col gap-3 p-4">
              <div className="eyebrow">By severity</div>
              <div className="flex flex-col gap-2.5">
                {bySeverity.map((s) => (
                  <div key={s.severity}>
                    <div className="mb-1 flex justify-between text-[13px] capitalize">
                      <span>{s.severity}</span>
                      <span className="font-medium">{s.count}</span>
                    </div>
                    <div className="h-3.5" style={{ background: 'color-mix(in srgb, var(--color-text) 10%, transparent)' }}>
                      <div style={{ width: `${(s.count / maxBySeverity) * 100}%`, height: '100%', background: SEVERITY_BAR[s.severity] }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="flex flex-col gap-3 p-4">
              <div className="eyebrow">By violation type</div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                {byType.map((t) => (
                  <div key={t.type} className="flex items-center gap-2.5">
                    <span className="flex-1">{t.label}</span>
                    <span className="h-3 bg-accent" style={{ width: `${(t.count / maxByType) * 52}px` }} />
                    <span className="w-3.5 text-right font-medium">{t.count}</span>
                  </div>
                ))}
              </div>
              {worstOffender && (
                <div className="mt-auto border-t border-line pt-2 text-xs text-muted">
                  {worstOffender.ticketId} carries {worstOffender.flags.length} flag{worstOffender.flags.length === 1 ? '' : 's'}.
                </div>
              )}
            </Panel>

            {worstOffender && (
              <Panel className="flex flex-col gap-3 p-4" style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}>
                <div className="eyebrow text-accent-800">Worst offender</div>
                <div className="font-heading text-lg font-semibold leading-tight">
                  {worstOffender.ticketId} — {worstOffender.title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {worstOffender.flags.map((f, i) => (
                    <span key={i} className={`tag ${f.severity === 'high' ? 'tag-strong' : f.severity === 'medium' ? 'tag-accent' : 'tag-neutral'}`}>
                      {TYPE_LABELS[f.type]}
                    </span>
                  ))}
                </div>
                <p className="text-[13px] text-muted">Highest-risk ticket in this sprint by combined flag count and severity.</p>
              </Panel>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="tabs overflow-x-auto">
              {TABS.map((t) => (
                <button key={t.type} role="tab" aria-selected={typeFilter === t.type} className="tab" onClick={() => setTypeFilter(t.type)}>
                  {t.label}
                </button>
              ))}
            </div>
            <span className="lbl ml-auto">Sorted by severity, then age</span>
          </div>

          <Panel className="overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Violation</th>
                  <th>Detail</th>
                  <th>
                    <button onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))} className="flex items-center gap-1">
                      Severity {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-9 text-center text-muted">
                      No violations for this filter — clean sprint.
                    </td>
                  </tr>
                )}
                {visible.map((v, i) => (
                  <tr key={`${v.ticketId}-${v.type}-${i}`}>
                    <td className="font-medium">{v.ticketId}</td>
                    <td>{TYPE_LABELS[v.type]}</td>
                    <td className="text-muted">{v.detail}</td>
                    <td>
                      <SeverityBadge severity={v.severity} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </div>
  );
}
