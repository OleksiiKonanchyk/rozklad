import { isoDate, parseISO, mondayOf, addDays, daysBetween } from './format.js';
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

export function weekColorFor(date, data) {
  const monday = mondayOf(date);
  const override = data.weekOverrides[isoDate(monday)];
  if (override) return override;

  const { anchor } = scheduleFor(date, data);
  const anchorMonday = mondayOf(parseISO(anchor.weekStart));
  const weeks = Math.round(daysBetween(anchorMonday, monday) / 7);
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
