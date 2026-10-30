import { isoDate, parseISO, mondayOf, addDays } from './format.js';
import { scheduleFor } from './data.js';

const SEARCH_LIMIT_DAYS = 400;

export function isInTerm(date, data) {
  const iso = isoDate(date);
  return data.terms.some((term) => iso >= term.from && iso <= term.to);
}

export function holidayFor(date, data) {
  const iso = isoDate(date);
  const named = data.holidays.find((h) => iso >= h.from && iso <= h.to);
  if (named) return named;
  if (!isInTerm(date, data)) return { name: 'Канікули', from: null, to: null };
  return null;
}

function weekHasSchoolDay(monday, data) {
  return [0, 1, 2, 3, 4].some((offset) => isSchoolDay(addDays(monday, offset), data));
}

// Тижні з хоч одним уроком у проміжку [from, to).
function schoolWeeksBetween(from, to, data) {
  let count = 0;
  for (let m = from; isoDate(m) < isoDate(to); m = addDays(m, 7)) {
    if (weekHasSchoolDay(m, data)) count++;
  }
  return count;
}

// Тиждень суцільних канікул не бере участі в чергуванні: школа повертається
// на тому кольорі, якого ще не було. Тому рахуємо не всі тижні від опорного,
// а лише навчальні. Канікулярному тижню при цьому дістається колір того, що
// буде після нього, — саме це й показує вкладка «Тиждень» на канікулах.
export function weekColorFor(date, data) {
  const monday = mondayOf(date);
  const override = data.weekOverrides[isoDate(monday)];
  if (override) return override;

  const { anchor } = scheduleFor(date, data);
  const anchorMonday = mondayOf(parseISO(anchor.weekStart));
  const weeks = isoDate(monday) >= isoDate(anchorMonday)
    ? schoolWeeksBetween(anchorMonday, monday, data)
    : -schoolWeeksBetween(monday, anchorMonday, data);
  const isEven = ((weeks % 2) + 2) % 2 === 0;
  const opposite = anchor.color === 'yellow' ? 'blue' : 'yellow';
  return isEven ? anchor.color : opposite;
}

export function isSchoolDay(date, data) {
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) return false;
  return holidayFor(date, data) === null;
}

export function nextSchoolDay(date, data) {
  let candidate = addDays(date, 1);
  for (let i = 0; i < SEARCH_LIMIT_DAYS; i++) {
    if (isSchoolDay(candidate, data)) return candidate;
    candidate = addDays(candidate, 1);
  }
  return null;
}
