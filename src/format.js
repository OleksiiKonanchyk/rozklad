const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const WEEKDAYS = [
  'неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота',
];

const MONTHS_GENITIVE = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

const MS_PER_DAY = 86400000;

export function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toHHMM(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, n) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Math.round гасить 23- і 25-годинні добові переходу на зимовий/літній час.
export function daysBetween(a, b) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

export function mondayOf(date) {
  const shift = (date.getDay() + 6) % 7; // нд=0 → 6, пн=1 → 0
  return addDays(date, -shift);
}

export function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayKey(date) {
  return DAY_KEYS[date.getDay()];
}

export function weekdayName(date) {
  return WEEKDAYS[date.getDay()];
}

export function formatDateLong(date) {
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

export function humanMinutes(n) {
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  let word;
  if (lastDigit === 1 && lastTwo !== 11) {
    word = 'хвилина';
  } else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    word = 'хвилини';
  } else {
    word = 'хвилин';
  }
  return `${n} ${word}`;
}
