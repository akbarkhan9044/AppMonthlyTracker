// Serverless proxy to Claude. Keeps ANTHROPIC_API_KEY server-side.
// Set the key in Netlify: Site settings → Environment variables → ANTHROPIC_API_KEY
const MODEL = 'claude-haiku-4-5-20251001';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }) };
  }

  let stats;
  try {
    stats = JSON.parse(event.body || '{}').stats;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }
  if (!stats) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing stats.' }) };
  }

  const prompt =
    `You are a concise, encouraging productivity coach inside a to-do app called "Atomic Tracker". ` +
    `Using the user's stats JSON below, write a short daily/weekly update of 2-4 sentences. ` +
    `Mention: their current streak, how today and this week are going (completed vs total), ` +
    `and which board/area they're putting the most effort into. Use the real numbers, be warm but not cheesy, ` +
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
      return { statusCode: resp.status, body: JSON.stringify({ error: 'Claude API error', detail }) };
    }
    const data = await resp.json();
    const summary = (data.content || []).map((b) => b.text || '').join('').trim();
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ summary }),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to reach Claude.', detail: String(e) }) };
  }
};
