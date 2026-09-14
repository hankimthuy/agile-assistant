import Link from 'next/link';
import { loadSprintData } from '@/lib/data/jira';
import { computeSprintMetrics } from '@/lib/metrics';
import { computeProcessHealth } from '@/lib/process-health';
import { matchTicketsToDocs } from '@/lib/llm/match-docs';
import { loadDocsData } from '@/lib/data/confluence';
import { DEFAULT_STALE_DAYS, DEFAULT_APPROVAL_WARN_DAYS, daysSince } from '@/lib/config';
import { loadOpsInboxData } from '@/lib/data/ops-inbox';
import { Panel } from '@/components/Panel';

// Public marketing page (new — no direct predecessor in the POC). The
// "inside the app" preview strip below pulls real numbers straight from
// the same fixture data and functions every other screen uses
// (lib/metrics.ts, lib/process-health.ts), rather than inventing figures.
export default async function LandingPage() {
  const [sprintData, docsData, opsInboxData] = await Promise.all([
    loadSprintData(),
    loadDocsData(),
    loadOpsInboxData(),
  ]);
  const metrics = computeSprintMetrics(sprintData);
  const docLinks = matchTicketsToDocs(sprintData, docsData.pages);
  const violations = computeProcessHealth(sprintData, docLinks, DEFAULT_STALE_DAYS);
  const overdueApprovals = opsInboxData.items.filter(
    (i) => i.type === 'pending_approval' && i.sentDate && daysSince(i.sentDate) > DEFAULT_APPROVAL_WARN_DAYS
  ).length;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex flex-wrap items-center gap-6 border-b border-line px-6 py-4 md:px-11">
        <span className="font-heading text-lg font-semibold tracking-wide">AGILECOPILOT</span>
        <nav className="ml-3 hidden gap-5 text-sm sm:flex">
          <a href="#how-it-works">How it works</a>
          <a href="#inside-the-app">Inside the app</a>
          <Link href="/overview">Docs</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <Link href="/overview" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/performance-import" className="btn btn-primary">
            Start free
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 items-start gap-8 px-6 py-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:px-11 md:py-14">
        <div className="flex flex-col gap-5">
          <span className="tag tag-outline self-start">
            For Scrum Masters &amp; Product Owners · no live tool connection required
          </span>
          <h1 className="text-[38px] leading-[0.98] tracking-tight md:text-[56px]">
            The sprint update everyone needs, without the meeting.
          </h1>
          <p className="max-w-[52ch] text-base leading-relaxed text-muted md:text-lg">
            AgileCopilot reads your sprint export and your inbox, then turns it into what a Scrum Master needs to
            act on today — overdue approvals, ticket hygiene, who could take what — and what a Product Owner needs
            to know this sprint, without asking anyone. It drafts. You decide.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/performance-import" className="btn btn-primary px-5 py-2.5 text-[15px]">
              Import a sprint export
            </Link>
            <Link href="/report" className="btn btn-secondary px-5 py-2.5 text-[15px]">
              See a sample report
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-6 border-t border-line pt-3">
            <div>
              <div className="metric-sm">CSV · TSV · JSON</div>
              <div className="lbl mt-1">Any export</div>
            </div>
            <div>
              <div className="metric-sm">Jira · Azure · Trello</div>
              <div className="lbl mt-1">Where it comes from</div>
            </div>
            <div>
              <div className="metric-sm">0</div>
              <div className="lbl mt-1">Messages sent for you</div>
            </div>
          </div>
        </div>

        <Panel className="flex h-[280px] items-center justify-center bg-surface text-center md:h-[420px]" style={{ overflow: 'visible' }}>
          <div className="max-w-[26ch] px-6 text-sm text-muted">
            Hero photograph — a sprint board mid-review, or an empty planning room.
          </div>
        </Panel>
      </section>

      <section id="how-it-works" className="px-6 pb-12 md:px-11">
        <Panel className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 border-b border-line p-6 md:border-r lg:border-b-0">
            <span className="tag tag-neutral self-start text-[10px]">For Scrum Masters</span>
            <div className="eyebrow text-accent">01 — Triage</div>
            <h3 className="text-xl">One inbox, four verdicts</h3>
            <p className="text-sm text-muted">
              Tasks, approvals and unanswered messages land in one place, each labelled keep, delegate, chase or
              reply.
            </p>
          </div>
          <div className="flex flex-col gap-2 border-b border-line p-6 lg:border-r lg:border-b-0">
            <span className="tag tag-neutral self-start text-[10px]">For Scrum Masters</span>
            <div className="eyebrow text-accent">02 — Draft</div>
            <h3 className="text-xl">Reminders and delegation, written</h3>
            <p className="text-sm text-muted">
              Nudge emails and delegation notes arrive pre-written, in your voice, never sent automatically.
            </p>
          </div>
          <div className="flex flex-col gap-2 border-b border-line p-6 md:border-r lg:border-b-0">
            <span className="tag tag-accent self-start text-[10px]">For both</span>
            <div className="eyebrow text-accent">03 — Report</div>
            <h3 className="text-xl">Sprint narrative, ready to send</h3>
            <p className="text-sm text-muted">
              The Scrum Master gets it pre-written; the Product Owner gets the outcome — velocity, scope changes,
              what shipped — without asking.
            </p>
          </div>
          <div className="flex flex-col gap-2 p-6">
            <span className="tag tag-accent self-start text-[10px]">For both</span>
            <div className="eyebrow text-accent">04 — Audit</div>
            <h3 className="text-xl">Process hygiene, measured</h3>
            <p className="text-sm text-muted">
              Missing acceptance criteria, undocumented tickets and stale work surface ranked by severity, not
              alphabetically.
            </p>
          </div>
        </Panel>
      </section>

      <section id="inside-the-app" className="px-6 pb-14 md:px-11">
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Inside the app</div>
            <h2 className="mt-1 text-2xl md:text-[28px]">
              {sprintData.sprint.name}, as AgileCopilot sees it
            </h2>
          </div>
          <Link href="/overview" className="font-heading text-sm font-semibold">
            Take the tour →
          </Link>
        </div>
        <Panel className="grid grid-cols-2 gap-4 bg-surface p-4 md:grid-cols-4">
          <Panel className="bg-bg p-4">
            <div className="metric">{metrics.velocity}</div>
            <div className="lbl mt-1.5">Velocity (pts)</div>
          </Panel>
          <Panel className="bg-bg p-4">
            <div className="metric">
              {Math.round(metrics.completionRate * 100)}
              <span className="text-lg">%</span>
            </div>
            <div className="lbl mt-1.5">Completion</div>
          </Panel>
          <Panel className="bg-bg p-4">
            <div className="metric">{violations.length}</div>
            <div className="lbl mt-1.5">Hygiene flags</div>
          </Panel>
          <Panel className="bg-bg p-4">
            <div className="metric">{overdueApprovals}</div>
            <div className="lbl mt-1.5">Overdue approval{overdueApprovals === 1 ? '' : 's'}</div>
          </Panel>
        </Panel>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-6 md:px-11">
        <span className="font-heading text-base font-semibold">AGILECOPILOT</span>
        <div className="flex gap-5 text-[13px] text-muted">
          <span>Privacy</span>
          <span>Security</span>
          <span>Changelog</span>
          <span>Contact</span>
        </div>
      </footer>
    </div>
  );
}
