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

// Seed data by offset from today
const SEED_BY_OFFSET = {
  0: [
    { t: 'Run @ 7 AM', done: false, recur: true },
    { t: 'Update roadmap', done: false },
    { t: 'Buy a birthday gift for Xavier', done: false },
    { t: 'Catch up on newsletter copy', done: false },
    { t: 'AFTERNOON', header: true },
    { t: 'Pick up CSA 4:30—7:30', done: false },
    { t: 'Drop-off dry cleaning', done: false }
  ],
  1: [
    { t: 'Run @ 7 AM', done: false, recur: true },
    { t: 'Update roadmap', done: false },
    { t: 'Team Weekly Meeting @ 11', done: false },
    { t: "Ben's soccer practice 5:30—7:00", done: false }
  ],
  2: [
    { t: 'Yoga @ 9 AM', done: false },
    { t: 'Update roadmap', done: false },
    { t: 'Schedule newsletter for Monday', done: false },
    { t: 'Order cupcakes', done: false },
    { t: 'EVENING', header: true },
    { t: 'Dinner with Rob & Sarah', done: false }
  ],
  3: [
    { t: 'Farmers market at the park', done: false },
    { t: 'Dry cleaning', done: true },
    { t: 'CAR STUFF', header: true },
    { t: 'Drop off at 4', done: false },
    { t: 'Ask about oil change', done: false }
  ],
  4: [
    { t: 'Pick up cupcakes', done: false },
    { t: "Xavier's birthday bbq @ 3 PM", done: false }
  ],
};

// Lists organized by board index
const SEED_LISTS_BY_BOARD = {
  0: [ // Personal
    { id: 'l_groc', name: 'GROCERY LIST', items: [
      { t: 'Avocados' }, { t: 'Limes' }, { t: 'Cilantro', done: true }, { t: 'Red onion', done: true }, { t: 'Jalapeños' }
    ]},
    { id: 'l_rest', name: 'RESTAURANTS', items: [
      { t: 'Sailor' }, { t: 'Café Paulette' }, { t: 'Rucola' }, { t: 'Franks Wine Bar' }
    ]},
    { id: 'l_amazing', name: 'AMAZING', items: [] },
    { id: 'l_test', name: 'TEST', items: [] },
  ],
  1: [ // Someday
    { id: 'l_books', name: 'BOOKS TO READ', items: [
      { t: 'Atomic Habits' }, { t: 'The Checklist Manifesto', done: true }, { t: 'Deep Work', done: true },
      { t: 'The Power of Habit', done: true }, { t: 'Eat That Frog' }, { t: '168 Hours' }
    ]},
    { id: 'l_movies', name: 'MOVIES TO WATCH', items: [
      { t: 'Inception' }, { t: 'The Matrix' }
    ]},
  ],
  2: [ // Groceries
    { id: 'l_weekly', name: 'WEEKLY GROCERIES', items: [
      { t: 'Milk' }, { t: 'Eggs' }, { t: 'Bread' }, { t: 'Butter' }
    ]},
    { id: 'l_produce', name: 'PRODUCE', items: [
      { t: 'Apples' }, { t: 'Bananas' }, { t: 'Spinach' }
    ]},
  ],
  3: [ // Interior design
    { id: 'l_buy', name: 'THINGS TO BUY', items: [
      { t: 'Espresso machine' }, { t: 'Vacuum that works' }, { t: 'Kitchen runner' }
    ]},
    { id: 'l_ideas', name: 'IDEAS', items: [
      { t: 'New curtains for bedroom' }, { t: 'Repaint living room' }
    ]},
  ],
};

export const SEED_BOARDS = ['Personal', 'Someday', 'Groceries', 'Interior design'];

export function buildSeed() {
  const base = today0();
  const days = {};
  for (const off in SEED_BY_OFFSET) {
    const k = dayKey(addDays(base, Number(off)));
    days[k] = SEED_BY_OFFSET[off].map(x => ({
      id: uid(),
      text: x.t,
      done: !!x.done,
      header: !!x.header,
      recur: !!x.recur
    }));
  }
  // Build lists organized by board
  const listsByBoard = {};
  for (const boardIdx in SEED_LISTS_BY_BOARD) {
    listsByBoard[boardIdx] = SEED_LISTS_BY_BOARD[boardIdx].map(l => ({
      id: l.id,
      name: l.name,
      items: l.items.map(i => ({
        id: uid(),
        text: i.t,
        done: !!i.done,
        header: false
      }))
    }));
  }
  return { days, listsByBoard };
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
