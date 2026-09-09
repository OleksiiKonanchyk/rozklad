import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateSchedule, scheduleFor } from '../src/data.js';

const real = JSON.parse(readFileSync(new URL('../schedule.json', import.meta.url)));

function twoSchedules() {
  return {
    ...real,
    schedules: [
      real.schedules[0],
      { ...real.schedules[0], validFrom: '2027-01-11',
        anchor: { weekStart: '2027-01-11', color: 'blue' } },
    ],
  };
}

describe('validateSchedule', () => {
  it('приймає справжній schedule.json', () => {
    expect(() => validateSchedule(real)).not.toThrow();
  });

  it('падає, якщо немає обов’язкового поля', () => {
    const broken = { ...real };
    delete broken.modules;
    expect(() => validateSchedule(broken)).toThrow(/modules/);
  });

  it('падає, якщо schedules не впорядковані за validFrom', () => {
    const broken = { ...real, schedules: [
      { ...real.schedules[0], validFrom: '2027-01-11' },
      { ...real.schedules[0], validFrom: '2026-09-01' },
    ]};
    expect(() => validateSchedule(broken)).toThrow(/впорядковані/);
  });

  it('падає, якщо ключ weekOverrides не понеділок', () => {
    const broken = { ...real, weekOverrides: { '2026-11-03': 'blue' } };
    expect(() => validateSchedule(broken)).toThrow(/понеділком/);
  });

  it('падає на невідомому кольорі у weekOverrides', () => {
    const broken = { ...real, weekOverrides: { '2026-11-02': 'green' } };
    expect(() => validateSchedule(broken)).toThrow(/yellow/);
  });
});

describe('scheduleFor', () => {
  it('бере єдиний запис, коли він один', () => {
    expect(scheduleFor(new Date(2026, 8, 9), real).validFrom).toBe('2026-09-01');
  });

  it('бере перший запис для дати, ранішої за всі validFrom', () => {
    expect(scheduleFor(new Date(2026, 7, 20), real).validFrom).toBe('2026-09-01');
  });

  it('перемикається на новий розклад від його validFrom', () => {
    const data = twoSchedules();
    expect(scheduleFor(new Date(2026, 11, 24), data).validFrom).toBe('2026-09-01');
    expect(scheduleFor(new Date(2027, 0, 11), data).validFrom).toBe('2027-01-11');
    expect(scheduleFor(new Date(2027, 2, 1), data).validFrom).toBe('2027-01-11');
  });
});
