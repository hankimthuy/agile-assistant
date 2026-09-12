// Shared domain types — match the Glossary in the PRD exactly (Ticket, Sprint,
// Doc, OpsItem) and the fixture schemas in spec.md §7.

export type TicketType = 'story' | 'task' | 'bug';
export type TicketStatus = 'to_do' | 'in_progress' | 'done';

export interface Ticket {
  id: string;
  title: string;
  type: TicketType;
  status: TicketStatus;
  storyPoints: number;
  assignee: string;
  acceptanceCriteria: string;
  labels: string[];
  lastUpdated: string; // ISO 8601 (YYYY-MM-DD)
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface SprintData {
  sprint: Sprint;
  tickets: Ticket[];
}

export interface Doc {
  title: string;
  url: string;
  labels: string[];
  lastUpdated: string;
}

export interface DocsData {
  pages: Doc[];
}

export type OpsItemType = 'task' | 'delegatable' | 'pending_approval' | 'needs_email';
export type OpsItemSource = 'jira' | 'teams' | 'email';

export interface OpsItem {
  id: string;
  type: OpsItemType;
  title: string;
  source: OpsItemSource;
  owner: string;
  candidateAssignees: string[];
  createdDate?: string; // task / delegatable / needs_email
  waitingOn?: string; // pending_approval
  sentDate?: string; // pending_approval
}

export interface OpsInboxData {
  items: OpsItem[];
}

// --- Derived / computed shapes returned by API routes ---

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface DocMatch {
  ticketId: string;
  doc: Doc;
  confidence: MatchConfidence;
  score: number;
}

export interface DocLinksResult {
  matches: DocMatch[];
  missingDocTicketIds: string[]; // tickets with zero match
  orphanedDocs: Doc[]; // docs referenced by no ticket
}

export type ViolationType = 'missing_acceptance_criteria' | 'missing_documentation' | 'stale';
export type Severity = 'high' | 'medium' | 'low';

export interface ProcessHealthViolation {
  ticketId: string;
  ticketTitle: string;
  type: ViolationType;
  severity: Severity;
  detail: string;
}

export interface ReportResult {
  sprintId: string;
  sprintName: string;
  narrative: string;
  velocity: number;
  completionRate: number; // 0..1
  openBugCount: number;
  closedBugCount: number;
  generatedByLLM: boolean;
}

export type DelegationLabel = 'should_do_myself' | 'can_delegate';

export interface DelegationSuggestion {
  itemId: string;
  label: DelegationLabel;
  reason: string;
}

export interface DraftResult {
  itemId: string;
  subject: string;
  body: string;
  generatedByLLM: boolean;
}

export interface ApiError {
  error: string;
}

// --- Performance Import (Pillar 5) ---
// Normalized shape for one row of a pasted/uploaded work-item export —
// CSV, TSV (e.g. pasted straight out of Excel), or JSON — from *any*
// source (Azure Boards, Jira, Trello, a plain spreadsheet, ...), not just
// one specific tool. "raw*" fields keep the original source value for
// display, since vocabulary for work-item type/state varies per tool and
// shouldn't be silently discarded.

export interface ImportedWorkItem {
  id: string;
  title: string;
  workItemType: TicketType | 'other';
  rawWorkItemType: string;
  state: TicketStatus | 'other';
  rawState: string;
  storyPoints: number;
  assignedTo: string;
  iterationPath: string;
  severity?: string;
  createdDate?: string;
  changedDate?: string;
  closedDate?: string;
}

export interface PerformanceImportResult {
  sprintLabel: string;
  workItems: ImportedWorkItem[];
  warnings: string[];
}

export interface VelocityReport {
  totalItems: number;
  doneItems: number;
  completionRate: number; // 0..1
  velocity: number; // sum of storyPoints on done items
  byType: Record<TicketType | 'other', { total: number; done: number }>;
  headline: string;
}

export interface SeverityCount {
  severity: string;
  count: number;
}

export interface QualityReport {
  totalBugs: number;
  openBugs: number;
  closedBugs: number;
  bugRatio: number; // bugs / totalItems, 0..1
  hasSeverityData: boolean;
  bySeverity: SeverityCount[];
  headline: string;
}

export interface AssigneeWorkload {
  assignee: string;
  total: number;
  done: number;
}

export interface StaleItem {
  id: string;
  title: string;
  daysSinceUpdate: number;
}

export interface WorkloadReport {
  byAssignee: AssigneeWorkload[];
  staleDays: number;
  staleItems: StaleItem[];
  headline: string;
}

export interface PerformanceImportReport {
  sprintLabel: string;
  velocity: VelocityReport;
  quality: QualityReport;
  workload: WorkloadReport;
  warnings: string[];
}
