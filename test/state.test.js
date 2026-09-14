import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isoDate } from '../src/format.js';
import { stateAt } from '../src/state.js';

const data = JSON.parse(readFileSync(new URL('../schedule.json', import.meta.url)));

// 9 вересня 2026 — середа, жовтий тиждень: модуль II Математика, модуль III Англійська
const wed = (h, m) => new Date(2026, 8, 9, h, m);

describe('під час уроку', () => {
  it('10:15 — перший міні-модуль Математики', () => {
    const s = stateAt(wed(10, 15), data);
    expect(s.kind).toBe('lesson');
    expect(s.color).toBe('yellow');
    expect(s.current.subject).toBe('Математика');
    expect(s.miniModule.n).toBe(1);
    expect(s.miniModule.of).toBe(3);
    expect(s.minutesLeft).toBe(10);
  });

  it('10:40 — другий міні-модуль, минуло 10 із 30', () => {
    const s = stateAt(wed(10, 40), data);
    expect(s.kind).toBe('lesson');
    expect(s.miniModule.n).toBe(2);
    expect(s.minutesElapsed).toBe(10);
    expect(s.minutesLeft).toBe(20);
  });

  it('останній міні-модуль останнього модуля', () => {
    const s = stateAt(wed(13, 30), data);
    expect(s.kind).toBe('lesson');
    expect(s.current.subject).toBe('Англійська мова');
    expect(s.miniModule.n).toBe(3);
  });
});

describe('endsDay', () => {
  it('останній міні-модуль останнього модуля дня — endsDay: true', () => {
    const s = stateAt(wed(13, 30), data);
    expect(s.kind).toBe('lesson');
    expect(s.endsDay).toBe(true);
  });

  it('не останній міні-модуль — endsDay: false', () => {
    const s = stateAt(wed(10, 40), data);
    expect(s.kind).toBe('lesson');
    expect(s.endsDay).toBe(false);
  });

  it('останній міні-модуль модуля, який не останній у дні — endsDay: false', () => {
    // 11:20 — третій міні-модуль модуля II, а модуль III ще попереду
    const s = stateAt(wed(11, 20), data);
    expect(s.kind).toBe('lesson');
    expect(s.miniModule.n).toBe(3);
    expect(s.miniModule.of).toBe(3);
    expect(s.current.subject).toBe('Математика');
    expect(s.endsDay).toBe(false);
  });
});

describe('перерви', () => {
  it('10:27 — коротка перерва, той самий предмет', () => {
    const s = stateAt(wed(10, 27), data);
    expect(s.kind).toBe('break-inner');
    expect(s.current.subject).toBe('Математика');
    expect(s.nextMiniModule.n).toBe(2);
    expect(s.minutesLeft).toBe(3);
  });

  it('коротка перерва знає свою повну довжину', () => {
    const s = stateAt(wed(10, 27), data);
    expect(s.kind).toBe('break-inner');
    expect(s.gap).toBe(5);
  });

  it('11:45 — перерва між модулями завдовжки 25 хв', () => {
    const s = stateAt(wed(11, 45), data);
    expect(s.kind).toBe('break-outer');
    expect(s.previous.subject).toBe('Математика');
    expect(s.upcoming.subject).toBe('Англійська мова');
    expect(s.minutesLeft).toBe(15);
    expect(s.gap).toBe(25);
  });

  it('15-хвилинна перерва між модулями', () => {
    // жовтий чт: модуль III до 13:40, модуль IV з 13:55
    const s = stateAt(new Date(2026, 8, 10, 13, 45), data);
    expect(s.kind).toBe('break-outer');
    expect(s.gap).toBe(15);
  });
});

describe('до і після уроків', () => {
  it('07.09 09:00 — ще не почалось', () => {
    const s = stateAt(new Date(2026, 8, 7, 9, 0), data);
    expect(s.kind).toBe('before-school');
    expect(s.upcoming.subject).toBe('Українська література');
    expect(s.minutesLeft).toBe(55);
  });

  it('09.09 14:00 — уроки скінчились о 13:40', () => {
    const s = stateAt(wed(14, 0), data);
    expect(s.kind).toBe('after-school');
    expect(s.endedAt).toBe(820);
  });

  it('після уроків завтра — четвер з 12:00', () => {
    const s = stateAt(wed(14, 0), data);
    expect(isoDate(s.nextDay.date)).toBe('2026-09-10');
    expect(s.nextDay.isTomorrow).toBe(true);
    expect(s.nextDay.lessons[0].from).toBe(720);
  });

  it('у п’ятницю наступний день — понеділок, і це не «завтра»', () => {
    const s = stateAt(new Date(2026, 8, 11, 18, 0), data);
    expect(isoDate(s.nextDay.date)).toBe('2026-09-14');
    expect(s.nextDay.isTomorrow).toBe(false);
    expect(s.nextDay.color).toBe('blue');
  });
});

describe('вихідні та канікули', () => {
  it('субота', () => {
    const s = stateAt(new Date(2026, 8, 12, 11, 0), data);
    expect(s.kind).toBe('weekend');
    expect(s.color).toBe(null);
    expect(s.lessons).toEqual([]);
    expect(isoDate(s.nextDay.date)).toBe('2026-09-14');
  });

  it('28.10 — осінні канікули, наступний навчальний 2 листопада', () => {
    const s = stateAt(new Date(2026, 9, 28, 11, 0), data);
    expect(s.kind).toBe('holiday');
    expect(s.holiday.name).toBe('Осінні канікули');
    expect(isoDate(s.nextDay.date)).toBe('2026-11-02');
    expect(s.nextDay.color).toBe('yellow');
  });

  it('субота всередині канікул — це канікули, а не вихідні', () => {
    expect(stateAt(new Date(2026, 9, 31, 11, 0), data).kind).toBe('holiday');
  });

  it('літо — канікули без наступного навчального дня', () => {
    const s = stateAt(new Date(2027, 6, 15, 11, 0), data);
    expect(s.kind).toBe('holiday');
    expect(s.nextDay).toBe(null);
  });
});

describe('перемикання розкладів', () => {
  const twoSchedules = {
    ...data,
    schedules: [
      data.schedules[0],
      {
        validFrom: '2027-01-11',
        anchor: { weekStart: '2027-01-11', color: 'blue' },
        weeks: data.schedules[0].weeks,
      },
    ],
  };

  it('24.12 ще на старому розкладі', () => {
    const s = stateAt(new Date(2026, 11, 24, 10, 15), twoSchedules);
    expect(s.color).toBe('blue'); // 21.12 — 15-й тиждень від опорного, непарний
  });

  it('11.01 бере новий запис і його опорну дату', () => {
    const s = stateAt(new Date(2027, 0, 11, 10, 15), twoSchedules);
    expect(s.color).toBe('blue');
  });
});

describe('вироджені випадки', () => {
  it('«вікно» в розкладі — одна довга перерва між модулями', () => {
    const windowed = structuredClone(data);
    const wednesday = windowed.schedules[0].weeks.yellow.wed;
    wednesday['4'] = wednesday['3'];
    delete wednesday['3'];
    const s = stateAt(wed(11, 45), windowed);
    expect(s.kind).toBe('break-outer');
    expect(s.gap).toBe(140); // 11:35 → 13:55
  });

  it('навчальний день без жодного модуля не падає', () => {
    const empty = structuredClone(data);
    empty.schedules[0].weeks.yellow.wed = {};
    const s = stateAt(wed(10, 15), empty);
    expect(s.kind).toBe('after-school');
    expect(s.endedAt).toBe(null);
  });
});
