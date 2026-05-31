// Serverless proxy to Claude. Keeps ANTHROPIC_API_KEY server-side.
// Set the key in Netlify: Site settings → Environment variables → ANTHROPIC_API_KEY
const MODEL = 'claude-haiku-4-5-20251001';

// CORS so the mobile app (a different origin) can call this endpoint.
// Lock Allow-Origin down to your app's origin in production if you prefer.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (statusCode, obj) => ({
  statusCode,
  headers: { ...CORS, 'content-type': 'application/json' },
  body: JSON.stringify(obj),
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return json(500, { error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  let stats;
  try {
    stats = JSON.parse(event.body || '{}').stats;
  } catch {
    return json(400, { error: 'Invalid request body.' });
  }
  if (!stats) {
    return json(400, { error: 'Missing stats.' });
  }

  const prompt =
    `You are a concise, encouraging productivity coach inside a to-do app called "Atomic Tracker". ` +
    `Using the user's stats JSON below, write a short daily/weekly update of 2-4 sentences. ` +
    `Mention: their current streak, how today and this week are going (completed vs total), ` +
    `and which board/area they're putting the most effort into. ` +
    `If a "coding" field is present (WakaTime data), also weave in how much they coded today/this week and their top project or language. ` +
    `Use the real numbers, be warm but not cheesy, ` +
    `and offer one small, concrete nudge. Plain text only — no markdown headers or bullet lists.\n\n` +
    `Stats:\n${JSON.stringify(stats)}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 350,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json(resp.status, { error: 'Claude API error', detail });
    }
    const data = await resp.json();
    const summary = (data.content || []).map((b) => b.text || '').join('').trim();
    return json(200, { summary });
  } catch (e) {
    return json(502, { error: 'Failed to reach Claude.', detail: String(e) });
  }
};
