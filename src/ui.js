import {
  toHHMM, humanMinutes, weekdayName, formatDateLong, parseISO,
  mondayOf, addDays, isoDate,
} from './format.js';
import { weekColorFor } from './calendar.js';
import { lessonsFor } from './day.js';

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Лише для перерв між модулями: усередині модуля перерва завжди маленька.
// Довга діра в розкладі — це не перерва, а вікно, тож і зветься інакше.
export function breakLabel(gap) {
  if (gap > 40) return 'Вікно';
  return 'Велика перерва';
}

function rooms(teachers) {
  return teachers
    .map((t) => `${escapeHtml(t.name)} — каб. ${escapeHtml(t.room)}`)
    .join('<br>');
}

// Компактний варіант для тижня: там питання «куди йти», а не «хто веде».
function roomList(teachers) {
  return `каб. ${teachers.map((t) => escapeHtml(t.room)).join(' і ')}`;
}

function topBar(state) {
  const modifier = state.color ? `bar--${state.color}` : 'bar--none';
  const colorName = state.color === 'yellow' ? 'жовтий'
    : state.color === 'blue' ? 'синій' : '—';
  const date = `${weekdayName(state.date)}, ${formatDateLong(state.date)}`;
  return `<div class="bar ${modifier}"><span>${escapeHtml(date)}</span><span>${colorName}</span></div>`;
}

function nowBox(state) {
  const parts = {
    'lesson': () => ({
      cls: `now--${state.color}`,
      label: state.endsDay
        ? `Зараз · до кінця дня ${humanMinutes(state.minutesLeft)}`
        : `Зараз · до перерви ${humanMinutes(state.minutesLeft)}`,
      subject: state.current.subject,
      room: rooms(state.current.teachers),
    }),
    'break-inner': () => ({
      cls: 'now--pause',
      label: `Маленька перерва ${humanMinutes(state.gap)}`,
      subject: `${state.current.subject} триває`,
      left: `лишилось ${humanMinutes(state.minutesLeft)}`,
      until: state.nextMiniModule.from,
      room: 'той самий кабінет',
    }),
    'break-outer': () => ({
      cls: 'now--pause',
      label: `${breakLabel(state.gap)} ${humanMinutes(state.gap)}`,
      subject: `Далі: ${state.upcoming.subject}`,
      left: `лишилось ${humanMinutes(state.minutesLeft)}`,
      until: state.upcoming.from,
      room: rooms(state.upcoming.teachers),
    }),
    'before-school': () => ({
      cls: `now--${state.color}`,
      label: state.minutesLeft <= 90
        ? `Початок о ${toHHMM(state.upcoming.from)} · через ${humanMinutes(state.minutesLeft)}`
        : `Сьогодні початок о ${toHHMM(state.upcoming.from)}`,
      subject: state.upcoming.subject,
      room: rooms(state.upcoming.teachers),
    }),
    'after-school': () => ({
      cls: `now--${state.color}`,
      label: 'На сьогодні все',
      subject: 'Уроки скінчились',
      room: state.endedAt === null ? 'сьогодні уроків не було' : `о ${toHHMM(state.endedAt)}`,
    }),
  };

  const build = parts[state.kind];
  if (!build) return '';
  const { cls, label, subject, left, until, room } = build();
  // Рядок із залишком є тільки в перерв: під час уроку залишок уже в заголовку.
  const countdown = left
    ? `<div class="now__left">${escapeHtml(left)} <em>· до ${toHHMM(until)}</em></div>`
    : '';
  return `
    <div class="now ${cls}">
      <div class="now__label">${escapeHtml(label)}</div>
      <div class="now__subject">${escapeHtml(subject)}</div>
      ${countdown}
      <div class="now__room">${room}</div>
    </div>`;
}

function miniModules(lesson, state) {
  const rows = [];
  lesson.miniModules.forEach((mm, index) => {
    const isCurrent = state.kind === 'lesson' && state.miniModule.n === mm.n;
    const isDone = state.kind === 'lesson'
      ? mm.n < state.miniModule.n
      : state.kind === 'break-inner' ? mm.n < state.nextMiniModule.n : false;

    const cls = isCurrent ? 'mini__row--current' : isDone ? 'mini__row--done' : '';
    const mark = isDone ? '✓ ' : '';
    rows.push(`
      <div class="mini__row ${cls}">
        <span class="mini__time">${toHHMM(mm.from)}</span>
        <span>${mark}${ordinal(mm.n)} міні-модуль</span>
      </div>`);

    if (isCurrent) {
      const total = mm.to - mm.from;
      const percent = Math.round((state.minutesElapsed / total) * 100);
      rows.push(`<div class="mini__bar"><i style="width:${percent}%"></i></div>`);
      rows.push(`<div class="mini__note">минуло ${humanMinutes(state.minutesElapsed)} із ${total}</div>`);
    }

    const next = lesson.miniModules[index + 1];
    if (next) {
      const gap = next.from - mm.to;
      rows.push(`
        <div class="mini__row mini__row--break">
          <span class="mini__time">${toHHMM(mm.to)}</span>
          <span>перерва ${humanMinutes(gap)}</span>
        </div>`);
    }
  });
  return `<div class="mini">${rows.join('')}</div>`;
}

function ordinal(n) {
  return ['перший', 'другий', 'третій'][n - 1] ?? `${n}-й`;
}

function currentLesson(state) {
  if (state.kind === 'lesson' || state.kind === 'break-inner') return state.current;
  return null;
}

function timeline(state) {
  const active = currentLesson(state);
  const items = state.lessons.map((lesson) => {
    const isCurrent = active !== null && lesson.module === active.module;
    const isDone = !isCurrent && lesson.to <= endReference(state);
    const classes = [
      'tl-item',
      isCurrent ? 'tl-item--current' : '',
      isCurrent && state.color === 'blue' ? 'tl-item--blue' : '',
      isDone ? 'tl-item--done' : '',
    ].filter(Boolean).join(' ');

    return `
      <div class="${classes}">
        <div class="tl-item__gutter">
          <div class="tl-item__dot"></div>
          <div class="tl-item__line"></div>
        </div>
        <div class="tl-item__body">
          <div class="tl-item__time">${toHHMM(lesson.from)} – ${toHHMM(lesson.to)} · модуль ${roman(lesson.module)}</div>
          <div class="tl-item__name">${escapeHtml(lesson.subject)}</div>
          <div class="tl-item__rooms">${rooms(lesson.teachers)}</div>
          ${isCurrent ? miniModules(lesson, state) : ''}
        </div>
      </div>`;
  });

  const last = state.lessons.at(-1);
  items.push(`
    <div class="tl-item">
      <div class="tl-item__gutter"><div class="tl-item__dot"></div></div>
      <div class="tl-item__body">
        <div class="tl-item__time">${toHHMM(last.to)}</div>
        <div class="tl-item__name" style="opacity:.45">додому</div>
      </div>
    </div>`);

  return `<div class="timeline">${items.join('')}</div>`;
}

function endReference(state) {
  if (state.kind === 'after-school') return 24 * 60;
  if (state.kind === 'before-school') return 0;
  if (state.kind === 'break-outer') return state.previous.to;
  const active = currentLesson(state);
  return active ? active.from : 0;
}

function roman(n) {
  return ['I', 'II', 'III', 'IV', 'V'][n - 1] ?? String(n);
}

function tomorrowCard(nextDay) {
  if (!nextDay || nextDay.lessons.length === 0) return '';
  const when = nextDay.isTomorrow ? 'Завтра' : weekdayName(nextDay.date);
  const label = `${when}, ${formatDateLong(nextDay.date)}`;
  const first = nextDay.lessons[0];
  const last = nextDay.lessons.at(-1);
  const subjects = nextDay.lessons.map((l) => l.subject).join(' · ');
  return `
    <div class="tomorrow">
      <div class="tomorrow__label">${escapeHtml(label)}</div>
      <div class="tomorrow__hours">${toHHMM(first.from)} – ${toHHMM(last.to)}</div>
      <div class="tomorrow__list">${escapeHtml(subjects)}</div>
    </div>`;
}

function emptyScreen(state) {
  const isHoliday = state.kind === 'holiday';
  const icon = isHoliday ? '🍂' : '🎈';
  const title = isHoliday ? state.holiday.name : 'Вихідні';
  const sub = isHoliday && state.holiday.to
    ? `до ${formatDateLong(parseISO(state.holiday.to))}`
    : '';

  let next = '<div class="empty__next"><div class="now__label">навчальний рік закінчився</div></div>';
  if (state.nextDay) {
    const colorName = state.nextDay.color === 'yellow' ? 'жовтий' : 'синій';
    const lessons = state.nextDay.lessons;
    // Повний список, а не самий перший урок: після вихідних і канікул питання
    // «що взяти з собою» важить більше, ніж «коли починається».
    const items = lessons
      .map((l) => `<li><i>${toHHMM(l.from)}</i><span>${escapeHtml(l.subject)}</span><b>${roomList(l.teachers)}</b></li>`)
      .join('');
    // Час початку видно в кожного уроку, а час, коли додому, — ні, тому окремо.
    const list = lessons.length === 0 ? '' : `
        <ul class="day__list">
          ${items}
          <li class="day__home"><i>${toHHMM(lessons.at(-1).to)}</i><span>додому</span></li>
        </ul>`;
    next = `
      <div class="empty__next">
        <div class="now__label">у школу знову</div>
        <div class="empty__next-title">${escapeHtml(weekdayName(state.nextDay.date))}, ${formatDateLong(state.nextDay.date)}</div>
        <div class="tomorrow__list">${colorName} тиждень</div>
        ${list}
      </div>`;
  }

  return `
    <div class="empty">
      <div class="empty__icon">${icon}</div>
      <div class="empty__title">${escapeHtml(title)}</div>
      ${sub ? `<div class="empty__sub">${escapeHtml(sub)}</div>` : ''}
      ${next}
    </div>`;
}

export function renderToday(state) {
  if (state.kind === 'holiday' || state.kind === 'weekend') {
    return topBar(state) + emptyScreen(state);
  }
  if (state.lessons.length === 0) {
    return topBar(state) + nowBox(state) + tomorrowCard(state.nextDay);
  }
  return topBar(state) + nowBox(state) + timeline(state) + tomorrowCard(state.nextDay);
}

const DAY_NAMES = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця'];

function weekToggle(shownColor, actualColor) {
  const button = (color, text) => {
    const suffix = color === actualColor ? ' · цей' : '';
    return `<button data-color="${color}" aria-pressed="${color === shownColor}">${text}${suffix}</button>`;
  };
  return `<div class="toggle">${button('yellow', 'Жовтий')}${button('blue', 'Синій')}</div>`;
}

function dayCard(date, lessons, isToday, color) {
  const classes = [
    'day',
    isToday ? 'day--today' : '',
    isToday && color === 'blue' ? 'day--blue' : '',
  ].filter(Boolean).join(' ');

  const name = DAY_NAMES[date.getDay() - 1] + (isToday ? ' · сьогодні' : '');

  if (lessons.length === 0) {
    return `
      <div class="${classes}">
        <div class="day__head"><span class="day__name">${name}</span></div>
        <div class="day__empty">уроків немає</div>
      </div>`;
  }

  const hours = `${toHHMM(lessons[0].from)} – ${toHHMM(lessons.at(-1).to)}`;
  const items = lessons
    .map((l) => `<li><i>${toHHMM(l.from)}</i><span>${escapeHtml(l.subject)}</span><b>${roomList(l.teachers)}</b></li>`)
    .join('');

  return `
    <div class="${classes}">
      <div class="day__head">
        <span class="day__name">${name}</span>
        <span class="day__hours">${hours}</span>
      </div>
      <ul class="day__list">${items}</ul>
    </div>`;
}

export function renderWeek(data, state, shownColor) {
  const thisMonday = mondayOf(state.date);
  const actualColor = weekColorFor(thisMonday, data);
  const wanted = shownColor ?? actualColor;

  // Зазвичай тиждень протилежного кольору — наступний, але weekOverrides може
  // збити чергування, тому шукаємо найближчий понеділок потрібного кольору.
  let monday = thisMonday;
  for (let i = 0; i <= 8; i++) {
    if (weekColorFor(monday, data) === wanted) break;
    monday = addDays(monday, 7);
  }
  // Колір беремо з показаного тижня, а не з побажання: так заголовок і вміст
  // не можуть розійтися, навіть якщо потрібного кольору попереду не знайшлось.
  const color = weekColorFor(monday, data);
  const friday = addDays(monday, 4);
  const todayIso = isoDate(state.date);
  const range = `тиждень ${formatDateLong(monday)} – ${formatDateLong(friday)}`;

  const bar = `
    <div class="bar bar--${color}">
      <span>${escapeHtml(range)}</span>
      <span>${color === 'yellow' ? 'жовтий' : 'синій'}</span>
    </div>`;

  const cards = [0, 1, 2, 3, 4].map((offset) => {
    const date = addDays(monday, offset);
    return dayCard(date, lessonsFor(date, data), isoDate(date) === todayIso, color);
  }).join('');

  return bar + weekToggle(color, actualColor) + cards;
}
