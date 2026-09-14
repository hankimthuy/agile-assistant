'use client';

import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/Panel';
import { CompletionDonut, PlannedVsDoneChart } from '@/components/charts';
import { useToast } from '@/components/ToastProvider';
import type { ReportResult, SprintData, TicketType } from '@/lib/types';

function firstSentences(text: string, count: number): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, count).join(' ');
}

const STATUS_STYLE: Record<string, string> = {
  done: 'tag-accent',
  in_progress: 'tag-outline',
  to_do: 'tag-neutral',
};

export default function ReportPage() {
  const { showToast } = useToast();
  const [sprintData, setSprintData] = useState<SprintData | null>(null);
  const [sprintError, setSprintError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [missingDocCount, setMissingDocCount] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadSprint();
  }, []);

  async function loadSprint() {
    setSprintError(null);
    try {
      const res = await fetch('/api/sprint');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load sprint data');
      setSprintData(data);
    } catch (err) {
      setSprintError(err instanceof Error ? err.message : 'Failed to load sprint data');
    }
  }

  async function generateReport() {
    setGenerating(true);
    try {
      const [reportRes, docLinksRes] = await Promise.all([
        fetch('/api/report', { method: 'POST' }),
        fetch('/api/doc-links'),
      ]);
      const reportData = await reportRes.json();
      if (!reportRes.ok) throw new Error(reportData.error ?? 'Failed to generate report');
      setReport(reportData);

      const docLinksData = await docLinksRes.json();
      setMissingDocCount(docLinksRes.ok ? docLinksData.missingDocTicketIds.length : 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  }

  // Builds the same summary the old "Send to Teams" webhook used to post —
  // sprint name, done/total, velocity, missing-doc count, narrative — as
  // plain text ready to paste into whatever channel the team already uses.
  function buildReportText(): string {
    if (!report) return '';
    const doneCount = sprintData?.tickets.filter((t) => t.status === 'done').length ?? 0;
    const totalCount = sprintData?.tickets.length ?? 0;
    const missingDocLine =
      missingDocCount > 0 ? ` ${missingDocCount} ticket${missingDocCount === 1 ? '' : 's'} missing documentation.` : '';
    return (
      `**${report.sprintName} — Automated Report**\n` +
      `${doneCount}/${totalCount} stories completed (velocity ${report.velocity} points). ` +
      `${firstSentences(report.narrative, 2)}${missingDocLine}\n\n${report.narrative}`
    );
  }

  async function copyReport() {
    await navigator.clipboard.writeText(buildReportText()).catch(() => {});
    showToast('Report copied — paste it wherever your team reads updates', 'success');
  }

  const byType = useMemo(() => {
    if (!sprintData) return [];
    const types: TicketType[] = ['story', 'task', 'bug'];
    return types
      .map((type) => {
        const tickets = sprintData.tickets.filter((t) => t.type === type);
        if (tickets.length === 0) return null;
        return {
          label: type,
          planned: tickets.reduce((sum, t) => sum + t.storyPoints, 0),
          done: tickets.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.storyPoints, 0),
        };
      })
      .filter((x): x is { label: TicketType; planned: number; done: number } => x !== null);
  }, [sprintData]);

  const openBugs = report?.openBugCount ?? 0;
  const closedBugs = report?.closedBugCount ?? 0;
  const bugTotal = openBugs + closedBugs;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">
            {sprintData ? `${sprintData.sprint.name} · ${sprintData.sprint.startDate} → ${sprintData.sprint.endDate}` : 'Loading sprint…'}
          </div>
          <h1 className="mt-1 text-[28px] md:text-[32px]">Auto Report</h1>
        </div>
        <div className="flex gap-2.5">
          <button onClick={loadSprint} className="btn btn-secondary">
            Refresh data
          </button>
          {report && (
            <button onClick={copyReport} className="btn btn-primary">
              Copy report
            </button>
          )}
        </div>
      </div>

      {sprintError && <Panel className="p-3 text-sm">{sprintError}</Panel>}

      {sprintData && !report && (
        <button onClick={generateReport} disabled={generating} className="btn btn-primary self-start px-5 py-2.5 text-[15px]">
          {generating ? 'Generating…' : 'Generate Report'}
        </button>
      )}

      {report && sprintData && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.5fr]">
            <Panel className="flex flex-col gap-3.5 p-[18px]">
              <div className="eyebrow">Completion</div>
              <div className="flex items-center gap-[18px]">
                <CompletionDonut pct={Math.round(report.completionRate * 100)} centerLabel={`${sprintData.tickets.filter((t) => t.status === 'done').length} OF ${sprintData.tickets.length} DONE`} />
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="metric">{report.velocity}</div>
                    <div className="lbl mt-1">Velocity (pts)</div>
                  </div>
                  <div>
                    <div className="metric-sm">{sprintData.tickets.filter((t) => t.status === 'in_progress').length}</div>
                    <div className="lbl mt-0.5">In progress</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5 border-t border-line pt-1.5">
                <div className="flex-1">
                  <div className="metric-sm">{openBugs}</div>
                  <div className="lbl mt-0.5">Open bugs</div>
                </div>
                <div className="flex-1">
                  <div className="metric-sm">{closedBugs}</div>
                  <div className="lbl mt-0.5">Closed bugs</div>
                </div>
                <div className="flex flex-1 flex-col justify-center">
                  <div className="flex h-3.5 border border-line">
                    <div style={{ width: `${bugTotal ? (closedBugs / bugTotal) * 100 : 0}%`, background: 'var(--color-accent)' }} />
                    <div
                      style={{
                        width: `${bugTotal ? (openBugs / bugTotal) * 100 : 100}%`,
                        background: 'color-mix(in srgb, var(--color-text) 12%, transparent)',
                      }}
                    />
                  </div>
                  <div className="lbl mt-1">Closed / open split</div>
                </div>
              </div>
            </Panel>

            <Panel className="flex flex-col gap-3 p-[18px]">
              <div className="flex items-baseline justify-between">
                <div className="eyebrow">Points delivered by work-item type</div>
                <div className="lbl">Planned vs done</div>
              </div>
              {byType.length > 0 ? (
                <>
                  <PlannedVsDoneChart data={byType} />
                  <div className="flex gap-[18px] text-[11px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3" style={{ background: 'var(--color-accent)' }} /> Delivered
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 border border-dashed" style={{ borderColor: 'var(--color-accent)' }} /> Planned
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">No tickets to chart.</p>
              )}
            </Panel>
          </div>

          <Panel className="flex flex-col gap-2.5 p-[18px]">
            <div className="flex items-center justify-between">
              <div className="eyebrow">Sprint narrative</div>
              <span className="tag tag-neutral">{report.generatedByLLM ? 'Generated by Gemini' : 'Drafted from template · no API key set'}</span>
            </div>
            <p className="max-w-[88ch] text-base leading-relaxed">{report.narrative}</p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button onClick={copyReport} className="btn btn-primary">
                Copy report
              </button>
              <button onClick={generateReport} disabled={generating} className="btn btn-secondary">
                Regenerate
              </button>
            </div>
          </Panel>
        </>
      )}

      {sprintData && (
        <Panel className="overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Points</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {sprintData.tickets.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">
                    {t.id} — {t.title}
                  </td>
                  <td>
                    <span className="tag tag-neutral capitalize">{t.type}</span>
                  </td>
                  <td>
                    <span className={`tag capitalize ${STATUS_STYLE[t.status]}`}>{t.status.replace('_', ' ')}</span>
                  </td>
                  <td className="text-right">{t.storyPoints}</td>
                  <td>{t.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
