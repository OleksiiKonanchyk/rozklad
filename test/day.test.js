import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { lessonsFor } from '../src/day.js';

const data = JSON.parse(readFileSync(new URL('../schedule.json', import.meta.url)));

describe('lessonsFor', () => {
  it('жовта середа — два модулі', () => {
    const lessons = lessonsFor(new Date(2026, 8, 9), data);
    expect(lessons.map((l) => l.subject)).toEqual(['Математика', 'Англійська мова']);
    expect(lessons.map((l) => l.module)).toEqual([2, 3]);
  });

  it('межі дня рахуються з модулів', () => {
    const lessons = lessonsFor(new Date(2026, 8, 9), data);
    expect(lessons[0].from).toBe(595);   // 9:55
    expect(lessons.at(-1).to).toBe(820); // 13:40
  });

  it('міні-модулі мають правильні межи та нумерацію', () => {
    const [math] = lessonsFor(new Date(2026, 8, 9), data);
    expect(math.miniModules).toEqual([
      { n: 1, of: 3, from: 595, to: 625 },
      { n: 2, of: 3, from: 630, to: 660 },
      { n: 3, of: 3, from: 665, to: 695 },
    ]);
  });

  it('модулі впорядковані числом, а не рядком', () => {
    const lessons = lessonsFor(new Date(2026, 8, 10), data); // жовтий чт: 3, 4, 5
    expect(lessons.map((l) => l.module)).toEqual([3, 4, 5]);
  });

  it('підгрупи дають двох учителів', () => {
    const lessons = lessonsFor(new Date(2026, 8, 9), data);
    expect(lessons[1].teachers).toEqual([
      { name: 'Головко Н.О.', room: '108' },
      { name: 'Міхно О.Л.', room: '115' },
    ]);
  });

  it('синій понеділок відрізняється від жовтого', () => {
    const yellow = lessonsFor(new Date(2026, 8, 7), data);
    const blue = lessonsFor(new Date(2026, 8, 14), data);
    expect(yellow.map((l) => l.module)).toEqual([2, 3, 4]);
    expect(blue.map((l) => l.module)).toEqual([3, 4]);
    expect(blue[0].subject).toBe('Математика');
  });

  it('вихідні — порожньо', () => {
    expect(lessonsFor(new Date(2026, 8, 12), data)).toEqual([]);
  });

  it('канікули — порожньо', () => {
    expect(lessonsFor(new Date(2026, 9, 28), data)).toEqual([]);
  });

  // У поточному розкладі першого модуля немає, але після зимових канікул
  // він може зʼявитися. Перевіряємо саме це — що додаток його підхопить.
  it('перший модуль обробляється, якщо зʼявиться в розкладі', () => {
    const patched = structuredClone(data);
    patched.schedules[0].weeks.yellow.wed['1'] = {
      subject: 'Українська мова',
      teachers: [{ name: 'Голінько Ю.А.', room: '117' }],
    };

    const lessons = lessonsFor(new Date(2026, 8, 9), patched);
    expect(lessons.map((l) => l.module)).toEqual([1, 2, 3]);
    expect(lessons[0].from).toBe(480);              // день починається о 8:00
    expect(lessons[0].miniModules[0].to).toBe(510); // перший міні-модуль до 8:30
    expect(lessons[0].subject).toBe('Українська мова');
  });
});
