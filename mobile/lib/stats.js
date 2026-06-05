import { addDays, dayKey, today0 } from './dates';

function countDay(arr) {
  let total = 0, done = 0;
  for (const it of arr || []) {
    if (it.header) continue;
    total++;
    if (it.done) done++;
  }
  return { total, done };
}

export function computeStats(store) {
  const days = store.days || {};
  const base = today0();
  const todayKey = dayKey(base);
  const dc = (k) => countDay(days[k]);

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(base, -i);
    const k = dayKey(d);
    last7.push({ key: k, label: d.toLocaleDateString(undefined, { weekday: 'short' }), ...dc(k) });
  }
  const weekDone = last7.reduce((s, d) => s + d.done, 0);
  const weekTotal = last7.reduce((s, d) => s + d.total, 0);

  let streak = 0;
  const off = dc(todayKey).done === 0 ? 1 : 0;
  for (let i = off; i < 400; i++) {
    if (dc(dayKey(addDays(base, -i))).done >= 1) streak++;
    else break;
  }

  let allDone = 0, allTotal = 0;
  for (const k in days) {
    const c = dc(k);
    allDone += c.done;
    allTotal += c.total;
  }

  return {
    today: dc(todayKey),
    week: { done: weekDone, total: weekTotal, rate: weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0 },
    last7,
    streak,
    allTime: { done: allDone, total: allTotal },
  };
}

// 100 Days challenge — a day counts when >=2 tasks done OR >=1h coded.
export const CODE_GOAL = 3600;
export const TASK_GOAL = 2;

export function computeChallenge(store, challenge, todaySeconds) {
  if (!challenge?.startKey) return null;
  const [sy, sm, sd] = challenge.startKey.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  start.setHours(0, 0, 0, 0);
  const todayK = dayKey(today0());
  const days = [];
  let completed = 0, currentDay = 0;

  for (let i = 0; i < 100; i++) {
    const d = addDays(start, i);
    const k = dayKey(d);
    const isToday = k === todayK;
    const isPast = k < todayK;
    const tasksCount = (store.days[k] || []).filter((it) => !it.header && it.done).length;
    const coded = isToday && todaySeconds != null ? todaySeconds : (challenge.coded?.[k] || 0);
    const counts = tasksCount >= TASK_GOAL || coded >= CODE_GOAL;
    let status;
    if (counts) { status = 'done'; completed++; }
    else if (isToday) status = 'today';
    else if (isPast) status = 'missed';
    else status = 'upcoming';
    if (isPast || isToday) currentDay = i + 1;
    days.push({ key: k, n: i + 1, status, tasksCount, coded });
  }
  return {
    days,
    completed,
    currentDay: Math.min(currentDay, 100),
    today: days.find((d) => d.key === todayK) || null,
  };
}
