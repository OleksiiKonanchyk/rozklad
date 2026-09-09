import { describe, it, expect } from 'vitest';
import {
  toMinutes, toHHMM, minutesOfDay, startOfDay, addDays, daysBetween,
  mondayOf, isoDate, parseISO, dayKey, weekdayName, formatDateLong, humanMinutes,
} from '../src/format.js';

describe('час', () => {
  it('toMinutes', () => {
    expect(toMinutes('09:55')).toBe(595);
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('17:30')).toBe(1050);
  });

  it('toHHMM додає провідний нуль', () => {
    expect(toHHMM(595)).toBe('09:55');
    expect(toHHMM(1050)).toBe('17:30');
  });

  it('minutesOfDay бере локальний час', () => {
    expect(minutesOfDay(new Date(2026, 8, 9, 10, 40))).toBe(640);
  });
});

describe('дати', () => {
  it('mondayOf у середу дає понеділок того ж тижня', () => {
    expect(isoDate(mondayOf(new Date(2026, 8, 9)))).toBe('2026-09-07');
  });

  it('mondayOf у неділю дає понеділок того ж тижня, а не наступного', () => {
    expect(isoDate(mondayOf(new Date(2026, 8, 13)))).toBe('2026-09-07');
  });

  it('mondayOf у понеділок повертає той самий день', () => {
    expect(isoDate(mondayOf(new Date(2026, 8, 7)))).toBe('2026-09-07');
  });

  it('daysBetween не збивається на переході на зимовий час', () => {
    // в Україні перехід у ніч на 25.10.2026
    expect(daysBetween(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
  });

  it('addDays перестрибує межу місяця', () => {
    expect(isoDate(addDays(new Date(2026, 8, 30), 1))).toBe('2026-10-01');
  });

  it('parseISO і isoDate — взаємні', () => {
    expect(isoDate(parseISO('2027-01-11'))).toBe('2027-01-11');
  });

  it('startOfDay зрізає час', () => {
    const d = startOfDay(new Date(2026, 8, 9, 14, 3));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('dayKey', () => {
    expect(dayKey(new Date(2026, 8, 7))).toBe('mon');
    expect(dayKey(new Date(2026, 8, 9))).toBe('wed');
    expect(dayKey(new Date(2026, 8, 13))).toBe('sun');
  });

  it('weekdayName і formatDateLong', () => {
    expect(weekdayName(new Date(2026, 8, 9))).toBe('середа');
    expect(formatDateLong(new Date(2026, 8, 9))).toBe('9 вересня');
  });
});

describe('humanMinutes', () => {
  it('однина', () => {
    expect(humanMinutes(1)).toBe('1 хвилина');
    expect(humanMinutes(21)).toBe('21 хвилина');
  });

  it('двоїна', () => {
    expect(humanMinutes(2)).toBe('2 хвилини');
    expect(humanMinutes(4)).toBe('4 хвилини');
    expect(humanMinutes(22)).toBe('22 хвилини');
  });

  it('множина', () => {
    expect(humanMinutes(5)).toBe('5 хвилин');
    expect(humanMinutes(20)).toBe('20 хвилин');
    expect(humanMinutes(0)).toBe('0 хвилин');
  });

  it('11–14 — множина, попри останню цифру', () => {
    expect(humanMinutes(11)).toBe('11 хвилин');
    expect(humanMinutes(12)).toBe('12 хвилин');
    expect(humanMinutes(14)).toBe('14 хвилин');
  });
});
