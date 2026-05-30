// Date helpers
export const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function dayKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function today0() {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

export function fmtTopDate(d) {
  return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Storage
const STORE_KEY = 'dayboard.v1';

export const SEED_BOARDS = ['Personal', 'Someday', 'Groceries', 'Interior design'];

export function buildSeed() {
  // Start empty — the user enters their own to-dos and lists.
  return { days: {}, listsByBoard: {} };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Migrate old format (lists array) to new format (listsByBoard)
      if (data.lists && !data.listsByBoard) {
        data.listsByBoard = { 0: data.lists };
        delete data.lists;
      }
      return data;
    }
  } catch (e) {}
  return buildSeed();
}

export function saveStore(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch (e) {}
}

export const FONT_STEPS = { 1: 14, 3: 16, 5: 18, 7: 21 };
export const ACCENTS = ['#6d3bf0', '#e0457b', '#1f8a5b', '#2a6fdb', '#e0731f', '#111114'];
export const RAILS = ['#7c3bf0', '#e0457b', '#1f8a5b', '#2a6fdb', '#e0731f', '#15151a'];
