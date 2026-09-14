---
stepsCompleted: [requirements, epics, stories]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-agile-assistant-2026-09-12/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-agile-assistant-2026-09-12/ARCHITECTURE-SPINE.md
  - spec.md
---

# AgileCopilot - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for AgileCopilot, decomposing the requirements from the PRD and Architecture Spine into implementable stories for the 7-day POC build.

## Requirements Inventory

### Functional Requirements

- FR-1: Ingest sprint data
- FR-2: Generate business narrative report
- FR-3: Copy report summary for sharing
- FR-4: Ingest Confluence docs
- FR-5: Match ticket ↔ document
- FR-6: Flag missing / orphan docs
- FR-7: Define health rules
- FR-8: Compute & display health table
- FR-9: Report view
- FR-10: Process Health view
- FR-11: Doc Linker view
- FR-12: Gather all of the Scrum Master's work into one list
- FR-13: Delegation suggestions
- FR-14: Draft emails/messages
- FR-15: Track pending approvals
- FR-16: Ingest a sprint export from any tool
- FR-17: Velocity & Completion template
- FR-18: Quality & Bug Health template
- FR-19: Workload & Aging template

### NonFunctional Requirements

- Report generation completes in under 30 seconds on sample data (PRD FR-2).
- No auto-send / auto-assign anywhere — every external-facing action is a manual human click (Architecture AD-3).
- No real auth/SSO in the POC (Architecture, Deferred).

### Additional Requirements

- MoSCoW build order (PRD §6.2): Epic 1 and Epic 5 are must-have; Epic 3 and Epic 6 are should-have; Epic 2 is cut first if time runs short.
- Environment variables required: `GEMINI_API_KEY` (optional — spec.md §6).

### UX Design Requirements

No standalone UX spec exists yet for this POC. The signed-in Overview screen is the home screen and surfaces the Ops Hub's highlights first; Ops Hub (four columns/tabs: My Work / Delegatable / Awaiting Approval / Needs Reply), Report, Process Health, Doc Linker, and Performance Import are reached from the nav (PRD §4.4, §4.5).

### FR Coverage Map

| FR | Epic.Story |
| --- | --- |
| FR-1 | 1.1 |
| FR-2 | 1.2 |
| FR-3 | 1.3 |
| FR-4 | 2.1 |
| FR-5 | 2.2 |
| FR-6 | 2.3 |
| FR-7 | 3.1 |
| FR-8 | 3.2 |
| FR-9 | 4.1 |
| FR-10 | 4.2 |
| FR-11 | 4.3 |
| FR-12 | 5.1 |
| FR-13 | 5.2 |
| FR-14 | 5.3 |
| FR-15 | 5.4 |
| FR-16 | 6.1 |
| FR-17 | 6.2 |
| FR-18 | 6.3 |
| FR-19 | 6.4 |

## Epic List

1. Epic 1: Auto Report (must-have)
2. Epic 2: Doc Linker (cut first if time runs short)
3. Epic 3: Process Health (should-have)
4. Epic 4: Dashboard UI
5. Epic 5: Ops Hub (must-have)
6. Epic 6: Performance Import (should-have)

## Epic 1: Auto Report

Automate sprint reporting so the Scrum Master never hand-compiles a status report again, and the Product Owner always has a business-framed summary to read.

### Story 1.1: Ingest sprint data

As a Scrum Master,
I want the system to read ticket/sprint data from a sample file (or the Jira API),
So that I don't have to enter it by hand.

**Acceptance Criteria:**

**Given** a valid `jira-sprint-sample.json` matching the schema in spec.md §7
**When** the app loads or "Refresh data" is clicked
**Then** the sprint and its tickets render correctly on screen

**Given** a `jira-sprint-sample.json` missing a required field
**When** the app attempts to load it
**Then** a clear validation error is shown and the app does not crash

### Story 1.2: Generate business narrative report

As a Scrum Master (creating it) and Product Owner (reading it),
I want one click to produce a plain-language report plus key metrics,
So that I don't have to write it by hand.

**Acceptance Criteria:**

**Given** ingested sprint data
**When** "Generate Report" is clicked
**Then** the report shows a 3–5 sentence business-language summary, velocity, completion rate, and open/closed bug counts, generated in under 30 seconds

**Given** a sprint where some tickets are still "In Progress"
**When** the report is generated
**Then** the narrative still reads sensibly rather than looking broken or incomplete

### Story 1.3: Copy report summary for sharing

As a Scrum Master or Product Owner,
I want to copy the report summary to my clipboard in one click,
So that I can paste it wherever my team already reads updates.

**Acceptance Criteria:**

**Given** a generated report
**When** "Copy report" is clicked
**Then** a 2–3 sentence summary, key stats, and the full narrative are copied to the clipboard

**Given** the copy action runs
**When** it completes
**Then** it never fails due to a third-party service, since it makes no network call

## Epic 2: Doc Linker

Automatically connect tickets to the Confluence documentation that supports them, and surface both missing and orphaned documentation.

### Story 2.1: Ingest Confluence docs

As a Scrum Master,
I want the system to read documentation metadata from a sample file,
So that I don't have to catalog it by hand.

**Acceptance Criteria:**

**Given** a valid `confluence-pages-sample.json` matching the schema in spec.md §7
**When** the app loads it
**Then** each doc's title, URL, labels, and last-updated date render correctly

### Story 2.2: Match ticket ↔ document

As a Scrum Master,
I want the system to suggest documentation relevant to each ticket,
So that I don't have to search for it manually.

**Acceptance Criteria:**

**Given** ingested tickets and docs
**When** matching runs
**Then** matches are produced by overlapping labels plus title/keyword similarity, each shown with a low/medium/high confidence level

### Story 2.3: Flag missing / orphan docs

As a Scrum Master,
I want tickets with no documentation and docs with no referencing ticket both flagged,
So that gaps are visible without me hunting for them.

**Acceptance Criteria:**

**Given** a ticket with zero document matches
**When** the Doc Linker view renders
**Then** that ticket is flagged "Missing documentation"

**Given** a doc referenced by no ticket in the current sprint
**When** the Doc Linker view renders
**Then** that doc is flagged "Orphaned documentation"

## Epic 3: Process Health

Surface baseline process drift — missing acceptance criteria, missing docs, stale tickets — the moment it's detectable.

### Story 3.1: Define health rules

As a Scrum Master,
I want fixed, predictable rules applied to every ticket,
So that I don't have to manually audit process compliance.

**Acceptance Criteria:**

**Given** a ticket with an empty `acceptanceCriteria` field
**When** health rules run
**Then** it is flagged as a violation

**Given** a ticket with no linked document (per Epic 2)
**When** health rules run
**Then** it is flagged as a violation

**Given** a ticket not updated in more than N days (default 5, configurable)
**When** health rules run
**Then** it is flagged as a violation

### Story 3.2: Compute & display health table

As a Scrum Master,
I want a table of every violating ticket ranked by severity,
So that I can act on the worst gaps first.

**Acceptance Criteria:**

**Given** one or more Process Health violations
**When** the Process Health view renders
**Then** violating tickets are listed with a color-coded severity badge per violation type, sortable by severity

## Epic 4: Dashboard UI

Present all five pillars in one web dashboard; the signed-in Overview screen is the home screen and surfaces Ops Hub's highlights first (Epic 5), the other pillars are views reached from the nav.

### Story 4.1: Report view

As a Scrum Master,
I want the Report pillar rendered as its own dashboard view,
So that I can review and copy it without leaving the app.

**Acceptance Criteria:**

**Given** a generated report
**When** the Report view opens
**Then** the narrative and stat tiles (velocity, completion %, bugs) render, with a "Copy report" control

### Story 4.2: Process Health view

As a Scrum Master,
I want the Process Health pillar rendered as its own dashboard view,
So that I can filter and review violations.

**Acceptance Criteria:**

**Given** computed Process Health violations
**When** the Process Health view opens
**Then** the violation table renders with a filter by violation type

### Story 4.3: Doc Linker view

As a Scrum Master,
I want the Doc Linker pillar rendered as its own dashboard view,
So that I can review matches and orphaned docs.

**Acceptance Criteria:**

**Given** computed ticket↔doc matches and orphan flags
**When** the Doc Linker view opens
**Then** the match list and the orphaned-doc list both render

## Epic 5: Ops Hub

Give the Scrum Master one place to see everything on their plate — their own tasks, delegatable work, pending approvals, and unanswered messages — with AI-drafted suggestions and replies that a human always reviews before acting.

### Story 5.1: Gather all of the Scrum Master's work into one list

As a Scrum Master,
I want every item needing my attention in one place,
So that I don't have to remember or hunt for it across multiple tools.

**Acceptance Criteria:**

**Given** a valid `ops-inbox-sample.json` matching the schema in spec.md §7
**When** the Ops Hub loads
**Then** items render in four groups — My Work / Delegatable / Awaiting Approval / Needs Reply — each item showing its source (Jira/Teams/Email) and how many days it has been open

### Story 5.2: Delegation suggestions

As a Scrum Master,
I want the system to suggest which work can be delegated to whom, with a reason,
So that I can decide quickly instead of weighing every item myself.

**Acceptance Criteria:**

**Given** a delegatable item with candidate assignees
**When** the Ops Hub renders it
**Then** it is labeled "should do myself" or "can delegate" with a one-sentence reason based on `candidateAssignees`

**Given** a labeled delegatable item
**When** "Delegate" is clicked
**Then** its status updates in the UI only (no live Jira write-back in the POC)

### Story 5.3: Draft emails/messages

As a Scrum Master,
I want AI to draft response content for me,
So that I only need to read and send instead of writing from scratch.

**Acceptance Criteria:**

**Given** an item of type `needs_email` or `pending_approval`
**When** "Draft" is clicked
**Then** editable draft content is generated from that item's context, with a "Copy" control, and nothing is auto-sent

### Story 5.4: Track pending approvals

As a Scrum Master,
I want to see clearly what's waiting on whose approval and for how long,
So that I can proactively follow up instead of waiting passively.

**Acceptance Criteria:**

**Given** a `pending_approval` item
**When** the Ops Hub renders it
**Then** it shows who must approve it, when it was sent, and how many days it has waited, with a red badge once the wait exceeds N days (default 3, configurable)

**Given** a `pending_approval` item shown with a wait-time badge
**When** "Draft reminder" is clicked
**Then** it reuses Story 5.3's drafting behavior

## Epic 6: Performance Import

On-demand analysis of a sprint export pasted/uploaded from any tool (Azure Boards, Jira, Trello, a plain spreadsheet), used directly by both the Scrum Master and the Product Owner — no live connection to any of those tools.

### Story 6.1: Ingest a sprint export from any tool

As a Scrum Master or Product Owner,
I want to paste or upload the CSV/TSV/JSON export I already have,
So that I don't have to re-enter anything by hand or wait for a real integration.

**Acceptance Criteria:**

**Given** pasted text or an uploaded `.csv`/`.tsv`/`.txt`/`.json` file
**When** the format is auto-detected (comma vs. tab; JSON array vs. Azure query shape vs. Trello board export)
**Then** rows are normalized into work items, tolerating column-name variants across tools and object-valued fields (e.g. Azure's `AssignedTo`)

**Given** malformed or empty input, or a merely incomplete export (e.g. no Story Points column)
**When** it is submitted
**Then** a clear error is shown for unusable input, or a report is still produced with the gap surfaced as a data-quality note — never a hard crash

### Story 6.2: Velocity & Completion template

As a Scrum Master or Product Owner,
I want velocity, completion rate, and a by-type breakdown computed from the imported export,
So that I can report on work tracked in any tool.

**Acceptance Criteria:**

**Given** normalized work items
**When** the report is computed
**Then** velocity (sum of Story Points on done-equivalent items), completion rate, and a by-type (story/task/bug/other) breakdown render

### Story 6.3: Quality & Bug Health template

As a Scrum Master or Product Owner,
I want open/closed bug counts and a severity breakdown from the imported export,
So that quality trends are visible without a separate report.

**Acceptance Criteria:**

**Given** normalized work items
**When** the report is computed
**Then** total/open/closed bug counts and bug ratio render, with a severity breakdown when a Severity/Priority column exists, otherwise a plain note

### Story 6.4: Workload & Aging template

As a Scrum Master or Product Owner,
I want to see work distributed by assignee and flag items that have gone stale,
So that I can spot an overloaded teammate or a forgotten item.

**Acceptance Criteria:**

**Given** normalized work items with a last-changed date
**When** the report is computed
**Then** item counts (total/done) group by assignee, and items past the configurable stale-after-N-days threshold (Story 3.1's Rule 3, reused) are flagged
