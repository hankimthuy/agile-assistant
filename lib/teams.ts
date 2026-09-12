// AD-3: this is the only external side effect the app is allowed to perform.
// A failure here is logged and returned as a non-blocking result — it never
// throws past this function, so the calling route can turn it into a
// { ok: false } response instead of a 500 / crash.

export interface TeamsSendResult {
  ok: boolean;
  error?: string;
}

export async function sendToTeams(text: string): Promise<TeamsSendResult> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[teams] TEAMS_WEBHOOK_URL is not set; skipping send.');
    return { ok: false, error: 'TEAMS_WEBHOOK_URL is not configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[teams] Webhook returned ${response.status}: ${body}`);
      return { ok: false, error: `Teams webhook returned ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[teams] Webhook POST failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error posting to Teams' };
  }
}
