// Serverless proxy to WakaTime. Keeps WAKATIME_API_KEY server-side.
// Set the key in Netlify: Site configuration → Environment variables → WAKATIME_API_KEY
// (Get it from wakatime.com → Settings → Account → API Key)
const BASE = 'https://wakatime.com/api/v1';

// CORS so the mobile app (a different origin) can call this endpoint.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (statusCode, obj) => ({
  statusCode,
  headers: { ...CORS, 'content-type': 'application/json' },
  body: JSON.stringify(obj),
});

function ymd(d) {
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0');
}

export const handler = async (event) => {
  if (event?.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  const key = process.env.WAKATIME_API_KEY;
  if (!key) {
    return json(500, { error: 'WAKATIME_API_KEY is not configured on the server.' });
  }
  const auth = 'Basic ' + Buffer.from(key).toString('base64');
  const headers = { Authorization: auth };

  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 6);

  try {
    const [summariesRes, statsRes] = await Promise.all([
      fetch(`${BASE}/users/current/summaries?start=${ymd(start)}&end=${ymd(today)}`, { headers }),
      fetch(`${BASE}/users/current/stats/last_7_days`, { headers }),
    ]);

    if (!summariesRes.ok) {
      const detail = await summariesRes.text();
      return json(summariesRes.status, { error: 'WakaTime API error', detail });
    }

    const summaries = await summariesRes.json();
    const stats = statsRes.ok ? (await statsRes.json()).data || {} : {};

    const last7 = (summaries.data || []).map((d) => ({
      date: d.range?.date,
      seconds: d.grand_total?.total_seconds || 0,
      text: d.grand_total?.text || '0 secs',
    }));
    const todayEntry = last7[last7.length - 1] || { seconds: 0, text: '0 secs' };
    const weekSeconds = last7.reduce((s, d) => s + d.seconds, 0);

    const out = {
      todaySeconds: todayEntry.seconds,
      todayText: todayEntry.text,
      weekSeconds,
      weekText: stats.human_readable_total || null,
      dailyAverageText: stats.human_readable_daily_average || null,
      last7,
      projects: (stats.projects || []).slice(0, 5).map((p) => ({ name: p.name, text: p.text, percent: p.percent })),
      languages: (stats.languages || []).slice(0, 5).map((l) => ({ name: l.name, text: l.text, percent: l.percent })),
    };

    return json(200, out);
  } catch (e) {
    return json(502, { error: 'Failed to reach WakaTime.', detail: String(e) });
  }
};
