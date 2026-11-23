import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { breakLabel, renderToday, renderWeek } from '../src/ui.js';
import { stateAt } from '../src/state.js';

const data = JSON.parse(readFileSync(new URL('../schedule.json', import.meta.url)));

// Решта ui.js лише складає рядки HTML і нічого не вирішує, тому не має тестів.
// breakLabel — виняток: він єдиний у файлі приймає рішення.
describe('breakLabel', () => {
  it('перерва між модулями велика — і на 15 хвилин, і на 25', () => {
    expect(breakLabel(15)).toBe('Велика перерва');
    expect(breakLabel(25)).toBe('Велика перерва');
  });

  it('довга діра в розкладі — це вікно, а не перерва', () => {
    expect(breakLabel(115)).toBe('Вікно');
  });
});

// 12 вересня 2026 — субота. Наступний навчальний день: понеділок 14-го,
// синій тиждень — Математика о 12:00 і Англійська о 13:55, кінець о 15:35.
describe('екран вихідних', () => {
  const html = () => renderToday(stateAt(new Date(2026, 8, 12, 18, 53), data));

  it('показує всі уроки наступного дня, а не лише перший', () => {
    expect(html()).toContain('Англійська мова');
  });

  it('у кожного уроку є час початку й кабінет', () => {
    const out = html();
    expect(out).toContain('13:55');
    expect(out).toContain('каб. 306');
  });

  it('останнім рядком — коли додому', () => {
    expect(html()).toMatch(/15:35[\s\S]*додому/);
  });
});

// 9 вересня 2026, 10:27 — триває перерва 10:25–10:30 між першим і другим
// міні-модулем Математики. Минуло 2 хвилини з 5.
describe('коротка перерва у стрічці дня', () => {
  const html = () => renderToday(stateAt(new Date(2026, 8, 9, 10, 27), data));

  it('активним є рівно один рядок', () => {
    expect(html().match(/mini__row--current/g) ?? []).toHaveLength(1);
  });

  it('активна саме перерва, а не наступний міні-модуль', () => {
    expect(html()).toMatch(/mini__row--break[^"]*mini__row--current/);
  });

  it('видно, скільки перерви минуло', () => {
    expect(html()).toContain('минуло 2 хвилини із 5');
  });
});

// 9 вересня 2026 — між модулем II (до 11:35) і модулем III (з 12:00)
// лежить велика перерва на 25 хвилин.
describe('велика перерва у стрічці дня', () => {
  const at = (h, m) => renderToday(stateAt(new Date(2026, 8, 9, h, m), data));

  it('перерва між модулями є у стрічці навіть під час уроку', () => {
    expect(at(10, 40)).toContain('велика перерва 25 хвилин');
  });

  it('під час уроку активний модуль, а не перерва', () => {
    const html = at(10, 40);
    expect(html.match(/tl-item--current/g) ?? []).toHaveLength(1);
    expect(html).not.toMatch(/tl-item--break[^"]*tl-item--current/);
  });

  it('о 11:45 активна саме перерва', () => {
    const html = at(11, 45);
    expect(html.match(/tl-item--current/g) ?? []).toHaveLength(1);
    expect(html).toMatch(/tl-item--break[^"]*tl-item--current/);
  });

  it('видно, скільки великої перерви минуло', () => {
    expect(at(11, 45)).toContain('минуло 10 хвилин із 25');
  });
});

describe('значки предметів', () => {
  it('на екрані «Сьогодні» значок стоїть перед назвою', () => {
    const html = renderToday(stateAt(new Date(2026, 8, 9, 10, 40), data));
    expect(html).toMatch(/🔢<\/span>Математика/);
  });

  it('у тижневому розкладі — теж', () => {
    const state = stateAt(new Date(2026, 8, 9, 10, 40), data);
    expect(renderWeek(data, state, 'yellow')).toMatch(/🇬🇧<\/span>Англійська мова/);
  });
});

// 14 вересня 2026 — синій понеділок. Другий модуль: Еврика, учитель і
// кабінет ще не відомі.
describe('урок без відомого вчителя', () => {
  it('на екрані «Сьогодні» замість кабінету — що він уточнюється', () => {
    const html = renderToday(stateAt(new Date(2026, 8, 14, 10, 15), data));
    expect(html).toContain('Еврика');
    expect(html).toContain('вчитель і кабінет уточнюються');
  });

  it('у тижневому розкладі — коротше, але теж без порожнього «каб.»', () => {
    const state = stateAt(new Date(2026, 8, 14, 10, 15), data);
    const html = renderWeek(data, state, 'blue');
    expect(html).toContain('уточнюється');
    expect(html).not.toMatch(/каб\. <\/b>/);
  });
});
