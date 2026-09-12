# AgileCopilot — UI Redesign Spec (from POC v1)

## 0. Purpose & how to use this document

This document describes **what the built POC's UI does and shows** — every
screen, every component, every state, every interaction, and every piece of
data behind it — so it can be **redesigned visually** without anyone having to
read the source code first.

It is deliberately **not a visual design spec**. The POC's actual UI uses
Tailwind's default palette with no custom design system (default grays, a
handful of semantic colors for badges, system font) — that is the part meant
to change. Nothing below should be read as "this is how it should look";
everything below is "this is what has to still be true/present/possible after
it looks different."

Source of truth for *why* the product exists and *what it must do* is
`spec.md` and the PRD/Architecture Spine under
`_bmad-output/planning-artifacts/`. This document is the bridge from "the
functional requirements" to "the actual screen you'd be redesigning."

## 1. Navigation & information architecture

Five screens, one flat-level nav, no nesting:

| Route | Screen | Is the home screen? |
| --- | --- | --- |
| `/` | Ops Hub | **Yes** — this is where a Scrum Master lands |
| `/report` | Auto Report | No — reached via nav |
| `/process-health` | Process Health | No — reached via nav |
| `/doc-linker` | Doc Linker | No — reached via nav |
| `/performance-import` | Performance Import | No — reached via nav, and also promoted via a callout on the Ops Hub home screen (§4) |
| `/report/:sprintId` | (redirects to `/report`) | Deep link target from the Teams message; this POC only ever has one sprint in play |

Current nav (`components/Nav.tsx`) is a static top bar: product name +
5 text links, active link visually distinguished. Nothing about this
structure is meant to be preserved rigidly (a sidebar, tabs, a command
palette are all fine replacements) — what must be preserved is: **all 5
destinations reachable from anywhere in 1 click, and the current screen is
always visually obvious.**

## 2. Cross-cutting principles a redesign must not break

- **Assistant, not autopilot.** Every AI-generated suggestion or draft is
  something a human reviews before it has any effect. Delegation suggestions
  are a label + a reason, never an automatic reassignment. Drafts are
  editable text with a manual "Copy" action, never an automatic send. Any
  redesign must keep a clear seam between "AI suggested this" and "a human
  did this" — never blur them into looking auto-executed.
- **Never a raw crash.** Every screen has a distinct empty state ("no
  violations for this filter"), loading state, and error state (with a way to
  retry). An API/validation error always renders as a plain-language message,
  never a stack trace or a blank white screen.
- **Non-blocking side-effect failures.** A failed "Send to Teams" is
  reported via a toast/notification, not a modal that blocks the rest of the
  UI — the Report view remains fully usable after a failed send.
- **Local vs. persisted state is honest.** "Delegate" and other UI-only
  actions currently only change what's on screen for this session (no
  backend write) — see AD-3 in the Architecture Spine. If the redesign adds
  any visual "saved" affordance (checkmark, toast, etc.), it should not imply
  more persistence than actually exists yet.
- **Confidence and severity are always visible, never just implied by
  position.** A ticket flagged "missing documentation" or a match marked
  "low confidence" must say so explicitly (badge/label), not just be sorted
  to the bottom.

## 3. What's currently unstyled (open for the redesign)

- Color system: only Tailwind defaults (`gray-*`, `red-*`, `green-*`,
  `amber-*`) — no brand palette, no dark mode.
  - **Note:** the repo already has a `dataviz` design skill available with a
  validated, brand-neutral placeholder palette and contrast rules — worth
  using as the starting point for badge/status colors specifically, since
  those (severity, confidence, source) function like a small categorical
  data-viz system.
- Typography: system font stack only, 2 sizes in practice (base text, `text-sm`/`text-xs` for
  meta text) — no type scale, no display/heading treatment.
- Spacing/density: default Tailwind spacing scale, no deliberate rhythm.
- No iconography at all — badges/labels are text-only (e.g. "Jira", "Teams",
  "Overdue"). Icons for source, severity, and confidence are a natural
  addition.
- No empty-state illustration, no onboarding/first-run treatment.
- No dark mode.
- Ops Hub's 4 groups are implemented as 4 always-visible columns (grid,
  stacking to 1 column on narrow screens). Spec explicitly allows "columns or
  tabs" (spec.md, Story 5.1) — a tabbed mobile layout is a reasonable
  redesign direction if 4 stacked columns feel long on phone width.

## 4. Screen: Ops Hub (`/`) — the home screen

**Purpose:** everything the Scrum Master needs to act on, in one place, so
they stop being the bottleneck (realizes UJ-2 in the PRD).

**Data sources:**
- `GET /api/ops-inbox` → `{ items: OpsItem[] }`
- `GET /api/delegate` → `{ suggestions: DelegationSuggestion[] }` (one per
  `delegatable` item)
- `POST /api/draft` `{ itemId }` → `DraftResult` (called on demand, per item,
  when "Draft"/"Draft reminder" is clicked)

**Layout today:** a header (title + a numeric "overdue-approval threshold"
input, default 3 days), then an `InfoBanner` callout (`components/InfoBanner.tsx`)
introducing Performance Import with a link to `/performance-import`
(spec.md Epic 6, Pillar 5) — the one static, non-dismissible piece of promotional copy on
this screen — above a 4-column grid (1 column on mobile, 2 on tablet, 4 on
desktop). Each column is one group:

| Group | Filter | Items shown |
| --- | --- | --- |
| My Work | `type === 'task'` | Plain cards, no action |
| Delegatable | `type === 'delegatable'` | Card + delegation suggestion + Delegate button |
| Awaiting Approval | `type === 'pending_approval'` | Card + waiting-on/days-waited + overdue badge + Draft reminder button |
| Needs Reply | `type === 'needs_email'` | Card + Draft button |

**Every card shows:**
- Title (`item.title`)
- Source badge: "Jira" / "Teams" / "Email" (`item.source`)
- Days-open line: "Open {n}d" for task/delegatable/needs_email (from
  `item.createdDate`), "Waiting {n}d" for pending_approval (from
  `item.sentDate`) — computed as whole days between that date and today
  (`lib/config.ts`'s `daysSince`)
- For `pending_approval` only: "· Needs {item.waitingOn}"

**States:**
- Loading: "Loading…" text (both fetches must resolve).
- Error: a red banner with the error message + a "Retry" link that reloads
  both fetches.
- Empty (a group with zero items): "Nothing here." in that column.
- Populated: cards as above.

**Interactions:**
1. **Delegate** (Delegatable group only) — click → the item is marked
   "Delegated" in local state only (button becomes disabled, label changes
   to "Delegated"), a confirmation toast appears ("Marked as delegated
   (local to this session)"). No network write. Lost on page refresh — by
   design (AD-3).
2. **Draft** / **Draft reminder** (Needs Reply / Awaiting Approval) — click →
   an inline panel expands within the card:
   - While loading: "Generating draft…"
   - Once loaded: a read-only subject line, an **editable** multi-line
     textarea pre-filled with the generated body, a **Copy** button (copies
     "Subject: …\n\n{edited body}" to the clipboard, toasts success/failure),
     and a small caption disclosing whether it was `Generated by Gemini` or
     `Generated by template (no API key set)` — **never** an auto-send
     control.
   - Re-clicking Draft on an item that's already been drafted just re-opens
     the existing draft (no re-fetch), preserving whatever the user already
     edited.
3. **Overdue-approval threshold** input (top-right) — changes what counts as
   "waited too long" for the red "Overdue" badge on `pending_approval` cards,
   recomputed client-side immediately (default 3 days, per spec.md Story 5.4).

**Badge taxonomy on this screen:**
- Source: neutral gray pill, text = "Jira" / "Teams" / "Email".
- Overdue: red pill, text = "Overdue", shown only when `daysWaited > approvalWarnDays`.
- Delegation label (inline text, not a pill currently): green/bold "Can
  delegate" or plain "Should do myself", followed by a one-sentence reason.

## 5. Screen: Auto Report (`/report`)

**Purpose:** one-click sprint report for the Scrum Master to review and push
to Teams (realizes UJ-1).

**Data sources:**
- `GET /api/sprint` → `SprintData` (sprint + tickets) — also used for the
  "Refresh data" control and the ticket table at the bottom of the page.
- `POST /api/report` → `ReportResult` (narrative + metrics) — triggered by
  "Generate Report"/"Regenerate".
- `GET /api/doc-links` → fetched alongside report generation, only to get
  `missingDocTicketIds.length` for the Teams message.
- `POST /api/teams/send` `{ sprintId, sprintName, summary, doneCount,
  totalCount, velocity, missingDocCount }` → `{ ok, error? }` — triggered by
  "Send to Teams".

**Layout today, top to bottom:**
1. Header: "Auto Report" title, sprint name + date range as subtitle, a
   "Refresh data" button (top-right) that re-fetches `/api/sprint`.
2. A red error banner if the sprint fixture fails validation (instead of
   everything below).
3. Before a report exists: a single "Generate Report" button.
4. After a report exists:
   - 4 stat tiles in a row (velocity, completion %, open bugs, closed bugs).
   - A narrative card: 3–5 sentence business-language paragraph + a small
     caption disclosing `Generated by Gemini` / `Generated by template (no
     API key set)`.
   - Two buttons: **Send to Teams** (primary) and **Regenerate** (secondary).
5. A ticket table (always visible once sprint data loads, independent of
   report generation): ID + title, type, status, points, assignee — this is
   the raw ingested data a Scrum Master would sanity-check against Jira.

**States:**
- Loading sprint: subtitle reads "Loading sprint…", no button yet.
- Sprint validation error: red banner, no further UI below it renders.
- Report generating: "Generate Report"/"Regenerate" button reads
  "Generating…" and is disabled.
- Sending to Teams: "Send to Teams" reads "Sending…" and is disabled; result
  is a success or error toast, never inline UI change (the report stays on
  screen regardless of send outcome).

**Interactions:**
1. **Refresh data** — re-fetches `/api/sprint`; does not clear an
   already-generated report.
2. **Generate Report** / **Regenerate** — same action; re-fetches both the
   narrative and current doc-links missing-count.
3. **Send to Teams** — posts the report summary; toasts success
   ("Report summary sent to Teams") or failure (`Could not send to Teams: {error}`)
   without altering the report display.

## 6. Screen: Process Health (`/process-health`)

**Purpose:** surface process drift (missing acceptance criteria, missing
docs, stale tickets) the moment it's detectable.

**Data source:** `GET /api/process-health?staleDays={n}` →
`{ violations: ProcessHealthViolation[], staleDays }`. Re-fetched whenever
the stale-days input changes.

**Layout today:**
1. Header ("Process Health" + subtitle).
2. Controls row: "Stale after {n} days" numeric input (default 5, per
   spec.md Story 3.1), "Violation type" dropdown (All / Missing acceptance
   criteria / Missing documentation / Stale).
3. A table: Ticket (id + title), Violation (human label), Detail (a
   one-line, rule-specific explanation string from the API — e.g. "Not
   updated in 13 days (threshold: 5)."), Severity (colored badge, column
   header is clickable to flip sort direction ↓/↑).
4. Empty state row: "No violations for this filter — clean sprint." when the
   filtered list is empty.

**One row per (ticket, violation) pair** — a ticket with 3 violations
appears 3 times, once per violation type. This was a deliberate choice to
keep "violation type" filtering and "one clear fact per row" simple; a
redesign could instead group by ticket with multiple violation chips in one
row if that reads better visually — the data (`ticketId`, `type`,
`severity`, `detail` per violation) supports either.

**Severity taxonomy (fixed by rule type, not per-ticket):**

| Violation type | Severity | Rule |
| --- | --- | --- |
| Missing acceptance criteria | High | `acceptanceCriteria` field is an empty string |
| Missing documentation | Medium | Zero Doc Linker match (§7 below) for that ticket |
| Stale | Low | Not updated in more than N days (default 5) |

**Interactions:**
1. **Stale after (n) days** — changes the threshold and re-queries the API.
2. **Violation type** dropdown — client-side filter of the already-fetched list.
3. **Severity column header** — client-side sort toggle (desc/asc).

## 7. Screen: Doc Linker (`/doc-linker`)

**Purpose:** show which tickets are backed by documentation, and flag gaps
in both directions.

**Data source:** `GET /api/doc-links` → `DocLinksResult`:
`{ matches: DocMatch[], missingDocTicketIds: string[], orphanedDocs: Doc[] }`.

**Layout today, 3 stacked sections:**
1. **Ticket ↔ Document matches** — table: Ticket id, matched document title
   (a real link, opens in a new tab), Confidence badge (high/medium/low).
2. **Missing documentation ({count})** — a bullet list of ticket ids with
   zero match. Empty state: "Every ticket has a matching doc."
3. **Orphaned documentation ({count})** — a list of docs referenced by no
   ticket, each a link + "last updated {date}". Empty state: "No
   documentation is orphaned."

**Confidence taxonomy** (computed deterministically — see
`lib/llm/match-docs.ts` — never LLM-based, per spec.md's explicit "no ML
needed" call for this feature):
- **High** — 2+ shared labels between ticket and doc, OR 1+ shared label
  with strong title-keyword overlap.
- **Medium** — exactly 1 shared label, OR strong title-keyword overlap with
  no shared label.
- **Low** — some weak title-keyword overlap, no shared label.
- **No match** (not a confidence level — this ticket goes to "Missing
  documentation" instead) — no shared label and no shared keyword.

A ticket has at most one match (its single best-scoring doc); a doc can
match multiple tickets and is only "orphaned" if it matches none.

## 8. Screen: Performance Import (`/performance-import`)

**Purpose:** an on-demand performance snapshot for a sprint tracked in
*any* tool — Azure Boards, Jira, Trello, a plain spreadsheet — paste/upload
one export, get 3 fixed report templates back (spec.md Pillar 5 / Epic 6).
Deliberately source-agnostic: the screen never asks which tool the export
came from, only that it has recognizable columns. Unlike every other
screen, there is no background data source: nothing loads on mount, and
nothing is remembered between visits.

**Data sources:**
- `GET /api/performance-import` → `{ format: 'csv', raw: string }` — backs
  the "Load sample data" button only (reads the bundled
  `data/performance-import-sample.csv`), not used on page load.
- `POST /api/performance-import` `{ format: 'json' | 'csv', raw: string,
  staleDays?: number }` → `PerformanceImportReport` — triggered by
  "Analyze". `format: 'csv'` covers both comma- and tab-delimited text;
  the delimiter is auto-detected server-side.

**Layout today, top to bottom:**
1. Header: title + a one-line disclosure that nothing is sent anywhere —
   it only reads the text/file given to it.
2. An input card: a CSV/TSV vs. JSON format toggle, an "Upload file…"
   button (reads the picked file into the textarea via `FileReader`, and
   infers format from the file extension — `.csv`/`.tsv`/`.txt` all map to
   the CSV/TSV path, `.json` to the JSON path), a "Load sample data"
   button, a "Stale after {n} days" numeric input (default
   `DEFAULT_STALE_DAYS`, same pattern as Ops Hub's overdue-approval
   input), a multi-line textarea for the pasted export, and an "Analyze"
   button (disabled while empty or in flight).
3. A red error banner on a failed/invalid import (same non-crashing
   pattern as `/report`'s sprint-validation banner).
4. After a successful analysis: the derived sprint/iteration label, an
   amber "data-quality notes" box listing any `warnings` (only shown when
   non-empty — e.g. "Story Points column not found — defaulted to 0"),
   then 3 report-card sections in a fixed order:
   - **Velocity & Completion** — 4 stat tiles (velocity, completion rate,
     total items, done items), a one-line headline, a by-work-item-type
     table (total vs. done).
   - **Quality & Bug Health** — 4 stat tiles (total/open/closed bugs, bug
     ratio), a one-line headline, a severity breakdown table **or** a
     "Severity column not found in this export" note when the export has
     no severity/priority data.
   - **Workload & Aging** — a one-line headline, a by-assignee table
     (total/done), and a stale-items list (id, title, days since update) —
     empty when nothing is stale. This reuses the exact "stale after N
     days" rule from Process Health §6, applied to imported data.

**States:**
- Idle: empty textarea, "Analyze" disabled.
- Loading sample: "Load sample data" reads "Loading…" and is disabled.
- Analyzing: "Analyze" reads "Analyzing…" and is disabled.
- Import error: a red banner with the server's plain-language message
  (e.g. "Paste or upload a sprint export first.", or "No row had a
  recognizable Title/Summary column — check the export and try again.");
  no report sections render underneath it.
- Populated: as described above. Re-running "Analyze" (e.g. after editing
  the textarea or changing the stale-days threshold) replaces the whole
  report.

**Interactions:**
1. **Format toggle (CSV/TSV vs. JSON)** — switches the expected paste
   format and the textarea's placeholder text; does not clear what's
   already pasted.
2. **Upload file…** — opens a native file picker (`.csv`/`.tsv`/`.txt`/
   `.json`); on selection, reads the file's text into the textarea and
   sets the format toggle from the file extension.
3. **Load sample data** — fetches the bundled sample CSV and fills the
   textarea, so the screen is demoable with zero setup.
4. **Stale after (n) days** — only takes effect on the next "Analyze"
   (unlike Process Health's threshold, which re-queries live — this screen
   has no live data source to re-query against).
5. **Analyze** — posts the current format/raw/staleDays; success replaces
   the report sections, failure shows the error banner and leaves any
   previous report cleared.

**Data-quality notes vs. hard errors:** this screen is deliberately more
lenient than sample-fixture screens elsewhere in the app — a merely
incomplete export (missing an optional column, an unrecognized work-item
type/state) still produces a full report with the gap surfaced as a
warning, never a blocked/broken page. Only unusable input (empty paste,
no parseable rows, no row with a Title/Summary) is a hard error.

**Multi-tool column recognition:** the same textarea accepts an Azure
CSV export, a Jira CSV export, or a plain spreadsheet — see spec.md's
Data Schema section (Epic 6) for the full column-alias table. There is no
per-tool mode to pick; the parser just looks for whichever recognizable
column names are present.

## 9. Shared components inventory

| Component | File | Used on |
| --- | --- | --- |
| `Nav` | `components/Nav.tsx` | Every screen (in the root layout) |
| `ToastProvider` / `useToast` | `components/ToastProvider.tsx` | Every screen (error/success notifications) |
| `SeverityBadge`, `ConfidenceBadge` | `components/Badge.tsx` | Process Health, Doc Linker |
| `StatTile` | `components/StatTile.tsx` | Report, Performance Import |
| `OpsItemCard` | `components/OpsItemCard.tsx` | Ops Hub (all 4 groups) |
| `InfoBanner` | `components/InfoBanner.tsx` | Ops Hub (Performance Import callout) |

A redesign is free to restructure these however it wants; the table above is
just so nothing gets missed. Toasts specifically: currently a fixed
bottom-right stack, auto-dismissing after 5 seconds, 3 kinds (success = green,
error = red, info = gray) — keep at minimum a success/error/info distinction
and non-blocking positioning.

## 10. Data contracts (for whoever wires up the redesigned UI)

Full types live in `lib/types.ts`. Key shapes referenced above:

```ts
interface Ticket {
  id: string; title: string;
  type: 'story' | 'task' | 'bug';
  status: 'to_do' | 'in_progress' | 'done';
  storyPoints: number; assignee: string;
  acceptanceCriteria: string; // '' is meaningful (Process Health rule 1)
  labels: string[]; lastUpdated: string; // YYYY-MM-DD
}

interface OpsItem {
  id: string;
  type: 'task' | 'delegatable' | 'pending_approval' | 'needs_email';
  title: string; source: 'jira' | 'teams' | 'email'; owner: string;
  candidateAssignees: string[];
  createdDate?: string; waitingOn?: string; sentDate?: string;
}

interface DocMatch { ticketId: string; doc: Doc; confidence: 'high'|'medium'|'low'; score: number; }
interface ProcessHealthViolation {
  ticketId: string; ticketTitle: string;
  type: 'missing_acceptance_criteria' | 'missing_documentation' | 'stale';
  severity: 'high' | 'medium' | 'low'; detail: string;
}
interface ReportResult {
  sprintId: string; sprintName: string; narrative: string;
  velocity: number; completionRate: number; // 0..1
  openBugCount: number; closedBugCount: number; generatedByLLM: boolean;
}
interface DelegationSuggestion { itemId: string; label: 'should_do_myself'|'can_delegate'; reason: string; }
interface DraftResult { itemId: string; subject: string; body: string; generatedByLLM: boolean; }

// Performance Import (Pillar 5) — POST /api/performance-import request/response.
// format: 'csv' covers both comma- and tab-delimited text (auto-detected).
interface PerformanceImportRequest { format: 'json' | 'csv'; raw: string; staleDays?: number; }
interface PerformanceImportReport {
  sprintLabel: string;
  velocity: { totalItems: number; doneItems: number; completionRate: number; velocity: number;
    byType: Record<'story'|'task'|'bug'|'other', { total: number; done: number }>; headline: string; };
  quality: { totalBugs: number; openBugs: number; closedBugs: number; bugRatio: number;
    hasSeverityData: boolean; bySeverity: { severity: string; count: number }[]; headline: string; };
  workload: { byAssignee: { assignee: string; total: number; done: number }[]; staleDays: number;
    staleItems: { id: string; title: string; daysSinceUpdate: number }[]; headline: string; };
  warnings: string[];
}
```

Every API error (any endpoint) is `{ error: string }` with a 4xx/5xx status —
render it as plain text, there is no structured error code to branch on in
this POC.

## 11. Responsive & accessibility notes to preserve

- All 5 screens already work down to ~400px width (Ops Hub's grid collapses
  to 1 column; tables scroll if needed rather than breaking layout).
- Every interactive control is a real `<button>`/`<input>`/`<select>`/`<a>` —
  no `<div onClick>` — keep it that way for keyboard/screen-reader access.
- Badges currently rely on color + text label together (never color alone)
  for severity/confidence/overdue — preserve that pairing in any redesign
  (don't drop to a color-only dot).
- The draft textarea is a real, focusable, editable `<textarea>` — any
  redesign (e.g. a modal instead of inline expansion) must keep drafts
  genuinely editable before copying, not read-only preview text.

## 12. Out of scope for this document

This spec does not propose colors, type scales, spacing, or component
visuals — that is the redesign's job. It also doesn't cover functionality
that doesn't exist yet (multi-project support, auth, persisted delegation
state, live Jira/Confluence/Teams/Azure DevOps connectors, multi-sprint
trend/burndown from an imported export) — see the Architecture Spine's "Deferred"
section for what's intentionally out of scope for this POC stage.
