import { isoDate, parseISO, mondayOf } from './format.js';

const REQUIRED = ['meta', 'modules', 'terms', 'holidays', 'weekOverrides', 'schedules'];

export function validateSchedule(raw) {
  for (const key of REQUIRED) {
    if (!(key in raw)) throw new Error(`schedule.json: немає поля "${key}"`);
  }

  if (!Array.isArray(raw.holidays)) {
    throw new Error('schedule.json: "holidays" має бути масивом');
  }
  if (!Array.isArray(raw.terms)) {
    throw new Error('schedule.json: "terms" має бути масивом');
  }

  if (!Array.isArray(raw.schedules) || raw.schedules.length === 0) {
    throw new Error('schedule.json: "schedules" має бути непорожнім масивом');
  }

  let previous = '';
  for (const entry of raw.schedules) {
    if (!entry.validFrom) {
      throw new Error('schedule.json: у записі schedules немає "validFrom"');
    }
    if (entry.validFrom <= previous) {
      throw new Error(
        `schedule.json: записи schedules не впорядковані за validFrom ` +
        `("${entry.validFrom}" стоїть після "${previous}")`
      );
    }
    previous = entry.validFrom;

    if (parseISO(entry.validFrom).getDay() !== 1) {
      throw new Error(`schedule.json: validFrom "${entry.validFrom}" має бути понеділком`);
    }

    const anchor = entry.anchor;
    if (!anchor || !anchor.weekStart || !anchor.color) {
      throw new Error(`schedule.json: у записі ${entry.validFrom} неповний "anchor"`);
    }
    if (anchor.color !== 'yellow' && anchor.color !== 'blue') {
      throw new Error(`schedule.json: anchor.color має бути "yellow" або "blue"`);
    }
    if (parseISO(anchor.weekStart).getDay() !== 1) {
      throw new Error(`schedule.json: anchor.weekStart "${anchor.weekStart}" має бути понеділком`);
    }
    for (const color of ['yellow', 'blue']) {
      if (!entry.weeks || !entry.weeks[color]) {
        throw new Error(`schedule.json: у записі ${entry.validFrom} немає тижня "${color}"`);
      }
      for (const [day, modules] of Object.entries(entry.weeks[color])) {
        for (const [key, lesson] of Object.entries(modules)) {
          if (!(key in raw.modules)) {
            throw new Error(
              `schedule.json: у ${color}/${day} є модуль "${key}", якого немає в "modules"`
            );
          }
          if (typeof lesson.subject !== 'string' || lesson.subject.length === 0) {
            throw new Error(`schedule.json: у ${color}/${day}/${key} немає поля "subject"`);
          }
          if (!Array.isArray(lesson.teachers) || lesson.teachers.length === 0) {
            throw new Error(
              `schedule.json: у ${color}/${day}/${key} порожній або відсутній "teachers"`
            );
          }
        }
      }
    }
  }

  for (const [monday, color] of Object.entries(raw.weekOverrides)) {
    if (color !== 'yellow' && color !== 'blue') {
      throw new Error(`schedule.json: weekOverrides["${monday}"] має бути "yellow" або "blue"`);
    }
    if (parseISO(monday).getDay() !== 1) {
      throw new Error(`schedule.json: ключ weekOverrides "${monday}" має бути понеділком`);
    }
  }

  return raw;
}

export function scheduleFor(date, data) {
  const iso = isoDate(mondayOf(date));
  let picked = data.schedules[0];
  for (const entry of data.schedules) {
    if (entry.validFrom <= iso) picked = entry;
  }
  return picked;
}

export async function loadSchedule(url = './schedule.json') {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити ${url}: ${response.status}`);
  }
  return validateSchedule(await response.json());
}
