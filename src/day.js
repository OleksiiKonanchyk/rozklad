import { toMinutes, dayKey } from './format.js';
import { scheduleFor } from './data.js';
import { weekColorFor, isSchoolDay } from './calendar.js';

export function lessonsFor(date, data) {
  if (!isSchoolDay(date, data)) return [];

  const schedule = scheduleFor(date, data);
  const color = weekColorFor(date, data);
  const day = schedule.weeks[color][dayKey(date)] ?? {};

  return Object.keys(day)
    .map(Number)
    .sort((a, b) => a - b)
    .map((module) => {
      const entry = day[String(module)];
      const spans = data.modules[String(module)];
      const miniModules = spans.map(([from, to], index) => ({
        n: index + 1,
        of: spans.length,
        from: toMinutes(from),
        to: toMinutes(to),
      }));
      return {
        module,
        subject: entry.subject,
        teachers: entry.teachers,
        from: miniModules[0].from,
        to: miniModules.at(-1).to,
        miniModules,
      };
    });
}
