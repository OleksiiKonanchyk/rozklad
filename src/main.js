import { loadSchedule } from './data.js';
import { stateAt } from './state.js';
import { renderToday, renderWeek, escapeHtml } from './ui.js';

const TICK_MS = 10000;
const root = document.getElementById('app');

function tabs(view) {
  const on = (name) => (view === name ? 'true' : 'false');
  return `
    <nav class="tabs">
      <button data-view="today" aria-selected="${on('today')}">Сьогодні</button>
      <button data-view="week" aria-selected="${on('week')}">Тиждень</button>
    </nav>`;
}

async function start() {
  let data;
  try {
    data = await loadSchedule();
  } catch (error) {
    root.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
    return;
  }

  let view = 'today';
  let shownColor = null;   // null = показувати поточний тиждень
  let lastHtml = '';

  // Перемальовуємо лише тоді, коли розмітка справді змінилась, і зберігаємо
  // позицію прокрутки — інакше сторінка стрибала б угору щоразу за таймером.
  function draw() {
    const state = stateAt(new Date(), data);
    const body = view === 'today'
      ? renderToday(state)
      : renderWeek(data, state, shownColor);
    const html = body + tabs(view);
    if (html === lastHtml) return;
    const scroll = window.scrollY;
    root.innerHTML = html;
    lastHtml = html;
    window.scrollTo(0, scroll);
  }

  root.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-view]');
    if (tab) {
      view = tab.dataset.view;
      if (view === 'today') shownColor = null;
      draw();
      return;
    }
    const swatch = event.target.closest('[data-color]');
    if (swatch) {
      shownColor = swatch.dataset.color;
      draw();
    }
  });

  draw();
  setInterval(draw, TICK_MS);
}

start();
