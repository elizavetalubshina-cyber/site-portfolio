import { createWorkoutState, ready, done, updateValue, toggleSet, markAll, addSet, addExercise, workoutSummary, EXTRA_EXERCISES } from './workout-state.js';
import './workout.css';

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const format = value => value === null ? '' : String(value).replace('.', ',');
const plural = (count, forms) => forms[count % 100 >= 11 && count % 100 <= 14 ? 2 : count % 10 === 1 ? 0 : count % 10 >= 2 && count % 10 <= 4 ? 1 : 2];
const button = (text, className, onClick, label) => {
  const node = element('button', className, text);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  node.addEventListener('click', onClick);
  return node;
};
function tick() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'M2 8l5 5L18 2');
  svg.append(path);
  return svg;
}

export function createWorkoutDemo({ onMinimize, onFinish, onHome }) {
  let state = createWorkoutState();
  let root;
  let selection = null;
  let view = 'active';
  let warning = false;
  let catalogChoice = null;
  let scrollPositions = { active: 0, catalog: 0, summary: 0 };

  function unmount() {
    if (root) scrollPositions[view] = root.querySelector('.wk-scroll')?.scrollTop || 0;
    root?.remove();
    root = undefined;
    selection = null;
    window.removeEventListener('keydown', keydown, true);
  }

  function mount(parent, nextView = 'active') {
    unmount();
    view = nextView;
    if (view === 'active') {
      state.finished = false;
      if (!state.startedAt) state.startedAt = Date.now();
    }
    root = element('div', 'workout-demo');
    parent.append(root);
    window.addEventListener('keydown', keydown, true);
    render();
  }

  function reveal(target) {
    const scroller = root?.querySelector('.wk-scroll');
    if (!scroller || !target) return;
    const scale = root.getBoundingClientRect().width / 391;
    const field = target.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    if (field.bottom > box.bottom - 8 * scale) scroller.scrollTop += (field.bottom - box.bottom) / scale + 8;
    if (field.top < box.top + 8 * scale) scroller.scrollTop -= (box.top - field.top) / scale + 8;
  }

  function firstEmpty(exerciseIndex) {
    const exercise = state.exercises[exerciseIndex];
    for (const [setIndex, set] of exercise.sets.entries()) {
      if (set.weight === null) return { exerciseIndex, setIndex, kind: 'weight' };
      if (set.reps === null) return { exerciseIndex, setIndex, kind: 'reps' };
    }
    return null;
  }

  function openField(field) {
    const set = state.exercises[field.exerciseIndex].sets[field.setIndex];
    selection = { ...field, draft: format(set[field.kind]), replace: true };
    render();
  }

  function openExercise(index) {
    selection = null;
    if (state.expanded === index) {
      state.expanded = null;
      render();
      return;
    }
    state.expanded = index;
    const field = firstEmpty(index);
    if (field) openField(field);
    else render();
  }

  function enterKey(key) {
    if (!selection) return;
    let value = selection.replace ? '' : selection.draft;
    if (key === 'backspace') value = selection.replace ? '' : value.slice(0, -1);
    else if (key === ',') {
      if (selection.kind !== 'weight' || value.includes(',')) return;
      value = (value || '0') + ',';
    } else {
      if (value.length >= 6) return;
      value = value === '0' ? key : value + key;
    }
    selection.draft = value;
    selection.replace = false;
    updateValue(state, selection.exerciseIndex, selection.setIndex, selection.kind, value === '' ? null : Number(value.replace(',', '.')));
    render();
  }

  function moveField(direction) {
    if (!selection) return;
    const index = selection.setIndex * 2 + (selection.kind === 'reps' ? 1 : 0) + direction;
    const count = state.exercises[selection.exerciseIndex].sets.length * 2;
    if (index < 0 || index >= count) { selection = null; render(); return; }
    openField({ exerciseIndex: selection.exerciseIndex, setIndex: Math.floor(index / 2), kind: index % 2 ? 'reps' : 'weight' });
  }

  function keydown(event) {
    if (!root || root.inert || document.querySelector('#scenario-menu')?.open || event.ctrlKey || event.metaKey || event.altKey) return;
    if (warning && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      warning = false;
      render();
      return;
    }
    if (!selection) return;
    let handled = true;
    if (/^\d$/.test(event.key)) enterKey(event.key);
    else if (event.key === ',' || event.key === '.') enterKey(',');
    else if (event.key === 'Backspace' || event.key === 'Delete') enterKey('backspace');
    else if (event.key === 'Enter') moveField(1);
    else if (event.key === 'Escape') { selection = null; render(); }
    else handled = false;
    if (handled) { event.preventDefault(); event.stopImmediatePropagation(); }
  }

  function record(exerciseIndex, setIndex) {
    const changed = toggleSet(state, exerciseIndex, setIndex);
    if (!changed) {
      const set = state.exercises[exerciseIndex].sets[setIndex];
      openField({ exerciseIndex, setIndex, kind: set.weight === null ? 'weight' : 'reps' });
      return;
    }
    selection = null;
    if (state.expanded !== exerciseIndex && state.expanded !== null) {
      const field = firstEmpty(state.expanded);
      if (field) { openField(field); return; }
    }
    render();
  }

  function fieldButton(exerciseIndex, setIndex, kind) {
    const exercise = state.exercises[exerciseIndex];
    const set = exercise.sets[setIndex];
    const active = selection && selection.exerciseIndex === exerciseIndex && selection.setIndex === setIndex && selection.kind === kind;
    const text = active ? selection.draft : format(set[kind]);
    const node = button(text || '—', `wk-value${active ? ' is-active' : ''}${set.completed ? ' is-complete' : ''}${text.length > 3 ? ' is-long' : ''}`, () => openField({ exerciseIndex, setIndex, kind }), `${kind === 'weight' ? 'Вес' : 'Повторы'}, ${exercise.name}, подход ${setIndex + 1}: ${text || 'не заполнено'}`);
    node.dataset.field = `${exerciseIndex}-${setIndex}-${kind}`;
    return node;
  }

  function exerciseCard(exercise, exerciseIndex) {
    const expanded = state.expanded === exerciseIndex;
    const completed = exercise.sets.filter(set => set.completed).length;
    const card = element('article', `wk-exercise${expanded ? ' is-open' : ''}`);
    card.dataset.exercise = String(exerciseIndex);
    const title = button('', 'wk-exercise-heading', () => openExercise(exerciseIndex), `${exercise.name}, ${expanded ? 'свернуть' : 'раскрыть'}`);
    title.setAttribute('aria-expanded', String(expanded));
    const badge = element('span', `wk-badge${done(exercise) ? ' is-complete' : ''}`, done(exercise) ? '' : String(exerciseIndex + 1));
    if (done(exercise)) badge.append(tick());
    const text = element('span', 'wk-exercise-copy');
    text.append(element('strong', '', exercise.name.toUpperCase()), element('small', '', `${exercise.group.toUpperCase()}, ${done(exercise) ? `ГОТОВО, ${completed} ${plural(completed, ['ПОДХОД', 'ПОДХОДА', 'ПОДХОДОВ'])}` : completed ? `${completed} ИЗ ${exercise.sets.length} ПОДХОДОВ` : expanded ? 'ТЕКУЩЕЕ' : 'НЕ НАЧАТО'}`));
    title.append(badge, text, element('span', 'wk-chevron'));
    card.append(title);
    if (!expanded) return card;
    const sets = element('div', 'wk-sets');
    exercise.sets.forEach((set, setIndex) => {
      const row = element('div', 'wk-set');
      row.dataset.set = String(setIndex);
      row.append(element('span', 'wk-set-number', String(setIndex + 1)), fieldButton(exerciseIndex, setIndex, 'weight'), element('span', 'wk-unit', 'кг'), element('span', 'wk-times', '×'), fieldButton(exerciseIndex, setIndex, 'reps'), element('span', 'wk-unit', 'раз'), element('span', 'wk-spacer'));
      const check = button('', `wk-check${set.completed ? ' is-complete' : ''}${ready(set) ? ' is-ready' : ''}`, () => record(exerciseIndex, setIndex), `${set.completed ? 'Снять отметку' : 'Отметить'}: ${exercise.name}, подход ${setIndex + 1}`);
      check.dataset.check = `${exerciseIndex}-${setIndex}`;
      check.setAttribute('aria-pressed', String(set.completed));
      if (set.completed) check.append(tick());
      row.append(check);
      sets.append(row);
    });
    const actions = element('div', 'wk-set-actions');
    actions.append(button('+ ПОДХОД', 'wk-text-button', () => { addSet(state, exerciseIndex); render(); reveal(root.querySelector(`[data-exercise="${exerciseIndex}"] .wk-set:last-child`)); }));
    const all = button('ОТМЕТИТЬ ВСЕ', 'wk-text-button', () => {
      markAll(state, exerciseIndex);
      selection = null;
      if (state.expanded !== exerciseIndex && state.expanded !== null && firstEmpty(state.expanded)) openField(firstEmpty(state.expanded));
      else render();
    }, `Отметить все подходы: ${exercise.name}`);
    all.disabled = !exercise.sets.some(set => ready(set) && !set.completed);
    actions.append(all);
    sets.append(actions);
    card.append(sets);
    return card;
  }

  function keypad() {
    const keyboard = element('div', 'wk-keyboard');
    keyboard.setAttribute('aria-label', 'Ввод веса и повторов');
    const bar = element('div', 'wk-keyboard-bar');
    bar.append(button('‹', 'wk-keyboard-arrow', () => moveField(-1), 'Предыдущее поле'), button('›', 'wk-keyboard-arrow', () => moveField(1), 'Следующее поле'));
    bar.append(button('ГОТОВО', 'wk-keyboard-done', () => { selection = null; render(); }, 'Готово, закрыть клавиатуру'));
    const keys = element('div', 'wk-keyboard-keys');
    for (const key of ['1','2','3','4','5','6','7','8','9',',','0','⌫']) {
      const node = button(key, 'wk-key', () => enterKey(key === '⌫' ? 'backspace' : key), key === '⌫' ? 'Стереть цифру' : `Ввести ${key}`);
      if (key === ',' && selection.kind === 'reps') node.disabled = true;
      keys.append(node);
    }
    keyboard.append(bar, keys);
    return keyboard;
  }

  function finish() {
    selection = null;
    const summary = workoutSummary(state);
    if (!summary.completed || summary.completed < summary.total) { warning = true; render(); return; }
    state.finished = true;
    onFinish();
  }

  function confirmation() {
    const summary = workoutSummary(state);
    const overlay = element('div', 'wk-confirm-backdrop');
    const panel = element('div', 'wk-confirm');
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', summary.completed ? 'Завершить тренировку?' : 'Ни один подход не отмечен');
    panel.append(element('h2', '', summary.completed ? 'ЗАВЕРШИТЬ ТРЕНИРОВКУ?' : 'НИ ОДИН ПОДХОД НЕ ОТМЕЧЕН'));
    panel.append(element('p', '', summary.completed ? `Отмечено ${summary.completed} из ${summary.total} подходов. Неотмеченные не попадут в итог.` : 'Отметь хотя бы один подход, чтобы сохранить тренировку.'));
    if (summary.completed) panel.append(button('ЗАВЕРШИТЬ', 'wk-primary', () => { warning = false; state.finished = true; onFinish(); }));
    panel.append(button('ПРОДОЛЖИТЬ ТРЕНИРОВКУ', 'wk-secondary', () => { warning = false; render(); }));
    overlay.append(panel);
    return overlay;
  }

  function catalog() {
    const content = element('div', 'wk-scroll wk-catalog');
    content.append(element('p', 'wk-section-label', 'ВЫБЕРИ УПРАЖНЕНИЕ'));
    for (const exercise of EXTRA_EXERCISES) {
      const exists = state.exercises.some(item => item.key === exercise.key);
      const row = button('', `wk-catalog-row${catalogChoice === exercise.key ? ' is-selected' : ''}`, () => { catalogChoice = exercise.key; render(); }, exercise.name);
      const text = element('span', 'wk-exercise-copy');
      text.append(element('strong', '', exercise.name.toUpperCase()), element('small', '', exists ? 'УЖЕ ДОБАВЛЕНО' : exercise.group.toUpperCase()));
      row.append(text, element('span', 'wk-catalog-mark', catalogChoice === exercise.key ? '✓' : '+'));
      row.disabled = exists;
      content.append(row);
    }
    return content;
  }

  function summaryContent() {
    const summary = workoutSummary(state);
    const content = element('div', 'wk-scroll wk-summary');
    content.append(element('h2', '', 'ТРЕНИРОВКА ЗАПИСАНА'));
    const minutes = Math.floor((Date.now() - state.startedAt) / 60000);
    content.append(element('p', 'wk-summary-meta', `${minutes ? `${minutes} МИН` : 'МЕНЕЕ МИНУТЫ'} · ${summary.completed} ${plural(summary.completed, ['ПОДХОД', 'ПОДХОДА', 'ПОДХОДОВ'])} · ${summary.exercises} ${plural(summary.exercises, ['УПРАЖНЕНИЕ', 'УПРАЖНЕНИЯ', 'УПРАЖНЕНИЙ'])}`));
    content.append(element('p', 'wk-section-label', 'ПОДХОДЫ ПО ГРУППАМ'));
    for (const [group, count] of Object.entries(summary.groups)) {
      const row = element('div', 'wk-summary-group');
      row.append(element('span', '', group.toUpperCase()), element('strong', '', String(count)));
      content.append(row);
    }
    content.append(element('p', 'wk-section-label', 'ТВОИ ПОДХОДЫ'));
    for (const exercise of state.exercises) {
      const recorded = exercise.sets.filter(set => set.completed);
      if (!recorded.length) continue;
      const card = element('div', 'wk-summary-exercise');
      card.append(element('strong', '', exercise.name.toUpperCase()));
      for (const [index, set] of exercise.sets.entries()) if (set.completed) card.append(element('p', '', `${index + 1}. ${format(set.weight)} кг × ${set.reps} раз`));
      content.append(card);
    }
    if (state.templateSaved) content.append(element('p', 'wk-saved', 'Сохранено как шаблон'));
    return content;
  }

  function render() {
    if (!root) return;
    const previousView = root.dataset.workoutView;
    if (previousView) scrollPositions[previousView] = root.querySelector('.wk-scroll')?.scrollTop || 0;
    const scroll = scrollPositions[view];
    const summary = workoutSummary(state);
    root.dataset.workoutView = view;
    root.dataset.completed = String(summary.completed);
    root.dataset.total = String(summary.total);
    root.dataset.expanded = state.expanded === null ? '' : String(state.expanded);
    root.replaceChildren();
    const nav = element('div', 'wk-topbar');
    if (view === 'active') {
      nav.append(button('Свернуть', 'wk-nav-action', () => { selection = null; onMinimize(); }), element('strong', 'wk-nav-title', 'ФУЛЛ БАДИ'), button('+ Упражнение', 'wk-nav-action', () => { selection = null; view = 'catalog'; catalogChoice = null; render(); }));
      const content = element('div', `wk-scroll${selection ? ' with-keyboard' : ''}`);
      state.exercises.forEach((exercise, index) => content.append(exerciseCard(exercise, index)));
      root.append(nav, content);
      if (selection) root.append(keypad());
      else {
        const footer = element('div', 'wk-footer');
        footer.append(button('ЗАВЕРШИТЬ ТРЕНИРОВКУ', summary.completed ? 'wk-primary' : 'wk-secondary', finish));
        root.append(footer);
      }
      if (warning) {
        for (const child of root.children) child.inert = true;
        root.append(confirmation());
        root.querySelector('.wk-confirm').focus({ preventScroll: true });
      }
    } else if (view === 'catalog') {
      nav.append(button('Назад', 'wk-nav-action', () => { view = 'active'; render(); }), element('strong', 'wk-nav-title', 'УПРАЖНЕНИЯ'), element('span'));
      const footer = element('div', 'wk-footer');
      const add = button('ДОБАВИТЬ В ТРЕНИРОВКУ', 'wk-primary', () => { if (addExercise(state, catalogChoice)) { view = 'active'; openField(firstEmpty(state.expanded)); } });
      add.disabled = !catalogChoice;
      footer.append(add);
      root.append(nav, catalog(), footer);
    } else {
      nav.append(element('span'), element('strong', 'wk-nav-title', 'ФУЛЛ БАДИ'), button(state.templateSaved ? '− Шаблон' : '+ Шаблон', 'wk-nav-action', () => { state.templateSaved = !state.templateSaved; render(); }));
      const footer = element('div', 'wk-footer');
      footer.append(button('НА ГЛАВНУЮ', 'wk-primary', onHome));
      root.append(nav, summaryContent(), footer);
    }
    const scroller = root.querySelector('.wk-scroll');
    if (scroller) scroller.scrollTop = scroll;
    if (selection) reveal(root.querySelector(`[data-field="${selection.exerciseIndex}-${selection.setIndex}-${selection.kind}"]`));
  }

  return {
    mount, unmount,
    requestFinish: finish,
    reset() { unmount(); state = createWorkoutState(); scrollPositions = { active: 0, catalog: 0, summary: 0 }; warning = false; },
    get inProgress() { return state.startedAt !== null && !state.finished; },
    get progressText() {
      const summary = workoutSummary(state);
      const minutes = Math.floor((Date.now() - state.startedAt) / 60000);
      return `${minutes ? `${minutes} мин` : 'Менее минуты'} · ${summary.completed} из ${summary.total} подходов`;
    },
    get finished() { return state.finished; },
    get hasRecords() { return workoutSummary(state).completed > 0; },
  };
}
