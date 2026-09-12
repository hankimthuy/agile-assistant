'use client';

import { useRef, useState } from 'react';
import { Panel } from '@/components/Panel';
import { ColumnChart } from '@/components/charts';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_STALE_DAYS } from '@/lib/config';
import type { ImportFormat } from '@/lib/data/performance-import';
import type { PerformanceImportReport } from '@/lib/types';

// Four starting-point templates (matches the design mockup's template
// picker). Each `sample` is a small, realistic export in that tool's own
// column vocabulary — every column name below is one lib/data/performance-
// import.ts's ALIASES table already recognizes, so picking a template and
// hitting Analyze runs the same real, tool-agnostic parser/report
// functions every other path on this page uses. Azure Boards has no
// hardcoded sample here — it loads the bundled fixture
// (data/performance-import-sample.csv) via the existing GET
// /api/performance-import route, since that fixture is already in Azure's
// own export shape.
type Template = {
  id: string;
  format: ImportFormat;
  title: string;
  columns: string;
  sample: string | null;
};

const TEMPLATES: Template[] = [
  {
    id: 'jira',
    format: 'csv',
    title: 'Jira CSV',
    columns: 'Issue key · Issue Type · Status · Story point estimate · Assignee · Updated',
    sample: [
      'Issue key,Issue Type,Summary,Status,Story point estimate,Assignee,Sprint,Updated',
      'JIRA-201,Story,Set up SSO login,Done,5,Minh Anh,Sprint 24,2026-09-09',
      'JIRA-202,Task,Write onboarding runbook,In Progress,3,Huy Tran,Sprint 24,2026-08-30',
      'JIRA-203,Bug,Fix pagination off-by-one,Done,2,Lan Pham,Sprint 24,2026-09-10',
      'JIRA-204,Bug,Investigate flaky e2e test,To Do,3,Duc Nguyen,Sprint 24,2026-09-05',
      'JIRA-205,Task,Update API rate-limit docs,Done,1,Minh Anh,Sprint 24,2026-09-08',
    ].join('\n'),
  },
  {
    id: 'azure',
    format: 'csv',
    title: 'Azure Boards CSV',
    columns: 'ID · Work Item Type · State · Story Points · Assigned To · Changed Date',
    sample: null,
  },
  {
    id: 'trello',
    format: 'json',
    title: 'Trello JSON',
    columns: 'Card id/name · type (label) · status (list) · points · assignee · sprint',
    sample: JSON.stringify(
      [
        { id: 'TRELLO-31', name: 'Design empty-state illustration', type: 'Task', status: 'Done', points: 2, assignee: 'Lan Pham', sprint: 'Sprint 24' },
        { id: 'TRELLO-32', name: 'Wire up Trello board sync spike', type: 'Task', status: 'In Progress', points: 3, assignee: 'Huy Tran', sprint: 'Sprint 24' },
        { id: 'TRELLO-33', name: 'Card: broken image link on release notes', type: 'Bug', status: 'Done', points: 1, assignee: 'Duc Nguyen', sprint: 'Sprint 24' },
        { id: 'TRELLO-34', name: 'Draft customer changelog card template', type: 'Task', status: 'To Do', points: 2, assignee: 'Minh Anh', sprint: 'Sprint 24' },
        { id: 'TRELLO-35', name: 'Story: quick filters on the board', type: 'Story', status: 'In Progress', points: 5, assignee: 'Lan Pham', sprint: 'Sprint 24' },
      ],
      null,
      2
    ),
  },
  {
    id: 'excel',
    format: 'csv',
    title: 'Excel / Sheets',
    columns: 'Key · Title · Type · Status · Points · Owner · Updated (tab-separated paste)',
    sample: [
      'Key\tTitle\tType\tStatus\tPoints\tOwner\tUpdated',
      'XL-1\tRebuild pricing sheet macro\tTask\tDone\t3\tMinh Anh\t2026-09-09',
      'XL-2\tAudit shared drive permissions\tTask\tIn Progress\t2\tHuy Tran\t2026-08-30',
      'XL-3\tFix rounding error in cost calc\tBug\tDone\t1\tLan Pham\t2026-09-10',
      'XL-4\tBuild quarterly OKR tracker\tStory\tTo Do\t5\tDuc Nguyen\t2026-09-05',
      'XL-5\tClean up stale shared filters\tTask\tDone\t2\tMinh Anh\t2026-09-08',
    ].join('\n'),
  },
];

export default function PerformanceImportPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<ImportFormat>('csv');
  const [raw, setRaw] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [staleDays, setStaleDays] = useState(DEFAULT_STALE_DAYS);
  const [report, setReport] = useState<PerformanceImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  async function selectTemplate(template: Template) {
    setSelectedTemplate(template.id);
    setFormat(template.format);
    setReport(null);
    setError(null);

    if (template.sample !== null) {
      setRaw(template.sample);
      return;
    }

    // Azure Boards: the bundled fixture is already in Azure's export shape,
    // so pull it from the real sample endpoint instead of hardcoding a copy.
    setLoadingSample(true);
    try {
      const res = await fetch('/api/performance-import');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load sample data');
      setFormat(data.format);
      setRaw(data.raw);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load sample data', 'error');
    } finally {
      setLoadingSample(false);
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedTemplate(null);
      setRaw(String(reader.result ?? ''));
      if (file.name.toLowerCase().endsWith('.json')) setFormat('json');
      else setFormat('csv');
    };
    reader.readAsText(file);
  }

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/performance-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, raw, staleDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to process the import');
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process the import');
      setReport(null);
    } finally {
      setAnalyzing(false);
    }
  }

  const velocityByType = report
    ? Object.entries(report.velocity.byType)
        .filter(([, v]) => v.total > 0)
        .map(([type, v]) => ({ label: type.toUpperCase(), value: v.done }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{report ? `${report.sprintLabel} · ${report.velocity.totalItems} items imported` : 'Performance Import'}</div>
          <h1 className="mt-1 text-[28px] md:text-[32px]">Performance Import</h1>
        </div>
      </div>
      <p className="max-w-[90ch] text-sm text-muted">
        Paste or upload a sprint export — CSV, TSV (cells copied straight out of Excel/Google Sheets also work), or
        JSON — from Azure Boards, Jira, Trello, or any spreadsheet with the right columns. Nothing is sent anywhere —
        this only reads the text/file you give it.
      </p>

      <div className="flex flex-col gap-3">
        <div className="eyebrow">Start from a template — or paste your own export below</div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <Panel
              key={t.id}
              className="flex cursor-pointer flex-col gap-1.5 p-3.5"
              style={selectedTemplate === t.id ? { background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' } : undefined}
              onClick={() => selectTemplate(t)}
            >
              <div className="flex items-center gap-2">
                <span className="font-heading text-base font-semibold">{t.title}</span>
                {selectedTemplate === t.id && <span className="tag tag-strong ml-auto shrink-0">In use</span>}
              </div>
              <div className="text-xs text-muted">{t.columns}</div>
            </Panel>
          ))}
        </div>
      </div>

      <Panel className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3.5">
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
            Upload file…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          {loadingSample && <span className="flex items-center gap-2 text-xs text-muted"><span className="spinner" /> Loading sample…</span>}
          <label className="ml-auto flex items-center gap-2 text-sm">
            Stale after
            <input
              type="number"
              min={0}
              value={staleDays}
              onChange={(e) => setStaleDays(Math.max(0, Number(e.target.value) || 0))}
              className="input min-h-[32px] w-16"
            />
            days
          </label>
        </div>

        <textarea
          value={raw}
          onChange={(e) => {
            setSelectedTemplate(null);
            setRaw(e.target.value);
          }}
          placeholder={
            format === 'csv'
              ? 'Paste CSV/TSV rows here — e.g. ID, Title/Summary, Type, State/Status, Story Points/Estimate, Assignee/Owner, Sprint, ...'
              : 'Paste a JSON array of work items here'
          }
          rows={8}
          className="input font-mono text-xs"
        />

        <button onClick={analyze} disabled={analyzing || !raw.trim()} className="btn btn-primary self-start">
          {analyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </Panel>

      {error && <Panel className="p-3 text-sm">{error}</Panel>}

      {report && (
        <div className="flex flex-col gap-4">
          {report.warnings.length > 0 && (
            <Panel className="p-3 text-xs">
              <p className="font-medium text-accent-800">Data-quality notes</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted">
                {report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Panel>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Panel className="flex flex-col gap-3 p-4">
              <div className="eyebrow">Velocity</div>
              <div>
                <div className="metric">{report.velocity.velocity}</div>
                <div className="lbl mt-1">Points delivered · {Math.round(report.velocity.completionRate * 100)}% complete</div>
              </div>
              {velocityByType.length > 0 ? (
                <ColumnChart data={velocityByType} />
              ) : (
                <p className="text-xs text-muted">No work-item type data to chart.</p>
              )}
            </Panel>

            <Panel className="flex flex-col gap-3 p-4">
              <div className="eyebrow">Quality</div>
              <div>
                <div className="metric">{report.quality.totalBugs}</div>
                <div className="lbl mt-1">
                  Bugs in sprint · {report.quality.openBugs} open, {report.quality.closedBugs} closed
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[13px]">
                {(['closedBugs', 'openBugs'] as const).map((key) => {
                  const value = report.quality[key];
                  const total = report.quality.totalBugs || 1;
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between">
                        <span>{key === 'closedBugs' ? 'Closed' : 'Still open'}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                      <div className="h-3 bg-neutral-200" style={{ background: 'color-mix(in srgb, var(--color-text) 10%, transparent)' }}>
                        <div
                          style={{
                            width: `${(value / total) * 100}%`,
                            height: '100%',
                            background: key === 'closedBugs' ? 'var(--color-accent)' : 'var(--color-accent-900)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-line pt-2 text-xs text-muted">
                Bugs are {Math.round(report.quality.bugRatio * 100)}% of this sprint&apos;s items.
              </div>
            </Panel>

            <Panel className="flex flex-col gap-3 p-4">
              <div className="eyebrow">Workload by assignee</div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                {report.workload.byAssignee.map((a) => (
                  <div key={a.assignee}>
                    <div className="mb-1 flex justify-between">
                      <span>{a.assignee}</span>
                      <span className="lbl">{a.total} items</span>
                    </div>
                    <div className="flex h-3.5 border border-line">
                      <div style={{ width: `${(a.done / a.total) * 100}%`, background: 'var(--color-accent)' }} />
                      <div style={{ width: `${((a.total - a.done) / a.total) * 100}%`, background: 'var(--color-accent-300)' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3.5 pt-1 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: 'var(--color-accent)' }} /> Done
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: 'var(--color-accent-300)' }} /> Remaining
                </span>
              </div>
            </Panel>
          </div>

          {report.workload.staleItems.length > 0 && (
            <Panel className="flex flex-col gap-2 p-4">
              <div className="eyebrow">Stale items · {report.workload.headline}</div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {report.workload.staleItems.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>
                      {s.id} — {s.title}
                    </span>
                    <span className="shrink-0 text-muted">{s.daysSinceUpdate}d</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline gap-3">
              <div className="eyebrow">The {report.velocity.totalItems} rows behind these numbers</div>
              <span className="lbl ml-auto">Read from the file · nothing leaves this browser</span>
            </div>
            <Panel className="overflow-x-auto p-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="text-right">Points</th>
                    <th>Assignee</th>
                    <th className="text-right">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {report.workItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">
                        {item.id} — {item.title}
                      </td>
                      <td className="capitalize">{item.workItemType === 'other' ? item.rawWorkItemType : item.workItemType}</td>
                      <td>
                        <span className="tag tag-neutral capitalize">
                          {item.state === 'other' ? item.rawState : item.state.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-right">{item.storyPoints}</td>
                      <td>{item.assignedTo}</td>
                      <td className="text-right">{item.changedDate ?? item.createdDate ?? '—'}</td>
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
