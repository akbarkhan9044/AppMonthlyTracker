export const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function dayKey(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
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
