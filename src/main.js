import { loadSchedule } from './data.js';
import { stateAt } from './state.js';
import { renderToday, escapeHtml } from './ui.js';

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
  let lastHtml = '';

  // Перемальовуємо лише тоді, коли розмітка справді змінилась, і зберігаємо
  // позицію прокрутки — інакше сторінка стрибала б угору щоразу за таймером.
  function draw() {
    const state = stateAt(new Date(), data);
    const html = renderToday(state) + tabs(view);
    if (html === lastHtml) return;
    const scroll = window.scrollY;
    root.innerHTML = html;
    lastHtml = html;
    window.scrollTo(0, scroll);
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    view = button.dataset.view;
    draw();
  });

  draw();
  setInterval(draw, TICK_MS);
}

start();
