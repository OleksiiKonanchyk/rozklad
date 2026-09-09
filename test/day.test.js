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

  it('модуль I не використовується в жодному дні', () => {
    for (let d = new Date(2026, 8, 7); d < new Date(2026, 8, 19); d.setDate(d.getDate() + 1)) {
      const lessons = lessonsFor(new Date(d), data);
      expect(lessons.some((l) => l.module === 1)).toBe(false);
    }
  });
});
