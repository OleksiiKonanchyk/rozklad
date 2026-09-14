import { describe, it, expect } from 'vitest';
import { breakLabel } from '../src/ui.js';

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
