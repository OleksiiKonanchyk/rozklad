import { minutesOfDay, daysBetween } from './format.js';
import { weekColorFor, holidayFor, nextSchoolDay } from './calendar.js';
import { lessonsFor } from './day.js';

function nextDayView(from, data) {
  const date = nextSchoolDay(from, data);
  if (!date) return null;
  return {
    date,
    color: weekColorFor(date, data),
    lessons: lessonsFor(date, data),
    isTomorrow: daysBetween(from, date) === 1,
  };
}

export function stateAt(now, data) {
  const nextDay = nextDayView(now, data);

  const holiday = holidayFor(now, data);
  if (holiday) {
    return { kind: 'holiday', date: now, color: null, lessons: [], nextDay, holiday };
  }

  const weekday = now.getDay();
  if (weekday === 0 || weekday === 6) {
    return { kind: 'weekend', date: now, color: null, lessons: [], nextDay };
  }

  const lessons = lessonsFor(now, data);
  const base = { date: now, color: weekColorFor(now, data), lessons, nextDay };
  const t = minutesOfDay(now);

  if (lessons.length === 0) {
    return { ...base, kind: 'after-school', endedAt: null };
  }

  const first = lessons[0];
  if (t < first.from) {
    return { ...base, kind: 'before-school', upcoming: first, minutesLeft: first.from - t };
  }

  const last = lessons.at(-1);
  if (t >= last.to) {
    return { ...base, kind: 'after-school', endedAt: last.to };
  }

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];

    if (t < lesson.from) {
      const previous = lessons[i - 1];
      return {
        ...base,
        kind: 'break-outer',
        previous,
        upcoming: lesson,
        minutesLeft: lesson.from - t,
        gap: lesson.from - previous.to,
      };
    }

    if (t < lesson.to) {
      for (const miniModule of lesson.miniModules) {
        if (t < miniModule.from) {
          return {
            ...base,
            kind: 'break-inner',
            current: lesson,
            nextMiniModule: miniModule,
            minutesLeft: miniModule.from - t,
          };
        }
        if (t < miniModule.to) {
          return {
            ...base,
            kind: 'lesson',
            current: lesson,
            miniModule,
            minutesLeft: miniModule.to - t,
            minutesElapsed: t - miniModule.from,
          };
        }
      }
    }
  }

  // Недосяжно: t уже перевірено на < last.to вище.
  return { ...base, kind: 'after-school', endedAt: last.to };
}
