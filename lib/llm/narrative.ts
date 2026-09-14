import { generateWithGemini, isLLMAvailable } from './gemini-client';
import { computeSprintMetrics } from '../metrics';
import type { ReportResult, SprintData } from '../types';

function buildPrompt(data: SprintData, metrics: ReturnType<typeof computeSprintMetrics>): string {
  const ticketLines = data.tickets
    .map((t) => `- ${t.id} [${t.type}/${t.status}] ${t.title} (${t.storyPoints} pts, assignee: ${t.assignee})`)
    .join('\n');

  return `You are writing a sprint status report for a Product Manager who does not
read Jira. Write 3 to 5 sentences, in plain business language, summarizing what
this sprint delivered and any risk worth flagging. Do not use bullet points, do
not restate the raw numbers verbatim (they're shown separately), focus on
business value and outcomes. If tickets are still in progress, mention that
plainly without making the report sound broken or incomplete.

Sprint: ${data.sprint.name} (${data.sprint.startDate} to ${data.sprint.endDate})
Velocity: ${metrics.velocity} points completed
Completion rate: ${Math.round(metrics.completionRate * 100)}%
Bugs: ${metrics.openBugCount} open, ${metrics.closedBugCount} closed

Tickets:
${ticketLines}`;
}

function fallbackNarrative(data: SprintData, metrics: ReturnType<typeof computeSprintMetrics>): string {
  if (metrics.totalCount === 0) {
    return `${data.sprint.name} has no tickets tracked yet — there's nothing to report on until work is added to the sprint.`;
  }

  const inProgress = data.tickets.filter((t) => t.status !== 'done');
  const pct = Math.round(metrics.completionRate * 100);

  const sentences = [
    `${data.sprint.name} closed with ${metrics.doneCount} of ${metrics.totalCount} planned items delivered (${pct}% completion), for a velocity of ${metrics.velocity} story points.`,
    metrics.closedBugCount > 0
      ? `The team also resolved ${metrics.closedBugCount} bug${metrics.closedBugCount === 1 ? '' : 's'} during the sprint, reducing risk for downstream work.`
      : `No bugs were closed out this sprint, so bug backlog is unchanged.`,
    metrics.openBugCount > 0
      ? `${metrics.openBugCount} bug${metrics.openBugCount === 1 ? ' remains' : 's remain'} open and worth tracking into next sprint.`
      : `There are no open bugs carrying into next sprint.`,
  ];

  if (inProgress.length > 0) {
    sentences.push(
      `${inProgress.length} item${inProgress.length === 1 ? ' is' : 's are'} still in progress and will roll into the next sprint rather than being lost.`
    );
  } else {
    sentences.push(`Every planned item reached done, a clean close for the sprint.`);
  }

  return sentences.join(' ');
}

export async function generateNarrativeReport(data: SprintData): Promise<ReportResult> {
  const metrics = computeSprintMetrics(data);

  let narrative: string;
  let generatedByLLM = false;

  if (isLLMAvailable()) {
    try {
      narrative = await generateWithGemini(buildPrompt(data, metrics));
      generatedByLLM = true;
    } catch (err) {
      console.error('[narrative] Gemini call failed, falling back to template:', err);
      narrative = fallbackNarrative(data, metrics);
    }
  } else {
    narrative = fallbackNarrative(data, metrics);
  }

  return {
    sprintId: data.sprint.id,
    sprintName: data.sprint.name,
    narrative,
    velocity: metrics.velocity,
    completionRate: metrics.completionRate,
    openBugCount: metrics.openBugCount,
    closedBugCount: metrics.closedBugCount,
    generatedByLLM,
  };
}
