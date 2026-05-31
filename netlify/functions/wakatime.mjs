// Serverless proxy to WakaTime. Keeps WAKATIME_API_KEY server-side.
// Set the key in Netlify: Site configuration → Environment variables → WAKATIME_API_KEY
// (Get it from wakatime.com → Settings → Account → API Key)
const BASE = 'https://wakatime.com/api/v1';

function ymd(d) {
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0');
}

export const handler = async () => {
  const key = process.env.WAKATIME_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'WAKATIME_API_KEY is not configured on the server.' }) };
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
      return { statusCode: summariesRes.status, body: JSON.stringify({ error: 'WakaTime API error', detail }) };
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

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to reach WakaTime.', detail: String(e) }) };
  }
};
