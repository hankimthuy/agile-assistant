# AgileCopilot — Product Specification (POC v1)

> This file is the full technical spec meant to be fed directly into an AI coding tool (Claude Code, Cursor, etc.) to start building. The BMAD/SDLC content in Section 9 is **process discipline for building something of lasting value** (see Section 9); everything in Sections 1–8 is **the real product problem** — independent of which method is used to build it.
>
> **Context note:** this POC is being built to pitch **internally** (to stakeholders/employer), on a one-week timeline. The framing below ("market gap," "opportunity") should be read as *an internal capability gap the team already feels*, not a fundraising narrative — the goal of the pitch is to show a working, credible slice of the product, not just a vision.

---

## 1. Vision

Turn "reporting progress & keeping documentation tidy" from a Scrum Master's manual operational burden into an automated, always-current, background process — so the business value that PMs/POs need to see stops getting buried in manual busywork.

**The core problem:** the market currently has 3 groups of tools, each solving one disconnected slice of the Agile process:

| Group | Examples | Strong at | Gap |
|---|---|---|---|
| Engineering intelligence | Faros AI, Jellyfish, LinearB, DX | Measuring velocity, DORA metrics, AI usage cost | Not tied to documentation or business narrative; cross-team coordination is still manual |
| Knowledge / documentation | Confluence, GitBook, ONES, Document360 | Versioned storage, AI search | Disconnected from the sprint/ticket in flight → documentation easily becomes a "graveyard" |
| Process / compliance | Jira workflows, manual checklists | Can define a standard process | Nobody continuously monitors compliance; drift only surfaces once it's already too late |

**The opportunity:** don't rebuild Jira/Confluence — build the *connective layer* between them, where closing a ticket automatically generates a business-meaningful report, automatically links the right documentation, and automatically flags process steps that were skipped.

---

## 2. Personas

AgileCopilot serves two co-equal operator personas — a Scrum Master and a Product Owner both open the app directly, each for the parts of it that answer their own job. Neither is a passive report recipient; a Teams notification is a convenience on top of the app, not the primary way either persona uses it.

### 2.1 Scrum Master — persona (operator)

- **Who they are:** running 1–2 concurrent sprints, responsible for process operations (ceremonies, impediments, Definition of Done).
- **Current pain points:** spends 2–3 hours at the end of every sprint gathering data from Jira/Confluence/Teams to write a report; constantly has to dig up "where is this document, who wrote it, is it still accurate"; on top of that, ends up holding onto work that could be delegated to someone else, forgets to reply to emails/messages that are waiting, and loses track of what's stuck waiting on someone's approval — they become the bottleneck for the whole team.
- **Jobs-to-be-done:** "When the sprint ends, I want a trustworthy report with all the relevant documentation attached immediately, so I don't have to compile it by hand." + "I want one place that shows everything on my plate — what I have to do myself, what can be delegated, what's waiting on approval, which emails are unanswered — so I'm not the bottleneck myself."
- **How they measure success:** report creation time drops from hours to under 5 minutes; no longer has to answer "where's document X" from memory; nothing gets forgotten because it's scattered across too many places.
- **How they interact with the product:** the person who runs the day-to-day operation of the app — Ops Hub is their home screen, they click "Generate Report," and they handle process-health alerts.

### 2.2 Product Owner — persona (operator)

- **Who they are:** owns the backlog and the sprint's outcome — prioritization, acceptance criteria, stakeholder value — without running the ceremonies themselves.
- **Current pain points:** has to ask the Scrum Master to find out whether progress is actually creating business value; the reports they get are usually dry numbers with no context; backlog hygiene problems (missing acceptance criteria, tickets going stale) usually only surface once they've already become a sprint-review surprise.
- **Jobs-to-be-done:** "I want to know what business value the last sprint created, without having to ask anyone." + "I want to catch backlog hygiene issues on my own tickets before review, not after."
- **How they measure success:** reading one report is enough to understand business value immediately, with no follow-up meeting needed to explain it; hygiene gaps in their backlog surface with time to fix them, not as a surprise.
- **How they interact with the product:** opens AgileCopilot directly to read Auto Report and check Performance Import (velocity/quality trend) and Process Health (acceptance-criteria gaps); does not use Ops Hub's day-to-day triage — that stays the Scrum Master's tool. Also receives the automatic Auto Report summary via Teams as a convenience.

> **Design note:** every functional requirement in Section 5 is labeled with the persona(s) it serves — "Scrum Master," "Product Owner," or both — so it's clear which modules are shared ground and which are one persona's own workspace.

---

## 3. Five Product Pillars

The first three pillars operate at the **sprint/team level**; the fourth operates at the **individual Scrum Master level** — where they actually become the bottleneck. This fourth pillar should also be the screen that opens first ("one single place") rather than the report. The fifth pillar is deliberately **on-demand, not automatic** — it runs on data the Scrum Master already exported from a tool this POC doesn't integrate with live.

1. **Ops Hub** *(home screen — Scrum Master)* — gathers everything the Scrum Master needs to act on (their own tasks, delegatable work, messages/emails awaiting reply, pending approvals) into one single list, with delegation suggestions and draft-response generation.
2. **Auto Report** *(Scrum Master &amp; Product Owner)* — at the end of every sprint, the system automatically compiles tickets + documentation into a business-narrative report (not just dry numbers); the Scrum Master gets it pre-written, the Product Owner reads it for the outcome, and it's also sent to Teams.
3. **Doc Linker** *(Scrum Master)* — automatically finds and attaches relevant Confluence documentation to each ticket/epic; flags "missing documentation" or "orphaned documentation" (no longer referenced by any ticket).
4. **Process Health** *(Scrum Master &amp; Product Owner)* — a table showing tickets that are missing acceptance criteria, missing documentation, or have been stale for too long; the Scrum Master audits process hygiene overall, the Product Owner uses it to catch acceptance-criteria gaps in their own backlog.
5. **Performance Import** *(Scrum Master &amp; Product Owner)* — a user pastes or uploads a sprint export — CSV, TSV (cells copied straight out of Excel/Google Sheets), or JSON — from *any* tool (Azure Boards, Jira, Trello, a hand-built spreadsheet, ...) as long as it has the right columns, and the app instantly generates 3 fixed performance templates (Velocity & Completion, Quality & Bug Health, Workload & Aging) — no live connection to any tool, no data stored between requests. The Workload & Aging template reuses the same "stale after N days" rule as Process Health, applied to imported data instead of Jira data.

> Process Health and Doc Linker detect bottlenecks at the **ticket** level; Ops Hub detects bottlenecks at the **human** level (the Scrum Master themself); Performance Import answers a different question from the same **ticket** level — "how did the sprint actually perform?" — for teams whose board of record isn't Jira, or who just have a spreadsheet export handy. The four automatic pillars complement each other without overlapping; the fifth is opt-in per use. Ops Hub and Doc Linker stay the Scrum Master's own workspace; Auto Report, Process Health, and Performance Import are the shared ground where the Product Owner works directly in the app too, not just as a report recipient.

---

## 4. Scope

### In scope for the 7-day POC
- Ingest sample data simulating Jira (tickets/sprint), Confluence (documentation), and an "ops inbox" (tasks/emails/approvals) — JSON structured identically to a real export.
- 1 real integration: a Teams webhook (easiest to implement, strong demo effect).
- Generate sprint reports (narrative + metrics) via LLM.
- A Process Health table driven by fixed rules (no ML needed).
- Ops Hub: classification + delegation suggestions + drafting emails/reminders (LLM-generated — drafts only, never auto-sent).
- Performance Import: paste/upload a CSV, TSV, or JSON sprint export from *any* tool (Azure Boards, Jira, Trello, a plain spreadsheet, ...) with recognizable columns, and generate 3 fixed-rule performance templates (Velocity & Completion, Quality & Bug Health, Workload & Aging) — no live connection to any of those tools, the app never calls an external API for this (see Epic 6).
- A web dashboard displaying Ops Hub, the report, process health, doc linker, and Performance Import.

### Out of scope this week
- Real enterprise SSO / authentication.
- **Live/API** sync with Azure DevOps, Jira Cloud, or email integrations, and writing back into Jira (real assignment) — mocked in the demo only, called out as "planned" on the roadmap. (Manual CSV/TSV/JSON import of a sprint export from any of those tools, to generate the 3 performance templates, is now in scope — see Epic 6 — the distinction is live sync vs. a one-shot paste of data the user already exported.)
- Multi-sprint trend/burndown-over-time from an imported export — a single export is a one-shot snapshot with no iteration history, so only single-sprint metrics are computed.
- Automatically sending emails/messages on the user's behalf (the POC only drafts; the user always sends it themselves — safer and keeps the product in an assistant role).
- Multiple projects / multiple departments at once.
- Advanced predictive risk modeling (ML).
- A mobile app.

### Priority if time runs short (MoSCoW)
| Level | Epic | Why |
|---|---|---|
| Must-have | Epic 1 (Auto Report), Epic 5 (Ops Hub) | The two core pitch stories: "automatic reporting" + "one place where I'm no longer the bottleneck" |
| Should-have | Epic 3 (Process Health), Epic 6 (Performance Import) | Fixed rules, fast to code, no complex LLM needed |
| Cut first if time runs out | Epic 2 (Doc Linker) | Can be replaced with 1–2 static illustrative slides if Day 5 runs behind |

---

## 5. Functional Requirements (Epics & Stories)

Every story has an ID, the persona it serves, and acceptance criteria — ready to copy straight into a story file when building.

### EPIC 1 — Auto Report

**STORY 1.1 — Ingest sprint data**
_Persona: Scrum Master_
- As a Scrum Master, I want the system to read ticket/sprint data from a sample file (or the Jira API), so I don't have to enter it by hand.
- Acceptance criteria:
  - [ ] Reads `jira-sprint-sample.json` matching the schema in Section 7.
  - [ ] Validates missing required fields → shows a clear error, doesn't crash.
  - [ ] A "Refresh data" button exists in the UI.

**STORY 1.2 — Generate business narrative report**
_Persona: Scrum Master (creates) → PM/PO (reads)_
- As a Scrum Master, I want to click one button to get an easy-to-read narrative report plus metrics, so I don't have to write it by hand.
- Acceptance criteria:
  - [ ] The report includes: a 3–5 sentence summary in business language, velocity, completion rate, and open/closed bug counts.
  - [ ] Report generation takes under 30 seconds on sample data.
  - [ ] The report reads sensibly even when sprint data is incomplete (some tickets still "In Progress").

**STORY 1.3 — Post report summary to Teams**
_Persona: PM/PO (receives)_
- As a PM/PO, I want to receive the report summary directly on Teams, so I don't have to proactively open the dashboard.
- Acceptance criteria:
  - [ ] Sends successfully via a Teams Incoming Webhook.
  - [ ] The message includes: a 2–3 sentence summary + a link into the dashboard for detail.
  - [ ] Handles webhook failure gracefully (logs the error, doesn't crash the main flow).

### EPIC 2 — Doc Linker

**STORY 2.1 — Ingest Confluence docs**
_Persona: Scrum Master_
- Acceptance criteria:
  - [ ] Reads `confluence-pages-sample.json` matching the schema in Section 7.
  - [ ] Each doc has a title, URL, labels, and last-updated date.

**STORY 2.2 — Match ticket ↔ document**
_Persona: Scrum Master_
- As a Scrum Master, I want the system to automatically suggest documentation relevant to each ticket (via matching labels/title similarity), so I don't have to search manually.
- Acceptance criteria:
  - [ ] Matches by overlapping labels + title similarity (no complex AI needed — keyword matching is sufficient for the POC).
  - [ ] Displays a match-confidence level (low/medium/high) so the user can judge for themselves.

**STORY 2.3 — Flag missing / orphan docs**
_Persona: Scrum Master_
- Acceptance criteria:
  - [ ] A ticket with no matching doc → flagged "Missing documentation."
  - [ ] A doc referenced by no ticket → flagged "Orphaned documentation."

### EPIC 3 — Process Health

**STORY 3.1 — Define health rules**
_Persona: Scrum Master_
- Acceptance criteria:
  - [ ] Rule 1: ticket missing acceptance criteria (empty field) → warning.
  - [ ] Rule 2: ticket missing linked documentation (per Epic 2) → warning.
  - [ ] Rule 3: ticket not updated in > N days (N configurable, default 5) → warning.

**STORY 3.2 — Compute & display health table**
_Persona: Scrum Master_
- Acceptance criteria:
  - [ ] A table listing violating tickets + violation type (color-coded badge by severity).
  - [ ] Sortable by severity.

### EPIC 4 — Dashboard UI

*(The Ops Hub UI — the home screen — is specified separately in Story 5.1; the three stories below are secondary views opened from a menu.)*

**STORY 4.1 — Report view**
- Acceptance criteria:
  - [ ] Displays the narrative + stat tiles (velocity, completion %, bugs).
  - [ ] A "Send to Teams" button.

**STORY 4.2 — Process Health view**
- Acceptance criteria:
  - [ ] A health table with filtering by violation type.

**STORY 4.3 — Doc Linker view**
- Acceptance criteria:
  - [ ] A list of ticket ↔ doc matches + a list of "orphaned documentation."

---

### EPIC 5 — Ops Hub (one place so the Scrum Master doesn't become the bottleneck)

**STORY 5.1 — Gather all of the Scrum Master's work into one list**
_Persona: Scrum Master_
- As a Scrum Master, I want to see everything I need to handle (tickets assigned to me, messages/emails awaiting a reply, pending approvals) in one single place, so I don't have to remember or hunt for it across multiple tools.
- Acceptance criteria:
  - [ ] Reads `ops-inbox-sample.json` (schema in Section 7).
  - [ ] Displays 4 groups: My Work / Delegatable / Awaiting Approval / Needs Reply — as columns or tabs.
  - [ ] Each item shows its source (Jira/Teams/Email) and how many days it's been open (urgency).

**STORY 5.2 — Delegation suggestions**
_Persona: Scrum Master_
- As a Scrum Master, I want the system to suggest which work can be delegated to whom, with a short reason, so I can decide quickly instead of weighing every item myself.
- Acceptance criteria:
  - [ ] The LLM labels each task "should do myself" or "can delegate" + a one-sentence reason, based on the `candidateAssignees` field in the sample data.
  - [ ] A "Delegate" button only updates the status in the UI (no need to write back to real Jira for the POC).

**STORY 5.3 — Draft emails/messages**
_Persona: Scrum Master_
- As a Scrum Master, I want AI to draft response content for me (status updates, escalations, approval reminders), so I only need to read & send instead of writing from scratch.
- Acceptance criteria:
  - [ ] For items of type "needs_email" or "pending_approval," a "Draft" button generates content via LLM based on that item's context.
  - [ ] The draft appears editable, with a "Copy" button — **never auto-sent** (keeps the product in an assistant role; the user is always the final decision-maker).

**STORY 5.4 — Track pending approvals**
_Persona: Scrum Master_
- As a Scrum Master, I want to clearly see what's waiting on whose approval and how long it's been waiting, so I can proactively follow up instead of waiting passively.
- Acceptance criteria:
  - [ ] Each `pending_approval` item shows: who needs to approve it, the date it was sent, and how many days it's been waiting.
  - [ ] A red badge warning appears if it's been waiting more than N days (default 3, configurable).
  - [ ] A "Draft reminder" button reuses Story 5.3.

---

### EPIC 6 — Performance Import

*(Pillar 5, Section 3. Unlike Epics 1–5, this one runs on data the Scrum Master pastes in on demand — the app never calls out to Azure Boards, Jira, or any other tool's API. Deliberately tool-agnostic: it doesn't matter which tool the export came from, only that it has recognizable columns. A single export is a one-shot snapshot with no iteration history, so these templates are single-sprint only; no burndown-over-time or scope-change tracking.)*

**STORY 6.1 — Ingest a sprint export from any tool**
_Persona: Scrum Master_
- As a Scrum Master, I want to paste or upload the CSV/TSV/JSON export I already have — from Azure Boards, Jira, Trello, or a plain spreadsheet — so I don't have to re-enter anything by hand or wait for a real integration with whichever tool my team happens to use.
- Acceptance criteria:
  - [ ] Accepts pasted text or an uploaded `.csv`/`.tsv`/`.txt`/`.json` file.
  - [ ] Auto-detects comma- vs. tab-delimited text, since cells copy-pasted straight out of Excel/Google Sheets are tab-separated, not comma-separated.
  - [ ] Tolerates column-name variants from several tools/export styles at once — e.g. Azure's `Work Item Type`/`Assigned To`/`Iteration Path`, Jira's `Issue Type`/`Assignee`/`Sprint`, or a plain spreadsheet's `Type`/`Owner` — plus Azure's JSON field-reference names (`System.WorkItemType`, `System.State`, …).
  - [ ] Malformed/empty input shows a clear error, never crashes; a merely incomplete export (e.g. no Story Points column) still produces a report, with the gap surfaced as a data-quality note rather than a hard failure.
  - [ ] A "Load sample data" control demos the feature with zero setup.

**STORY 6.2 — Velocity & Completion template**
_Persona: Scrum Master_
- As a Scrum Master, I want velocity, completion rate, and a by-type breakdown computed from the imported export, so I can report on work tracked in any tool the same way I already do for Jira.
- Acceptance criteria:
  - [ ] Velocity = sum of Story Points on items in a "done"-equivalent state (Closed/Done/Resolved).
  - [ ] Completion rate = done items ÷ total items.
  - [ ] A breakdown by work item type (story/task/bug/other) shows total vs. done per type.

**STORY 6.3 — Quality & Bug Health template**
_Persona: Scrum Master_
- As a Scrum Master, I want open/closed bug counts and a severity breakdown from the imported export, so quality trends are visible without pulling a separate report from whichever tool the team uses.
- Acceptance criteria:
  - [ ] Total, open, and closed bug counts, plus bug ratio (bugs ÷ total items).
  - [ ] A severity breakdown table when the export has a Severity/Priority column; otherwise a plain note that severity data wasn't found (never a blank/broken table).

**STORY 6.4 — Workload & Aging template**
_Persona: Scrum Master_
- As a Scrum Master, I want to see work distributed by assignee and flag items that have gone stale, so I can spot an overloaded teammate or a forgotten item the same way Process Health already does for Jira tickets.
- Acceptance criteria:
  - [ ] Item counts (total/done) grouped by assignee.
  - [ ] Reuses the Process Health "stale after N days" rule (Story 3.1, Rule 3) against each item's last-changed date; N is configurable in the UI (default matches `DEFAULT_STALE_DAYS`).

---

## 6. Architecture & Proposed Tech Stack

```
[Data connectors]              [Agent layer]                        [Output layer]
jira-sample.json       ──┐                                   ┌──▶ Dashboard (Next.js UI)
confluence-sample.json  ─┼──▶  LLM (Claude API)  ────────────┤      · Ops Hub (home screen)
ops-inbox-sample.json   ─┤     report / match / health /     │      · Report / Doc Linker / Process Health
Teams webhook (real)    ─┘     delegate-suggest / draft-text └──▶ Teams message

Sprint export, any tool  ──▶  parse (CSV/TSV/JSON) +         ──▶ Dashboard: Performance Import screen
(Azure Boards, Jira,          normalize + 3 fixed templates       (stateless — nothing persisted,
 Trello, spreadsheet;          (no LLM, no live API call to        no external tool's API involved)
 pasted/uploaded by the         Azure, Jira, or anything else)
 Scrum Master)
```

**Proposed stack (prioritizing build speed within 7 days, and code an AI coding tool can generate accurately):**
- **Frontend + Backend:** Next.js (App Router) + Tailwind CSS — a single project, API routes as the backend, easy to deploy for a demo.
- **Data:** static JSON files for the POC (no real DB needed); for a slightly more polished version, SQLite via `better-sqlite3`.
- **LLM:** the Anthropic Claude API (Messages API) for generating the narrative report and ticket↔doc matching.
- **Notifications:** a Teams Incoming Webhook (URL configured via an environment variable).
- **Not needed:** real auth, a queue, or a separate DB server — keep it minimal for the POC.

**Required environment variables:** `ANTHROPIC_API_KEY`, `TEAMS_WEBHOOK_URL`.

---

## 7. Data Schema (for use as sample fixtures)

### `jira-sprint-sample.json`
```json
{
  "sprint": { "id": "SPR-24", "name": "Sprint 24", "startDate": "2026-09-01", "endDate": "2026-09-11" },
  "tickets": [
    {
      "id": "OPS-101",
      "title": "Automate weekly report export",
      "type": "story",
      "status": "done",
      "storyPoints": 5,
      "assignee": "Minh Anh",
      "acceptanceCriteria": "Report exports in the correct format and is emailed at 9am every Monday",
      "labels": ["reporting", "automation"],
      "lastUpdated": "2026-09-09"
    },
    {
      "id": "OPS-102",
      "title": "Standardize the team's documentation folder structure",
      "type": "task",
      "status": "in_progress",
      "storyPoints": 3,
      "assignee": "Huy Tran",
      "acceptanceCriteria": "",
      "labels": ["documentation"],
      "lastUpdated": "2026-08-30"
    }
  ]
}
```

### `confluence-pages-sample.json`
```json
{
  "pages": [
    {
      "title": "Weekly Report Export Process",
      "url": "https://confluence.internal/reporting-process",
      "labels": ["reporting", "automation"],
      "lastUpdated": "2026-08-20"
    },
    {
      "title": "Customer Data Security Policy (v3, outdated)",
      "url": "https://confluence.internal/security-policy-v3",
      "labels": ["security"],
      "lastUpdated": "2025-11-02"
    }
  ]
}
```
*(The second page illustrates the "orphaned documentation" case — no ticket in the sprint references the `security` label.)*

### `ops-inbox-sample.json`
```json
{
  "items": [
    {
      "id": "OPS-INBOX-1",
      "type": "task",
      "title": "Prepare Sprint 24 retro slides",
      "source": "jira",
      "owner": "Scrum Master",
      "createdDate": "2026-09-08",
      "candidateAssignees": []
    },
    {
      "id": "OPS-INBOX-2",
      "type": "delegatable",
      "title": "Update the internal changelog for Sprint 24",
      "source": "teams",
      "owner": "Scrum Master",
      "createdDate": "2026-09-07",
      "candidateAssignees": ["Huy Tran", "Lan Pham"]
    },
    {
      "id": "OPS-INBOX-3",
      "type": "pending_approval",
      "title": "Approve additional budget for a monitoring tool license",
      "source": "email",
      "owner": "Scrum Master",
      "waitingOn": "Head of Engineering",
      "sentDate": "2026-09-05",
      "candidateAssignees": []
    },
    {
      "id": "OPS-INBOX-4",
      "type": "needs_email",
      "title": "Reply to internal stakeholder on OPS-101 progress",
      "source": "email",
      "owner": "Scrum Master",
      "createdDate": "2026-09-09",
      "candidateAssignees": []
    }
  ]
}
```

### Performance Import: sprint export from any tool (pasted/uploaded by the Scrum Master, Epic 6)

Not a bundled fixture like the three above, and not tied to one tool —
this is free-form text the Scrum Master pastes in each time, from
whatever export they already have (an Azure Boards query, a Jira
filter/CSV export, a Trello board export, or a hand-built spreadsheet).
`data/performance-import-sample.csv` ships as a demo/reference example,
using Azure's own column names as one illustration — but any of the
alternates below work equally well. Recognized columns (case-insensitive;
Azure's JSON field-reference names, e.g. `System.WorkItemType`, are also
accepted — see `lib/data/performance-import.ts` for the full alias list):

| Field | Accepted column names (any one matches) |
|---|---|
| ID | `ID`, `Key`, `Work Item ID`, `Issue Key`, `Ticket` |
| Title | `Title`, `Summary`, `Name` |
| Type | `Work Item Type`, `Issue Type`, `Type` |
| State | `State`, `Status` |
| Points | `Story Points`, `Story Point Estimate`, `Points`, `Estimate`, `Effort` |
| Assignee | `Assigned To`, `Assignee`, `Owner` |
| Sprint/iteration | `Iteration Path`, `Sprint`, `Iteration` |
| Severity | `Severity`, `Priority`, `Bug Severity` |
| Dates | `Created Date`/`Created`, `Changed Date`/`Updated`/`Last Updated`, `Closed Date`/`Resolved` |

```csv
ID,Work Item Type,Title,State,Story Points,Assigned To,Iteration Path,Severity,Created Date,Changed Date,Closed Date
4501,Product Backlog Item,Add CSV export to the sprint dashboard,Closed,5,Minh Anh,Team Alpha\Sprint 24,,8/28/2026,9/9/2026,9/9/2026
4503,Bug,Story points column not recognized when exported from a saved query,Active,2,Lan Pham,Team Alpha\Sprint 24,2 - High,9/1/2026,9/10/2026,
```

The equivalent Jira-style CSV (same data, different column names) works
identically: `Key,Summary,Issue Type,Status,Story point estimate,Assignee,Sprint`.
Pasting a range of cells directly out of Excel/Google Sheets (tab-separated,
no CSV escaping) is also accepted — the delimiter is auto-detected.

Only `Title`/`Summary` is strictly required; every other column is optional
and degrades to a documented default (e.g. missing Story Points → `0`,
counted in a data-quality warning shown in the UI, never a hard failure).
The equivalent JSON shape is either a flat array of the same fields, or
Azure's own query-export shape: `{ "workItems": [{ "id": ..., "fields":
{ "System.Title": ..., "System.WorkItemType": ..., ... } }] }`.

### `teams-webhook-payload` (on "Send to Teams")
```json
{
  "text": "**Sprint 24 — Automated Report**\n5/8 stories completed (velocity 18 points). 1 ticket missing documentation (OPS-102). View details: https://agilecopilot.local/report/SPR-24"
}
```

---

## 8. Success Metrics (measured/illustrated in the demo)

| Metric | Before (manual) | After (AgileCopilot) |
|---|---|---|
| Time to produce 1 sprint report | ~2–3 hours | < 5 minutes |
| % of tickets with linked documentation detected | depends on the operator's memory | > 90% on the sample dataset |
| Process gaps detected per sprint | usually detected late | detected immediately when the report runs |
| Time to get a performance snapshot from a sprint export (any tool) | manual pivot tables/Excel, ~30–60 minutes | < 1 minute after pasting the export |

> Note clearly when presenting: these numbers are **illustrative, to demonstrate the concept** on sample data, not a commitment already measured on a real production system.

---

## 9. How to Build: SDLC & BMAD-lite (process technique, not the product problem)

This section is the **process** — used to build the product above with discipline, without drifting off course while vibe-coding solo over 7 days. The 6 BMAD roles (Analyst/PM/Architect/Scrum Master/Dev/QA) are **hats you put on yourself while building** — unrelated to the 2 product personas (Scrum Master, PM/PO) in Section 2, who are the people who *use* the product.

Principles while building:
- **1 story = 1 clean working session.** Hand exactly 1 story from Section 5 to the AI coding tool at a time; review it before opening the next one.
- Maintain 3 living documents: `brief.md` (Analyst) → `prd.md` + `architecture.md` (this file, as PM/Architect) → `stories/*.md` (Scrum Master, split out from Section 5).
- When wearing the PM/Analyst hat to extend this document, always state clearly which persona (Section 2) is being served — so the AI doesn't merge the 2 personas into one.

### 7-day roadmap (quick reference)

| Day | BMAD role | Deliverable |
|---|---|---|
| 1 | Analyst | brief.md + sample data (including `ops-inbox-sample.json`) |
| 2 | PM · Architect | prd.md + architecture.md (= this file) |
| 3 | Scrum Master | backlog stories/*.md (from Section 5) + a running Next.js scaffold |
| 4 | Dev | Epic 1 (Auto Report) + Epic 5 (Ops Hub) — the 2 must-haves running end-to-end |
| 5 | Dev | Epic 3 (Process Health) + real Teams webhook; Epic 2 (Doc Linker) if time remains, cut if not |
| 6 | QA · Docs | test acceptance criteria, fix bugs, README, backup demo video |
| 7 | Present | slides + rehearse the demo twice |

---

## 10. Key Risks

- **Real Jira/Confluence/Teams API auth takes time** → build against sample data first, demo only 1 real integration (Teams webhook).
- **Solo + new to the AI coding tool → easy to drift off course** → stick to 1 story at a time, check acceptance criteria daily.
- **4 epics is ambitious for 7 days (especially with Ops Hub newly added)** → follow the MoSCoW priority table in Section 4 exactly: Epic 1 & 5 are must-have, Epic 3 is should-have, Epic 2 is cut first if time runs out — don't try to build all 4 evenly.
- **Ops Hub suggestions go wrong (delegates to the wrong person, drafts the wrong tone)** → always keep a human as the final decision-maker: only suggest/draft, never auto-assign work or auto-send messages.

---

*This specification pairs with the "AgileCopilot" visual summary page (published separately) — use this file as the technical input for building, and the other page for presenting the idea.*
