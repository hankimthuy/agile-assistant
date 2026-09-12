'use client';

import { useEffect, useState } from 'react';
import { InfoBanner } from '@/components/InfoBanner';
import { OpsItemCard } from '@/components/OpsItemCard';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_APPROVAL_WARN_DAYS } from '@/lib/config';
import type { DelegationSuggestion, OpsItem } from '@/lib/types';

const GROUPS: { type: OpsItem['type']; label: string; blurb: string }[] = [
  { type: 'task', label: 'My Work', blurb: "Tasks that stay with you" },
  { type: 'delegatable', label: 'Delegatable', blurb: 'Could be handed off' },
  { type: 'pending_approval', label: 'Awaiting Approval', blurb: "Waiting on someone else" },
  { type: 'needs_email', label: 'Needs Reply', blurb: 'Messages with no response yet' },
];

export default function OpsHubPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<OpsItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, DelegationSuggestion>>({});
  const [delegatedIds, setDelegatedIds] = useState<Set<string>>(new Set());
  const [approvalWarnDays, setApprovalWarnDays] = useState(DEFAULT_APPROVAL_WARN_DAYS);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ops Hub</h1>
          <p className="text-sm text-gray-500">Everything on your plate, in one place.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Overdue-approval threshold
          <input
            type="number"
            min={0}
            value={approvalWarnDays}
            onChange={(e) => setApprovalWarnDays(Math.max(0, Number(e.target.value) || 0))}
            className="w-16 rounded border px-2 py-1"
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
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}{' '}
          <button onClick={load} className="underline">
            Retry
          </button>
        </div>
      )}

      {!error && !items && <p className="text-sm text-gray-500">Loading…</p>}

      {items && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {GROUPS.map((group) => {
            const groupItems = items.filter((i) => i.type === group.type);
            return (
              <div key={group.type} className="space-y-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {group.label} <span className="text-gray-400">({groupItems.length})</span>
                  </h2>
                  <p className="text-xs text-gray-400">{group.blurb}</p>
                </div>
                <div className="space-y-2">
                  {groupItems.length === 0 && <p className="text-xs text-gray-400">Nothing here.</p>}
                  {groupItems.map((item) => (
                    <OpsItemCard
                      key={item.id}
                      item={item}
                      suggestion={suggestions[item.id]}
                      approvalWarnDays={approvalWarnDays}
                      delegated={delegatedIds.has(item.id)}
                      onDelegate={() => handleDelegate(item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
