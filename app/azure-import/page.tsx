'use client';

import { useRef, useState } from 'react';
import { StatTile } from '@/components/StatTile';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_STALE_DAYS } from '@/lib/config';
import type { AzureImportFormat } from '@/lib/data/azure';
import type { AzureImportReport } from '@/lib/types';

export default function AzureImportPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<AzureImportFormat>('csv');
  const [raw, setRaw] = useState('');
  const [staleDays, setStaleDays] = useState(DEFAULT_STALE_DAYS);
  const [report, setReport] = useState<AzureImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  async function loadSample() {
    setLoadingSample(true);
    try {
      const res = await fetch('/api/azure-import');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load sample data');
      setFormat(data.format);
      setRaw(data.raw);
      showToast('Sample Azure export loaded — click Analyze', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load sample data', 'error');
    } finally {
      setLoadingSample(false);
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setRaw(String(reader.result ?? ''));
      if (file.name.toLowerCase().endsWith('.json')) setFormat('json');
      else if (file.name.toLowerCase().endsWith('.csv')) setFormat('csv');
    };
    reader.readAsText(file);
  }

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/azure-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, raw, staleDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to process the Azure import');
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process the Azure import');
      setReport(null);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Azure Import</h1>
        <p className="text-sm text-gray-500">
          Paste or upload a JSON/CSV export from an Azure Boards query for one sprint. Nothing is sent to Azure
          DevOps — this only reads the text you give it.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1 rounded border p-0.5">
            {(['csv', 'json'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded px-3 py-1 text-sm font-medium uppercase ${
                  format === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Upload file…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />

          <button
            onClick={loadSample}
            disabled={loadingSample}
            className="rounded border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingSample ? 'Loading…' : 'Load sample data'}
          </button>

          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
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
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={
            format === 'csv'
              ? 'Paste CSV rows here (ID, Work Item Type, Title, State, Story Points, Assigned To, Iteration Path, ...)'
              : 'Paste a JSON array of work items here'
          }
          rows={8}
          className="w-full rounded border p-2 font-mono text-xs text-gray-800"
        />

        <button
          onClick={analyze}
          disabled={analyzing || !raw.trim()}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {analyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {report && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{report.sprintLabel}</p>

          {report.warnings.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-medium">Data-quality notes</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="space-y-2 rounded-lg border bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Velocity &amp; Completion</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Velocity (points)" value={report.velocity.velocity} />
              <StatTile label="Completion rate" value={`${Math.round(report.velocity.completionRate * 100)}%`} />
              <StatTile label="Total items" value={report.velocity.totalItems} />
              <StatTile label="Done items" value={report.velocity.doneItems} />
            </div>
            <p className="text-sm text-gray-700">{report.velocity.headline}</p>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-2 py-1.5">Type</th>
                  <th className="px-2 py-1.5">Total</th>
                  <th className="px-2 py-1.5">Done</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.velocity.byType).map(([type, counts]) => (
                  <tr key={type} className="border-b last:border-0">
                    <td className="px-2 py-1.5 capitalize text-gray-900">{type}</td>
                    <td className="px-2 py-1.5 text-gray-600">{counts.total}</td>
                    <td className="px-2 py-1.5 text-gray-600">{counts.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="space-y-2 rounded-lg border bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Quality &amp; Bug Health</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Total bugs" value={report.quality.totalBugs} />
              <StatTile label="Open bugs" value={report.quality.openBugs} />
              <StatTile label="Closed bugs" value={report.quality.closedBugs} />
              <StatTile label="Bug ratio" value={`${Math.round(report.quality.bugRatio * 100)}%`} />
            </div>
            <p className="text-sm text-gray-700">{report.quality.headline}</p>
            {report.quality.hasSeverityData ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-1.5">Severity</th>
                    <th className="px-2 py-1.5">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {report.quality.bySeverity.map((s) => (
                    <tr key={s.severity} className="border-b last:border-0">
                      <td className="px-2 py-1.5 text-gray-900">{s.severity}</td>
                      <td className="px-2 py-1.5 text-gray-600">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400">Severity column not found in this export.</p>
            )}
          </section>

          <section className="space-y-2 rounded-lg border bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Workload &amp; Aging</h2>
            <p className="text-sm text-gray-700">{report.workload.headline}</p>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-2 py-1.5">Assignee</th>
                  <th className="px-2 py-1.5">Total</th>
                  <th className="px-2 py-1.5">Done</th>
                </tr>
              </thead>
              <tbody>
                {report.workload.byAssignee.map((a) => (
                  <tr key={a.assignee} className="border-b last:border-0">
                    <td className="px-2 py-1.5 text-gray-900">{a.assignee}</td>
                    <td className="px-2 py-1.5 text-gray-600">{a.total}</td>
                    <td className="px-2 py-1.5 text-gray-600">{a.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.workload.staleItems.length > 0 && (
              <div>
                <p className="mt-2 text-xs font-medium uppercase text-gray-500">Stale items</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {report.workload.staleItems.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="text-gray-900">
                        {s.id} — {s.title}
                      </span>
                      <span className="shrink-0 text-gray-500">{s.daysSinceUpdate}d</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
