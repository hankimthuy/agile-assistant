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
