'use client';

import { useEffect, useMemo, useState } from 'react';
import { SeverityBadge } from '@/components/Badge';
import { DEFAULT_STALE_DAYS } from '@/lib/config';
import type { ProcessHealthViolation, ViolationType } from '@/lib/types';

const TYPE_LABELS: Record<ViolationType, string> = {
  missing_acceptance_criteria: 'Missing acceptance criteria',
  missing_documentation: 'Missing documentation',
  stale: 'Stale',
};

const SEVERITY_RANK: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Process Health</h1>
        <p className="text-sm text-gray-500">Tickets that violate baseline process hygiene.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <label className="flex items-center gap-2">
          Stale after
          <input
            type="number"
            min={0}
            value={staleDays}
            onChange={(e) => setStaleDays(Math.max(0, Number(e.target.value) || 0))}
            className="w-16 rounded border px-2 py-1"
          />
          days
        </label>
        <label className="flex items-center gap-2">
          Violation type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ViolationType | 'all')}
            className="rounded border px-2 py-1"
          >
            <option value="all">All</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {!error && !violations && <p className="text-sm text-gray-500">Loading…</p>}

      {violations && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Ticket</th>
                <th className="px-3 py-2">Violation</th>
                <th className="px-3 py-2">Detail</th>
                <th className="px-3 py-2">
                  <button
                    onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                    className="flex items-center gap-1"
                  >
                    Severity {sortDir === 'desc' ? '↓' : '↑'}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    No violations for this filter — clean sprint.
                  </td>
                </tr>
              )}
              {visible.map((v, i) => (
                <tr key={`${v.ticketId}-${v.type}-${i}`} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {v.ticketId} — {v.ticketTitle}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{TYPE_LABELS[v.type]}</td>
                  <td className="px-3 py-2 text-gray-500">{v.detail}</td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={v.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
