// Derive productivity stats from the store (pure JS, no AI).
import { dayKey, addDays, today0 } from './utils';

function countDay(arr) {
  let total = 0, done = 0;
  for (const it of arr || []) {
    if (it.header) continue;
    total++;
    if (it.done) done++;
  }
  return { total, done };
}

export function computeStats(store, boardNames = []) {
  const days = store.days || {};
  const listsByBoard = store.listsByBoard || {};
  const base = today0();
  const todayKey = dayKey(base);

  const dayCounts = (key) => countDay(days[key]);

  // Last 7 days, oldest -> newest
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(base, -i);
    const key = dayKey(d);
    last7.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      ...dayCounts(key),
    });
  }
  const weekDone = last7.reduce((s, d) => s + d.done, 0);
  const weekTotal = last7.reduce((s, d) => s + d.total, 0);

  // Current streak: consecutive days (ending today, with a grace day if today
  // has nothing done yet) that have at least one completed task.
  let streak = 0;
  const startOffset = dayCounts(todayKey).done === 0 ? 1 : 0;
  for (let i = startOffset; i < 400; i++) {
    if (dayCounts(dayKey(addDays(base, -i))).done >= 1) streak++;
    else break;
  }

  // All-time day totals
  let allDone = 0, allTotal = 0;
  for (const key in days) {
    const c = dayCounts(key);
    allDone += c.done;
    allTotal += c.total;
  }

  // Effort breakdown per board (custom lists)
  const boards = [];
  for (const idx in listsByBoard) {
    const lists = listsByBoard[idx] || [];
    let open = 0, done = 0;
    for (const l of lists) {
      for (const it of l.items || []) {
        if (it.header) continue;
        if (it.done) done++; else open++;
      }
    }
    boards.push({
      name: boardNames[idx] || `Board ${Number(idx) + 1}`,
      listCount: lists.length,
      open,
      done,
      total: open + done,
    });
  }
  // Most active board by total items
  boards.sort((a, b) => b.total - a.total);

  return {
    today: dayCounts(todayKey),
    week: { done: weekDone, total: weekTotal, rate: weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0 },
    last7,
    streak,
    allTime: { done: allDone, total: allTotal },
    boards,
  };
}
