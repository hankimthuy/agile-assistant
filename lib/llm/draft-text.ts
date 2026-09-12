import { generateWithGemini, isLLMAvailable } from './gemini-client';
import { daysSince } from '../config';
import type { DraftResult, OpsItem } from '../types';

function buildPrompt(item: OpsItem): string {
  if (item.type === 'pending_approval') {
    const waited = item.sentDate ? daysSince(item.sentDate) : undefined;
    return `Draft a short, polite follow-up reminder email from a Scrum Master to
${item.waitingOn ?? 'the approver'}, chasing an approval that has been pending
${waited ?? 'several'} days: "${item.title}". Keep it under 80 words, friendly
but clear that it's blocking. Respond in exactly this format:
SUBJECT: <subject line>
BODY: <email body>`;
  }
  return `Draft a short, clear status-update email reply from a Scrum Master
responding to: "${item.title}". Keep it under 80 words, plain business
language, no jargon. Respond in exactly this format:
SUBJECT: <subject line>
BODY: <email body>`;
}

function fallbackDraft(item: OpsItem): { subject: string; body: string } {
  if (item.type === 'pending_approval') {
    const waited = item.sentDate ? daysSince(item.sentDate) : undefined;
    return {
      subject: `Follow-up: ${item.title}`,
      body: `Hi ${item.waitingOn ?? 'there'},\n\nJust following up on "${item.title}" — it's been ${waited ?? 'a few'} day${waited === 1 ? '' : 's'} since I sent this over. Could you take a look when you get a chance? Happy to answer any questions.\n\nThanks,\nScrum Master`,
    };
  }
  return {
    subject: `Re: ${item.title}`,
    body: `Hi,\n\nThanks for your patience. Here's a quick update on "${item.title}" — I'll follow up with specifics shortly, but wanted to acknowledge this so it isn't sitting unanswered.\n\nBest,\nScrum Master`,
  };
}

function parseResponse(text: string): { subject: string; body: string } | null {
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);
  if (!subjectMatch || !bodyMatch) return null;
  return { subject: subjectMatch[1].trim(), body: bodyMatch[1].trim() };
}

export async function draftText(item: OpsItem): Promise<DraftResult> {
  if (item.type !== 'needs_email' && item.type !== 'pending_approval') {
    throw new Error(`Draft is only available for "needs_email" or "pending_approval" items, got "${item.type}"`);
  }

  let draft: { subject: string; body: string };
  let generatedByLLM = false;

  if (isLLMAvailable()) {
    try {
      const text = await generateWithGemini(buildPrompt(item));
      draft = parseResponse(text) ?? fallbackDraft(item);
      generatedByLLM = true;
    } catch (err) {
      console.error(`[draft-text] Gemini call failed for ${item.id}, falling back:`, err);
      draft = fallbackDraft(item);
    }
  } else {
    draft = fallbackDraft(item);
  }

  return { itemId: item.id, subject: draft.subject, body: draft.body, generatedByLLM };
}
