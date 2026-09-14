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
// (lib/metrics.ts, lib/process-health.ts), rather than inventing figures —
// including the Scrum Master / Product Owner split, which is the same one
// ops-inbox + sprint read shown two ways, not two separate data pulls.
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
  const opsCounts = {
    myWork: opsInboxData.items.filter((i) => i.type === 'task').length,
    delegatable: opsInboxData.items.filter((i) => i.type === 'delegatable').length,
    awaitingApproval: opsInboxData.items.filter((i) => i.type === 'pending_approval').length,
    needsReply: opsInboxData.items.filter((i) => i.type === 'needs_email').length,
  };

  const loopRows = [
    {
      before: '"What actually shipped, and did it matter?" — the Product Owner asks the Scrum Master directly.',
      after: 'The Product Owner opens Report. Same velocity, same narrative the Scrum Master already trusts — no message sent.',
    },
    {
      before: 'A missing acceptance criterion surfaces for the first time in sprint review, in front of stakeholders.',
      after: "Process Health flags it the moment the sprint data refreshes — days before review, for both to see.",
    },
    {
      before: 'The Scrum Master re-explains the same status: once to the Product Owner, again to a stakeholder, again at retro.',
      after: 'One narrative, one place. Everyone reads the same sprint truth on their own schedule.',
    },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex flex-wrap items-center gap-6 border-b border-line px-6 py-4 md:px-11">
        <span className="font-heading text-lg font-semibold tracking-wide">AGILECOPILOT</span>
        <nav className="ml-3 hidden gap-5 text-sm sm:flex">
          <a href="#the-loop">Why it&apos;s different</a>
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

      <section className="flex flex-col items-start gap-5 px-6 py-10 md:px-11 md:py-14">
        <span className="tag tag-outline self-start">
          For Scrum Masters &amp; Product Owners · one read, two views — never out of sync
        </span>
        <h1 className="max-w-[26ch] text-[38px] leading-[0.98] tracking-tight md:text-[56px]">
          The Product Owner reads the outcome. The Scrum Master writes it once.
        </h1>
        <p className="max-w-[62ch] text-base leading-relaxed text-muted md:text-lg">
          AgileCopilot reads your sprint export and ops inbox once. The Scrum Master triages the day&apos;s work and
          gets AI-suggested delegation and AI-drafted replies, ready to send. The Product Owner reads an AI-written
          sprint narrative and rule-checked hygiene flags straight from the same read, on their own schedule. It
          drafts. You decide.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/ops-hub" className="btn btn-primary px-5 py-2.5 text-[15px]">
            See the Scrum Master&apos;s view
          </Link>
          <Link href="/report" className="btn btn-secondary px-5 py-2.5 text-[15px]">
            See the Product Owner&apos;s view
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-6 border-t border-line pt-3">
          <div>
            <div className="metric-sm">1 read</div>
            <div className="lbl mt-1">Feeds both views, always in sync</div>
          </div>
          <div>
            <div className="metric-sm">0</div>
            <div className="lbl mt-1">Status meetings to reconcile the numbers</div>
          </div>
          <div>
            <div className="metric-sm">2 views</div>
            <div className="lbl mt-1">Ops Hub &amp; Report, one source</div>
          </div>
        </div>
      </section>

      <section id="the-loop" className="px-6 pb-12 md:px-11">
        <div className="mb-3.5 max-w-[62ch]">
          <div className="eyebrow text-accent">Why &quot;auto-generate a report&quot; isn&apos;t the point</div>
          <h2 className="mt-1 text-2xl md:text-[28px]">
            Today the Scrum Master is the Product Owner&apos;s status API. AgileCopilot replaces the API call with a
            shared read.
          </h2>
        </div>
        <Panel className="divide-y divide-line">
          {loopRows.map((row) => (
            <div
              key={row.before}
              className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6"
            >
              <div>
                <div className="lbl text-muted">Today</div>
                <p className="mt-1 text-sm">{row.before}</p>
              </div>
              <div className="hidden text-muted md:block" aria-hidden="true">
                →
              </div>
              <div>
                <div className="lbl text-accent">With AgileCopilot</div>
                <p className="mt-1 text-sm">{row.after}</p>
              </div>
            </div>
          ))}
        </Panel>
      </section>

      <section id="how-it-works" className="px-6 pb-12 md:px-11">
        <div className="mb-3.5 max-w-[62ch]">
          <div className="eyebrow">How it works</div>
          <h2 className="mt-1 text-2xl md:text-[28px]">One data pull. Two views that never drift apart.</h2>
          <p className="mt-1.5 text-sm text-muted">
            Gemini writes the narrative and drafts your replies; fixed rules keep hygiene checks and doc-matching
            predictable. Each step below says which is which.
          </p>
        </div>
        <Panel className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 border-b border-line p-6 md:border-r lg:border-b-0">
            <div className="flex flex-wrap gap-1.5">
              <span className="tag tag-neutral self-start text-[10px]">For Scrum Masters</span>
              <span className="tag tag-outline self-start text-[10px]">Rule-based</span>
            </div>
            <div className="eyebrow text-accent">01 — Triage</div>
            <h3 className="text-xl">One inbox, four verdicts</h3>
            <p className="text-sm text-muted">
              Tasks, approvals and unanswered messages land in one place, each sorted by source into keep, delegate,
              chase or reply — no AI needed to read what a task already is.
            </p>
          </div>
          <div className="flex flex-col gap-2 border-b border-line p-6 lg:border-r lg:border-b-0">
            <div className="flex flex-wrap gap-1.5">
              <span className="tag tag-neutral self-start text-[10px]">For Scrum Masters</span>
              <span className="tag tag-accent self-start text-[10px]">AI-written</span>
            </div>
            <div className="eyebrow text-accent">02 — Draft</div>
            <h3 className="text-xl">Reminders and delegation, AI-drafted</h3>
            <p className="text-sm text-muted">
              For each delegatable item, AI decides keep-or-delegate with a one-line reason, then drafts the nudge
              email or delegation note in your voice — never sent automatically.
            </p>
          </div>
          <div className="flex flex-col gap-2 border-b border-line p-6 md:border-r lg:border-b-0">
            <div className="flex flex-wrap gap-1.5">
              <span className="tag tag-neutral self-start text-[10px]">For Scrum Masters</span>
              <span className="tag tag-neutral self-start text-[10px]">For Product Owners</span>
              <span className="tag tag-accent self-start text-[10px]">AI-written</span>
            </div>
            <div className="eyebrow text-accent">03 — Report</div>
            <h3 className="text-xl">Sprint narrative, ready to send</h3>
            <p className="text-sm text-muted">
              Gemini writes the narrative from the same sprint data; the Product Owner reads the outcome straight
              from it — velocity, scope changes, what shipped.
            </p>
          </div>
          <div className="flex flex-col gap-2 p-6">
            <div className="flex flex-wrap gap-1.5">
              <span className="tag tag-neutral self-start text-[10px]">For Scrum Masters</span>
              <span className="tag tag-neutral self-start text-[10px]">For Product Owners</span>
              <span className="tag tag-outline self-start text-[10px]">Rule-based</span>
            </div>
            <div className="eyebrow text-accent">04 — Audit</div>
            <h3 className="text-xl">Process hygiene, measured</h3>
            <p className="text-sm text-muted">
              Missing acceptance criteria, undocumented tickets and stale work surface ranked by severity, not
              alphabetically — for whoever&apos;s backlog it is.
            </p>
          </div>
        </Panel>
      </section>

      <section id="inside-the-app" className="px-6 pb-14 md:px-11">
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Inside the app</div>
            <h2 className="mt-1 text-2xl md:text-[28px]">
              {sprintData.sprint.name}, read once — shown two ways
            </h2>
            <p className="mt-1.5 max-w-[56ch] text-sm text-muted">
              Same sprint export, same ops inbox. No separate pull for either side, so the numbers can&apos;t drift
              apart.
            </p>
          </div>
          <Link href="/overview" className="font-heading text-sm font-semibold">
            Take the tour →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel className="bg-surface p-4">
            <span className="tag tag-neutral self-start text-[10px]">What the Scrum Master sees — Ops Hub</span>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Panel className="bg-bg p-4">
                <div className="metric">{opsCounts.myWork}</div>
                <div className="lbl mt-1.5">My work</div>
              </Panel>
              <Panel className="bg-bg p-4">
                <div className="metric">{opsCounts.delegatable}</div>
                <div className="lbl mt-1.5">Delegatable</div>
              </Panel>
              <Panel className="bg-bg p-4">
                <div className="metric">{opsCounts.awaitingApproval}</div>
                <div className="lbl mt-1.5">
                  Awaiting approval{overdueApprovals > 0 ? ` (${overdueApprovals} overdue)` : ''}
                </div>
              </Panel>
              <Panel className="bg-bg p-4">
                <div className="metric">{opsCounts.needsReply}</div>
                <div className="lbl mt-1.5">Needs reply</div>
              </Panel>
            </div>
          </Panel>
          <Panel className="bg-surface p-4">
            <span className="tag tag-accent self-start text-[10px]">What the Product Owner sees — Report</span>
            <div className="mt-3 grid grid-cols-2 gap-4">
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
                <div className="metric">{docLinks.missingDocTicketIds.length}</div>
                <div className="lbl mt-1.5">Missing docs</div>
              </Panel>
            </div>
          </Panel>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-6 md:px-11">
        <span className="font-heading text-base font-semibold">AGILECOPILOT</span>
        <span className="text-[13px] text-muted">A proof of concept — no data leaves your browser without you sending it.</span>
      </footer>
    </div>
  );
}
