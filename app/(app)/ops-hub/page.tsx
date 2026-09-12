'use client';

import { useEffect, useMemo, useState } from 'react';
import { InfoBanner } from '@/components/InfoBanner';
import { OpsItemCard } from '@/components/OpsItemCard';
import { Panel } from '@/components/Panel';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_APPROVAL_WARN_DAYS } from '@/lib/config';
import type { DelegationSuggestion, OpsItem } from '@/lib/types';

const TABS: { type: OpsItem['type'] | 'all'; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'task', label: 'My Work' },
  { type: 'delegatable', label: 'Delegatable' },
  { type: 'pending_approval', label: 'Awaiting Approval' },
  { type: 'needs_email', label: 'Needs Reply' },
];

export default function OpsHubPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<OpsItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, DelegationSuggestion>>({});
  const [delegatedIds, setDelegatedIds] = useState<Set<string>>(new Set());
  const [approvalWarnDays, setApprovalWarnDays] = useState(DEFAULT_APPROVAL_WARN_DAYS);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OpsItem['type'] | 'all'>('all');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    setItems(null);
    try {
      const [inboxRes, delegateRes] = await Promise.all([fetch('/api/ops-inbox'), fetch('/api/delegate')]);
      const inboxData = await inboxRes.json();
      if (!inboxRes.ok) throw new Error(inboxData.error ?? 'Failed to load the ops inbox');
      const delegateData = await delegateRes.json();
      if (!delegateRes.ok) throw new Error(delegateData.error ?? 'Failed to load delegation suggestions');

      setItems(inboxData.items);
      const byId: Record<string, DelegationSuggestion> = {};
      for (const s of delegateData.suggestions as DelegationSuggestion[]) byId[s.itemId] = s;
      setSuggestions(byId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading the Ops Hub');
    }
  }

  function handleDelegate(itemId: string) {
    setDelegatedIds((prev) => new Set(prev).add(itemId));
    showToast('Marked as delegated (local to this session)', 'success');
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items?.length ?? 0 };
    for (const t of TABS) if (t.type !== 'all') c[t.type] = items?.filter((i) => i.type === t.type).length ?? 0;
    return c;
  }, [items]);

  const visible = useMemo(() => {
    if (!items) return [];
    return activeTab === 'all' ? items : items.filter((i) => i.type === activeTab);
  }, [items, activeTab]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{items ? `${items.length} open items` : 'Ops Hub'}</div>
          <h1 className="mt-1 text-[28px] md:text-[32px]">Ops Hub</h1>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Overdue after
          <input
            type="number"
            min={0}
            value={approvalWarnDays}
            onChange={(e) => setApprovalWarnDays(Math.max(0, Number(e.target.value) || 0))}
            className="input min-h-[32px] w-16"
          />
          days
        </label>
      </div>

      <InfoBanner
        title="New: Performance Import."
        body="Paste or upload a CSV, TSV (straight from Excel/Sheets), or JSON export for your sprint — from Azure Boards, Jira, Trello, or any spreadsheet with the right columns — to get an instant Velocity, Quality, and Workload snapshot. No live connection to any tool required."
        linkHref="/performance-import"
        linkLabel="Try Performance Import →"
      />

      {error && (
        <Panel className="p-3 text-sm">
          {error}{' '}
          <button onClick={load} className="btn btn-ghost underline">
            Retry
          </button>
        </Panel>
      )}

      {!error && !items && (
        <div className="flex flex-col gap-3">
          <div className="skel w-2/5" style={{ height: 26 }} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Panel key={i} className="p-3.5">
                <div className="skel mb-2 w-3/5" style={{ height: 20 }} />
                <div className="skel w-full" />
              </Panel>
            ))}
          </div>
        </div>
      )}

      {items && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="tabs overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.type}
                  role="tab"
                  aria-selected={activeTab === t.type}
                  className="tab"
                  onClick={() => setActiveTab(t.type)}
                >
                  {t.label} {counts[t.type]}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <Panel className="flex flex-col items-center gap-2 border-dashed p-9 text-center">
              <div className="font-heading text-lg font-semibold">Nothing here for this filter</div>
              <p className="text-sm text-muted">Everything in this group has been handled.</p>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-2">
              {visible.map((item) => (
                <OpsItemCard
                  key={item.id}
                  item={item}
                  suggestion={suggestions[item.id]}
                  approvalWarnDays={approvalWarnDays}
                  delegated={delegatedIds.has(item.id)}
                  onDelegate={() => handleDelegate(item.id)}
                  wide={item.type === 'needs_email'}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
