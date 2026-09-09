import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isoDate } from '../src/format.js';
import {
  isInTerm, holidayFor, weekColorFor, isSchoolDay, nextSchoolDay,
} from '../src/calendar.js';

const data = JSON.parse(readFileSync(new URL('../schedule.json', import.meta.url)));

describe('weekColorFor', () => {
  it('опорний тиждень — жовтий', () => {
    expect(weekColorFor(new Date(2026, 8, 7), data)).toBe('yellow');
    expect(weekColorFor(new Date(2026, 8, 9), data)).toBe('yellow');
    expect(weekColorFor(new Date(2026, 8, 11), data)).toBe('yellow');
  });

  it('наступний тиждень — синій', () => {
    expect(weekColorFor(new Date(2026, 8, 14), data)).toBe('blue');
  });

  it('канікулярний тиждень теж рахується', () => {
    expect(weekColorFor(new Date(2026, 9, 19), data)).toBe('yellow');
    expect(weekColorFor(new Date(2026, 9, 26), data)).toBe('blue');
    expect(weekColorFor(new Date(2026, 10, 2), data)).toBe('yellow');
  });

  it('тиждень перед опорним рахується назад по формулі', () => {
    expect(weekColorFor(new Date(2026, 7, 31), data)).toBe('blue');
    expect(weekColorFor(new Date(2026, 7, 24), data)).toBe('yellow');
  });

  it('weekOverrides перекриває формулу', () => {
    const patched = { ...data, weekOverrides: { '2026-11-02': 'blue' } };
    expect(weekColorFor(new Date(2026, 10, 2), patched)).toBe('blue');
    expect(weekColorFor(new Date(2026, 10, 6), patched)).toBe('blue');
    expect(weekColorFor(new Date(2026, 10, 9), patched)).toBe('blue');
  });
});

describe('holidayFor', () => {
  it('осінні канікули', () => {
    expect(holidayFor(new Date(2026, 9, 28), data).name).toBe('Осінні канікули');
  });

  it('день перед канікулами — навчальний', () => {
    expect(holidayFor(new Date(2026, 9, 23), data)).toBe(null);
  });

  it('іменовані канікули виграють у загальних, коли дата поза семестром', () => {
    expect(holidayFor(new Date(2026, 11, 28), data).name).toBe('Зимові канікули');
  });

  it('літо — загальні канікули без дат', () => {
    const summer = holidayFor(new Date(2027, 6, 15), data);
    expect(summer.name).toBe('Канікули');
    expect(summer.to).toBe(null);
  });

  it('навчальний день — не канікули', () => {
    expect(holidayFor(new Date(2026, 8, 9), data)).toBe(null);
  });
});

describe('isInTerm', () => {
  it('всередині першого семестру', () => {
    expect(isInTerm(new Date(2026, 8, 9), data)).toBe(true);
  });

  it('між семестрами', () => {
    expect(isInTerm(new Date(2027, 0, 5), data)).toBe(false);
  });
});

describe('isSchoolDay / nextSchoolDay', () => {
  it('субота — не навчальний день', () => {
    expect(isSchoolDay(new Date(2026, 8, 12), data)).toBe(false);
  });

  it("канікулярна п'ятниця — не навчальний день", () => {
    expect(isSchoolDay(new Date(2026, 9, 30), data)).toBe(false);
  });

  it("після п'ятниці наступний навчальний — понеділок", () => {
    expect(isoDate(nextSchoolDay(new Date(2026, 8, 11), data))).toBe('2026-09-14');
  });

  it('перед осінніми канікулами наступний навчальний — 2 листопада', () => {
    expect(isoDate(nextSchoolDay(new Date(2026, 9, 23), data))).toBe('2026-11-02');
  });

  it('у середу наступний навчальний — четвер', () => {
    expect(isoDate(nextSchoolDay(new Date(2026, 8, 9), data))).toBe('2026-09-10');
  });

  it('після кінця навчального року повертає null', () => {
    expect(nextSchoolDay(new Date(2027, 6, 15), data)).toBe(null);
  });
});
