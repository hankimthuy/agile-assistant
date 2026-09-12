import { generateWithGemini, isLLMAvailable } from './gemini-client';
import type { DelegationLabel, DelegationSuggestion, OpsItem } from '../types';

function buildPrompt(item: OpsItem): string {
  return `A Scrum Master has this task on their plate:
Title: "${item.title}"
Candidate people who could take it instead: ${item.candidateAssignees.length > 0 ? item.candidateAssignees.join(', ') : 'none identified'}

Decide whether the Scrum Master should do this themselves or delegate it.
Respond in exactly this format, two lines, nothing else:
LABEL: should_do_myself OR can_delegate
REASON: one short sentence explaining why`;
}

function fallbackSuggestion(item: OpsItem): DelegationSuggestion {
  if (item.candidateAssignees.length > 0) {
    return {
      itemId: item.id,
      label: 'can_delegate',
      reason: `${item.candidateAssignees.join(' or ')} ${item.candidateAssignees.length === 1 ? 'has' : 'have'} relevant context and capacity to take this on.`,
    };
  }
  return {
    itemId: item.id,
    label: 'should_do_myself',
    reason: 'No candidate assignee is identified yet for this item, so it stays with you for now.',
  };
}

function parseResponse(item: OpsItem, text: string): DelegationSuggestion | null {
  const labelMatch = text.match(/LABEL:\s*(should_do_myself|can_delegate)/i);
  const reasonMatch = text.match(/REASON:\s*(.+)/i);
  if (!labelMatch || !reasonMatch) return null;
  return {
    itemId: item.id,
    label: labelMatch[1].toLowerCase() as DelegationLabel,
    reason: reasonMatch[1].trim(),
  };
}

async function suggestOne(item: OpsItem): Promise<DelegationSuggestion> {
  if (!isLLMAvailable()) return fallbackSuggestion(item);
  try {
    const text = await generateWithGemini(buildPrompt(item));
    return parseResponse(item, text) ?? fallbackSuggestion(item);
  } catch (err) {
    console.error(`[suggest-delegate] Gemini call failed for ${item.id}, falling back:`, err);
    return fallbackSuggestion(item);
  }
}

export async function suggestDelegations(items: OpsItem[]): Promise<DelegationSuggestion[]> {
  const delegatable = items.filter((i) => i.type === 'delegatable');
  return Promise.all(delegatable.map(suggestOne));
}
