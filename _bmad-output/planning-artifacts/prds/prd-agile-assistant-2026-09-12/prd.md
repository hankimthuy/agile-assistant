---
title: AgileCopilot
created: 2026-09-12
updated: 2026-09-12
status: draft
---

# PRD: AgileCopilot

## 0. Document Purpose

This PRD is for whoever builds and pitches the AgileCopilot POC — primarily the Scrum Master driving the 7-day build, and the internal stakeholders/employer it will be pitched to. It is structured around the five product pillars (Ops Hub, Auto Report, Doc Linker, Process Health, Performance Import), with functional requirements numbered globally (FR-1 through FR-19) and grouped under the pillar they belong to. It builds on `spec.md` (the original technical spec this PRD distills) and the Product Brief in this same output tree — it does not duplicate their reasoning, only restates the decisions in PRD shape.

## 1. Vision

AgileCopilot turns sprint reporting and documentation upkeep from a Scrum Master's manual burden into an automated, always-current background process, and gives that same Scrum Master one place to see everything on their plate so they stop being the team's bottleneck — while giving the Product Owner the sprint outcome directly, without asking anyone. It is a connective layer over Jira and Confluence — not a replacement for either — so a closed ticket automatically produces a business-narrative report with the right documentation already attached, and process drift is visible the moment it happens rather than after it's already late.

## 2. Target User

AgileCopilot serves two co-equal operator personas — Scrum Master and Product Owner both open the app directly (see `spec.md` §2 for the full persona detail).

### 2.1 Jobs To Be Done

- "When the sprint ends, I want a trustworthy report with all the relevant documentation attached immediately, so I don't have to compile it by hand." (Scrum Master)
- "I want one place that shows everything on my plate — what I have to do myself, what can be delegated, what's waiting on approval, which emails are unanswered — so I'm not the bottleneck myself." (Scrum Master)
- "I want to know what business value the last sprint created, without having to ask anyone." (Product Owner)
- "I want to catch backlog hygiene issues on my own tickets before review, not after." (Product Owner)

### 2.2 Non-Users (v1)

Individual contributors (developers, designers) are not direct users of AgileCopilot in v1 — they appear only as delegation targets or ticket assignees inside the data, never as people who log into the dashboard.

### 2.3 Key User Journeys

- **UJ-1. The Scrum Master closes out a sprint in minutes, not hours.**
  - **Persona + context:** the Scrum Master, at the end of Sprint 24, needs a report the Product Owner can act on.
  - **Entry state:** opens the AgileCopilot dashboard, sprint data already ingested from the sample Jira export.
  - **Path:** clicks "Generate Report" → reviews the narrative + stat tiles → clicks "Copy report."
  - **Climax:** a ready-to-paste summary is on the clipboard within seconds, with a business-language summary the Product Owner can read directly in the app or via the pasted copy.
  - **Resolution:** the Scrum Master has spent under 5 minutes instead of 2–3 hours; realizes FR-2, FR-3.
  - **Edge case:** some tickets are still "In Progress" when the report runs — the narrative still reads sensibly rather than looking broken.

- **UJ-2. The Scrum Master stops being the bottleneck.**
  - **Persona + context:** the Scrum Master opens AgileCopilot at the start of the day, not sure what's most urgent.
  - **Entry state:** the signed-in Overview screen surfaces the Ops Hub's highlights first; ops-inbox sample data is already ingested.
  - **Path:** scans the four columns (My Work / Delegatable / Awaiting Approval / Needs Reply) → sees a delegation suggestion with a reason → clicks "Delegate" → sees a pending approval waiting 4 days → clicks "Draft reminder" → copies the drafted text and sends it themselves.
  - **Climax:** the Scrum Master has moved or actioned every item without hunting across Jira/Teams/email.
  - **Resolution:** nothing is quietly waiting on the Scrum Master personally; realizes FR-12 through FR-15.

## 3. Glossary

- **Sprint** — a fixed-length Jira iteration containing a set of tickets, with a start/end date.
- **Ticket** — a Jira story/task/bug with a status, assignee, story points, acceptance criteria, and labels.
- **Doc** — a Confluence page with a title, URL, labels, and last-updated date.
- **Ops inbox item** — a unit of work in the Scrum Master's personal queue: `task`, `delegatable`, `pending_approval`, or `needs_email`, each with a source (`jira`/`teams`/`email`).
- **Process Health violation** — a ticket flagged by a fixed rule (missing acceptance criteria, missing linked doc, or stale beyond N days).
- **Orphaned doc** — a Confluence page referenced by no ticket in the current sprint.

## 4. Features

### 4.1 Auto Report

**Description:** At the end of a sprint, the system reads ticket/sprint data and produces a business-narrative report plus key metrics, ready to copy and share. Realizes UJ-1.

#### FR-1: Ingest sprint data

The Scrum Master can load ticket/sprint data from a sample file matching the schema in `spec.md` §7 (or, later, the live Jira API).

**Consequences (testable):**
- Reads `jira-sprint-sample.json` and renders its sprint + tickets correctly.
- A missing required field produces a clear validation error and does not crash the app.
- A "Refresh data" control re-reads the source and updates the dashboard.

#### FR-2: Generate business narrative report

The Scrum Master can generate a sprint report combining a plain-language business summary with key metrics. Realizes UJ-1.

**Consequences (testable):**
- Report includes a 3–5 sentence business-language summary, velocity, completion rate, and open/closed bug counts.
- Generation completes in under 30 seconds on the sample dataset.
- The report reads sensibly when some tickets are still "In Progress."

#### FR-3: Copy report summary for sharing

Either persona can copy a ready-to-paste report summary to the clipboard. Realizes UJ-1.

**Consequences (testable):**
- A "Copy report" control copies successfully in one click, entirely client-side.
- Copied text includes a 2–3 sentence summary, key stats, and the full narrative.
- Never fails due to an unreachable third-party service — there is no network call.

**Out of Scope:** automatically posting to any messaging platform on the user's behalf.

### 4.2 Doc Linker

**Description:** The system links Confluence documentation to tickets automatically and flags gaps in both directions.

#### FR-4: Ingest Confluence docs

The Scrum Master can load documentation metadata from a sample file matching the schema in `spec.md` §7.

**Consequences (testable):**
- Reads `confluence-pages-sample.json`; each doc exposes title, URL, labels, and last-updated date.

#### FR-5: Match ticket ↔ document

The system suggests relevant documentation for each ticket by overlapping labels and title similarity.

**Consequences (testable):**
- Matching uses label overlap plus keyword/title similarity (no ML required for the POC).
- Each match shows a confidence level (low/medium/high).

#### FR-6: Flag missing / orphan docs

The system flags tickets with no matching documentation and documentation referenced by no ticket.

**Consequences (testable):**
- A ticket with zero matches is flagged "Missing documentation."
- A doc referenced by no ticket in the sprint is flagged "Orphaned documentation."

**Feature-specific NFRs:** none beyond the cross-cutting NFRs in §6.

### 4.3 Process Health

**Description:** A fixed-rule table surfaces tickets that violate baseline process hygiene, so drift is visible immediately rather than discovered late.

#### FR-7: Define health rules

The system evaluates every ticket against three fixed rules.

**Consequences (testable):**
- Rule 1: empty `acceptanceCriteria` → violation.
- Rule 2: no linked doc per FR-6 → violation.
- Rule 3: not updated in more than N days (default 5, configurable) → violation.

#### FR-8: Compute & display health table

The Scrum Master can see every violating ticket, ranked by severity.

**Consequences (testable):**
- Table lists violating tickets with a color-coded severity badge per violation type.
- Sortable by severity.

### 4.4 Dashboard UI

**Description:** A single web dashboard surfaces all five pillars; the signed-in Overview screen is the home screen and surfaces Ops Hub's highlights first (§4.5), the other pillars are views reached from the nav.

#### FR-9: Report view

**Consequences (testable):**
- Displays the narrative plus stat tiles (velocity, completion %, bugs).
- Includes a "Copy report" control that triggers FR-3.

#### FR-10: Process Health view

**Consequences (testable):**
- Displays the FR-8 table with a filter by violation type.

#### FR-11: Doc Linker view

**Consequences (testable):**
- Displays the FR-5 ticket↔doc matches and the FR-6 orphaned-doc list.

### 4.5 Ops Hub

**Description:** The Scrum Master's daily list — its highlights are also what the signed-in Overview screen (§4.4) shows first. Gathers everything the Scrum Master needs to act on into one list, with AI-drafted delegation suggestions and reply drafts. The human always sends and always assigns — nothing here auto-executes. Realizes UJ-2.

#### FR-12: Gather all of the Scrum Master's work into one list

**Consequences (testable):**
- Reads `ops-inbox-sample.json` per the schema in `spec.md` §7.
- Displays four groups — My Work / Delegatable / Awaiting Approval / Needs Reply — as columns or tabs.
- Each item shows its source (Jira/Teams/Email) and how many days it has been open.

#### FR-13: Delegation suggestions

**Consequences (testable):**
- Each delegatable task is labeled "should do myself" or "can delegate," with a one-sentence reason, using the item's `candidateAssignees`.
- A "Delegate" control updates the item's status in the UI only — no live Jira write-back in the POC.

**Out of Scope:** any automatic reassignment in a real system of record.

#### FR-14: Draft emails/messages

**Consequences (testable):**
- For `needs_email` or `pending_approval` items, a "Draft" control generates reply content from that item's context.
- The draft is editable in place, with a "Copy" control.

**Out of Scope:** auto-sending. The user is always the one who sends.

#### FR-15: Track pending approvals

**Consequences (testable):**
- Each `pending_approval` item shows who must approve it, when it was sent, and how many days it has waited.
- A red badge appears once the wait exceeds N days (default 3, configurable).
- A "Draft reminder" control reuses FR-14.

### 4.6 Performance Import

**Description:** On-demand analysis of a sprint export pasted/uploaded from any tool (Azure Boards, Jira, Trello, a plain spreadsheet) — no live connection to any of those tools. Used directly by both the Scrum Master and the Product Owner (spec.md §3 Pillar 5, Epic 6).

#### FR-16: Ingest a sprint export from any tool

**Consequences (testable):**
- Accepts pasted text or an uploaded `.csv`/`.tsv`/`.txt`/`.json` file; auto-detects comma- vs. tab-delimited text.
- Tolerates column-name variants across tools (Azure, Jira, plain spreadsheet), including Azure's JSON field-reference names and object-valued fields (e.g. `AssignedTo`).
- A "Load sample data" control demos the feature with zero setup.
- Malformed/empty input shows a clear error, never crashes; an incomplete export still produces a report with the gap surfaced as a data-quality note.

#### FR-17: Velocity & Completion template

**Consequences (testable):**
- Velocity = sum of Story Points on done-equivalent items; completion rate = done ÷ total.
- A breakdown by work-item type (story/task/bug/other) shows total vs. done per type.

#### FR-18: Quality & Bug Health template

**Consequences (testable):**
- Total, open, and closed bug counts, plus bug ratio.
- A severity breakdown when the export has a Severity/Priority column; otherwise a plain note, never a blank/broken table.

#### FR-19: Workload & Aging template

**Consequences (testable):**
- Item counts (total/done) grouped by assignee.
- Reuses the Process Health "stale after N days" rule (FR-7, Rule 3) against each item's last-changed date; N is configurable in the UI.

**Out of Scope:** multi-sprint trend/burndown-over-time — a single export is a one-shot snapshot.

## 5. Non-Goals (Explicit)

- AgileCopilot is not a Jira or Confluence replacement — it never becomes the system of record for tickets or docs.
- It will not send any message or email automatically on the user's behalf; every send/assign action is a human click.
- It will not support multiple concurrent projects/departments in v1.
- It will not include ML-based risk prediction or a mobile app in v1.

## 6. MVP Scope

### 6.1 In Scope

- Sample-data ingestion for sprint/ticket, Confluence, and ops-inbox data (JSON, structurally identical to a real export).
- Zero live external integrations — every report/draft is copied by the user, never auto-sent.
- LLM-generated narrative reports, ticket↔doc matching, delegation suggestions, and reply drafts.
- A fixed-rule Process Health table.
- On-demand Performance Import for any-tool sprint exports (FR-16–19).
- A single web dashboard covering all five pillars.

### 6.2 Out of Scope for MVP

- Real enterprise SSO/authentication.
- Live Azure DevOps, email, or Jira write-back integrations — mocked in the demo, named as roadmap.
- Multi-project/multi-department support.
- ML-based risk prediction; a mobile app.
- A real database — persistence is planned for a future phase, not this one.

**MoSCoW priority for the 7-day build:** Must-have — Epic 1 Auto Report, Epic 5 Ops Hub (FR-1–3, FR-12–15). Should-have — Epic 3 Process Health (FR-7–8), Epic 6 Performance Import (FR-16–19). Cut first if time runs short — Epic 2 Doc Linker (FR-4–6), replaceable with static illustrative slides.

## 7. Success Metrics

**Primary**
- **SM-1**: Time to produce one sprint report — target under 5 minutes, down from ~2–3 hours. Validates FR-2, FR-3.
- **SM-2**: % of tickets with a correctly linked (or correctly flagged missing) document — target over 90% on the sample dataset. Validates FR-5, FR-6.

**Secondary**
- **SM-3**: Process gaps are visible at report-generation time rather than discovered late. Validates FR-7, FR-8.
- **SM-4**: The Scrum Master can name everything on their plate from the Ops Hub alone, without checking Jira/Teams/email separately. Validates FR-12–FR-15.
- **SM-5**: Time to get a performance snapshot from a sprint export (any tool) — target under 1 minute after pasting, down from ~30–60 minutes of manual pivot tables. Validates FR-16–FR-19.

**Counter-metrics (do not optimize)**
- **SM-C1**: Delegation-suggestion volume should not be optimized by suggesting delegation more often than is actually appropriate — a wrong suggestion costs trust. Counterbalances SM-4.

*Note: these are illustrative POC targets on sample data, not measurements from a production system — say so explicitly when presenting.*

## 8. Open Questions

1. Who exactly is the internal pitch audience beyond "stakeholders/employer" — does the demo need to satisfy a specific decision-maker's concerns (budget owner vs. engineering lead)?
2. Should Epic 2 (Doc Linker) be built at reduced scope or fully cut if Day 5 runs behind, per `spec.md` §4's stated fallback (static slides)?
3. What real system of record will FR-13's "Delegate" and FR-1's "Refresh data" eventually write to, once this leaves POC stage (Jira write-back was explicitly deferred)?

## 9. Assumptions Index

- §6.1 — Sample JSON fixtures are structurally identical to real Jira/Confluence/ops-inbox exports, so swapping in live APIs later is a data-source change, not a schema change. [ASSUMPTION, carried from `spec.md` §4]
- §4.5 FR-13/FR-14 — Delegation and drafting never write back to a real system of record in v1; every action requiring an external effect is a manual human step. [ASSUMPTION, carried from `spec.md` §4]
