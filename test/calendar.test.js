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

  // Осінні канікули 26-30 жовтня — суцільний тиждень без жодного уроку.
  // Школа такий тиждень пропускає: після нього йде той колір, якого ще не було.
  it('тиждень суцільних канікул не бере участі в чергуванні', () => {
    expect(weekColorFor(new Date(2026, 9, 19), data)).toBe('yellow');
    expect(weekColorFor(new Date(2026, 10, 2), data)).toBe('blue');
    expect(weekColorFor(new Date(2026, 10, 9), data)).toBe('yellow');
  });

  it('канікулярний тиждень показує колір того, що буде після нього', () => {
    expect(weekColorFor(new Date(2026, 9, 26), data)).toBe('blue');
  });

  it('весняні канікули так само не збивають чергування', () => {
    // 22-28 березня — теж суцільний тиждень, тож сусідні навчальні тижні
    // мусять бути різного кольору, а не однакового.
    const before = weekColorFor(new Date(2027, 2, 15), data);
    const after = weekColorFor(new Date(2027, 2, 29), data);
    expect(after).not.toBe(before);
  });

  it('тиждень перед опорним рахується назад', () => {
    expect(weekColorFor(new Date(2026, 7, 31), data)).toBe('blue');
  });

  it('weekOverrides перекриває формулу', () => {
    const patched = { ...data, weekOverrides: { '2026-11-02': 'blue' } };
    expect(weekColorFor(new Date(2026, 10, 2), patched)).toBe('blue');
    expect(weekColorFor(new Date(2026, 10, 6), patched)).toBe('blue');
    // Виняток діє лише на свій тиждень — наступний знову за правилом.
    expect(weekColorFor(new Date(2026, 10, 9), patched)).toBe('yellow');
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
