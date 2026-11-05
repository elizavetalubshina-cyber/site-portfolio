import data from './screens.json';

const screens = new Map(data.screens.map(screen => [screen.id, screen]));
const scenarios = [
  { key: 'workout', label: 'Тренировка', start: '80:12474', hint: 'Начни тренировку по плану, запиши подходы и посмотри итог.' },
  { key: 'bro', label: 'Бро', start: '80:14136', hint: 'Прими приглашение и посмотри прогресс бро. Двойной тап по тренировке ставит сердце, удержание открывает реакции.' },
  { key: 'plan', label: 'План', start: '121:12222', hint: 'Открой настройки графика или состав тренировки на выбранный день.' },
  { key: 'history', label: 'История', start: '80:17126', hint: 'Открой записанную тренировку, посмотри итог или повтори её.' },
  { key: 'profile', label: 'Профиль', start: '80:18293', hint: 'Открой метрики, справочник упражнений или настройки бро. Длинные экраны можно прокручивать.' },
  { key: 'first', label: 'Первый запуск', start: '130:18049', hint: 'Пройди знакомство и запиши первую тренировку. Ввод и установка разыгрываются внутри прототипа.' },
];
const broVariants = [
  ['Пригласить', '80:13982'], ['Принять', '80:14136'], ['Прогресс', '80:14179'],
  ['Сейчас в зале', '80:14503'], ['Пинок', '80:14956'],
];
const el = Object.fromEntries(['screen', 'screen-image', 'hotspots', 'device', 'viewport', 'hint', 'variants', 'scenarios', 'back', 'restart', 'show-hotspots', 'status', 'loading'].map(id => [id, document.getElementById(id)]));
let scenario = scenarios.find(item => item.key === location.hash.slice(1)) || scenarios[0];
let current;
let trail = [];
let timers = [];
let revision = 0;
let reactions = {};
let reactionCard = 0;
let broConnected = false;
let showHotspots = false;
let flashTimer;
let lastBroScreen = '80:14179';
const picture = id => `/gym-bro-demo/screens/${id.replace(':', '-')}.webp`;

function fit() {
  const mobile = matchMedia('(max-width:760px)').matches;
  const expanded = document.body.classList.contains('immersive');
  const width = document.documentElement.clientWidth;
  const scale = mobile
    ? Math.min(1, (width - 24) / 393, expanded ? (innerHeight - 70) / 852 : 1)
    : Math.max(.35, Math.min(1, (innerHeight - 150) / 852, (innerWidth - 440) / 393));
  document.documentElement.style.setProperty('--scale', scale);
  if (current) el.screen.style.marginBottom = `${current.height * (scale - 1)}px`;
}
addEventListener('resize', fit);
fit();

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function goBack() {
  const previous = trail.pop();
  if (previous) navigate(previous.id, { record: false, scroll: previous.scroll });
}

function resolveDestination(destination) {
  if (current?.name.startsWith('Home /') && destination === '80:14136' && broConnected) return lastBroScreen;
  // The source links these two history actions to opposite sample screens.
  if (current?.id === '88:9901' && destination === '80:17493') return '80:21014';
  if (current?.id === '88:9901' && destination === '80:21014') return '80:17493';
  // AllDone belongs to both the introductory and returning-user flows.
  if (current?.id === '80:20489' && destination === '80:20785' && scenario.key !== 'first') return '80:20888';
  if (current?.id === '80:14093' && destination === '80:14179') return '80:14020';
  return destination;
}

function act(action) {
  if (action.type === 'BACK') return goBack();
  if (action.type !== 'NODE') return;
  if (current?.id === '80:14136' && action.to === '80:14179') broConnected = true;
  if (current?.id === '127:15156' && action.to === '80:13982') {
    broConnected = false;
    reactions = {};
    lastBroScreen = '80:14179';
  }
  navigate(resolveDestination(action.to));
}

function cleanLabel(hotspot) {
  if (hotspot.name === 'overlay') return 'Закрыть окно';
  const label = (hotspot.label || '').replace(/◌|ФОТО|\bNEW\b/g, '').replace(/\s+/g, ' ').trim();
  if (label) return label;
  if (hotspot.name === 'leading') return 'Назад';
  if (hotspot.name.includes('Avatar')) return 'Открыть профиль';
  if (hotspot.name === 'reaction') return 'Выбрать реакцию';
  if (hotspot.name === 'open-composition') return 'Посмотреть состав тренировки';
  return 'Продолжить';
}

function setReaction(kind) {
  reactions[reactionCard] = kind;
  if (current.id === '127:15243' && trail.at(-1)?.id === lastBroScreen) trail.pop();
  navigate(lastBroScreen, { record: false });
}

function reactionGesture(button, index, action) {
  let clickTimer;
  let holdTimer;
  let held = false;
  let origin;
  button.addEventListener('pointerdown', event => {
    held = false;
    origin = [event.clientX, event.clientY];
    holdTimer = setTimeout(() => {
      held = true;
      clearTimeout(clickTimer);
      reactionCard = index;
      navigate('127:15243');
    }, 500);
    timers.push(holdTimer);
  });
  button.addEventListener('pointermove', event => {
    if (origin && Math.hypot(event.clientX - origin[0], event.clientY - origin[1]) > 10) clearTimeout(holdTimer);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => button.addEventListener(type, () => clearTimeout(holdTimer)));
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.addEventListener('click', event => {
    if (held) return;
    if (event.detail === 0) return act(action);
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      reactionCard = index;
      setReaction('heart');
    } else {
      clickTimer = setTimeout(() => { clickTimer = null; act(action); }, 300);
      timers.push(clickTimer);
    }
  });
}

function makeHotspot(hotspot, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hotspot';
  button.style.cssText = `left:${hotspot.x}px;top:${hotspot.y}px;width:${hotspot.w}px;height:${hotspot.h}px`;
  button.setAttribute('aria-label', cleanLabel(hotspot));
  button.dataset.hotspot = hotspot.id || String(index);
  if (hotspot.name === 'overlay') button.dataset.backdrop = 'true';
  const click = hotspot.events.find(event => event.trigger === 'ON_CLICK');
  const hold = hotspot.events.find(event => event.trigger === 'MOUSE_DOWN');
  const drag = hotspot.events.find(event => event.trigger === 'ON_DRAG');
  const isBroCard = current.name.startsWith('Bro /') && hotspot.name === 'workout';
  if (isBroCard) {
    const cards = current.hotspots.filter(item => item.name === 'workout');
    const cardIndex = cards.indexOf(hotspot);
    reactionGesture(button, cardIndex, click.action);
  } else if (current.id === '127:15243' && hotspot.name === 'reaction') {
    const index = current.hotspots.filter(item => item.name === 'reaction').indexOf(hotspot);
    const kinds = ['heart', 'fire', 'angry'];
    button.setAttribute('aria-label', ['Сердце', 'Огонь', 'Злость'][index]);
    button.addEventListener('click', () => setReaction(kinds[index]));
  } else if (click) {
    button.addEventListener('click', () => act(click.action));
  }
  if (hold) {
    let timer;
    button.addEventListener('pointerdown', () => { timer = setTimeout(() => act(hold.action), (hold.delay || .5) * 1000); timers.push(timer); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => button.addEventListener(type, () => clearTimeout(timer)));
    if (!click) button.addEventListener('click', () => act(hold.action));
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  if (drag) {
    let start;
    button.addEventListener('pointerdown', event => { start = event.clientX; });
    button.addEventListener('pointerup', event => { if (start - event.clientX > 35) act(drag.action); });
    if (!click) button.addEventListener('click', () => navigate('88:9901'));
  }
  return button;
}

function hintFor(screen) {
  if (screen.id === '80:14093') return 'Приглашение в демо отправлено. Через «Принять» можно посмотреть следующий шаг.';
  if (screen.id === '80:13982') return 'Пригласи своего бро. Выбор способа отправки тоже разыгрывается внутри прототипа.';
  if (screen.id === '134:10599') return 'Пинок отправлен. Можно отменить его или вернуться к прогрессу бро.';
  if (screen.id === '127:15243') return 'Выбери реакцию. Двойной тап по тренировке сразу ставит сердце.';
  if (screen.name.startsWith('Bro /') && !/Empty|Invite/.test(screen.name)) return 'Двойной тап по тренировке ставит сердце, удержание открывает реакции. По аватару доступны настройки бро.';
  if (screen.id === '80:17619') return 'Ввод разыгрывается на примере: нажми «Готово» на клавиатуре, чтобы записать подход.';
  if (screen.id === '80:16555') return 'Добавь выбранные упражнения. Удерживай строку жима лёжа, чтобы посмотреть описание.';
  if (screen.name.startsWith('Auth /')) return 'Это пример входа. Почта и код подставляются в макете, отправки писем нет.';
  if (screen.id === '88:9901') return 'Посмотри итог прошлой тренировки, сохрани шаблон или повтори её.';
  if (screen.height > 852) return 'Экран можно прокручивать внутри телефона. Кнопка «Назад» вернёт на предыдущий шаг.';
  if (screen.name.startsWith('WorkoutSummary /')) return 'Тренировка записана. Можно сохранить шаблон или вернуться на главную.';
  return scenario.hint;
}

function renderVariants() {
  el.variants.replaceChildren();
  if (scenario.key !== 'bro') return;
  for (const [label, id] of broVariants) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'variant';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(id === current.id));
    button.addEventListener('click', () => {
      broConnected = !['80:13982', '80:14136'].includes(id);
      navigate(id);
    });
    el.variants.append(button);
  }
}

async function navigate(id, { record = true, scroll = 0 } = {}) {
  const next = screens.get(id);
  if (!next) return;
  clearTimers();
  const token = ++revision;
  if (record && current && current.id !== id) trail.push({ id: current.id, scroll: el.viewport.scrollTop });
  current = next;
  el.screen.dataset.screen = id;
  el.screen.dataset.screenName = next.name;
  el.hotspots.replaceChildren();
  el.screen.querySelectorAll('.reaction-badge').forEach(item => item.remove());
  el.loading.hidden = false;
  try {
    const image = new Image();
    image.src = picture(id);
    await image.decode();
    if (token !== revision) return;
    el['screen-image'].src = image.src;
    el['screen-image'].height = next.height;
    el['screen-image'].alt = `Gym Bro: ${scenarios.find(item => item.key === scenario.key).label}`;
    el.screen.style.height = `${next.height}px`;
    // Transform changes visual size; margin also updates the scroll extent.
    const scale = Number(getComputedStyle(document.documentElement).getPropertyValue('--scale'));
    el.screen.style.marginBottom = `${next.height * (scale - 1)}px`;
    el.viewport.scrollTop = scroll;
    next.hotspots.forEach((hotspot, index) => {
      const timed = hotspot.events.filter(event => event.trigger === 'AFTER_TIMEOUT');
      timed.forEach(event => timers.push(setTimeout(() => act(event.action), event.delay * 1000)));
      if (hotspot.events.some(event => event.trigger !== 'AFTER_TIMEOUT')) el.hotspots.append(makeHotspot(hotspot, index));
    });
    if (next.name.startsWith('Bro /') && !/Empty|Invite|ReactionPicker|History/.test(next.name)) {
      lastBroScreen = next.id === '80:15351' ? '80:14179' : next.id;
      next.hotspots.filter(item => item.name === 'workout').forEach((card, index) => {
        if (!reactions[index]) return;
        const badge = document.createElement('img');
        badge.className = 'reaction-badge';
        badge.src = `/gym-bro-demo/reactions/${reactions[index]}.png`;
        badge.alt = {heart:'Сердце',fire:'Огонь',angry:'Злость'}[reactions[index]];
        badge.style.left = `${card.x + 293}px`;
        badge.style.top = `${card.y + 17}px`;
        el.screen.append(badge);
      });
    }
    el.hint.textContent = hintFor(next);
    el.back.disabled = trail.length === 0;
    el.status.textContent = `Сценарий «${scenario.label}». ${el.hint.textContent}`;
    renderVariants();
    // Fetch only likely next steps, never the whole collection of screens.
    const destinations = [...new Set(next.hotspots.flatMap(hotspot => hotspot.events.map(event => event.action.to)).filter(id => screens.has(id)))];
    destinations.slice(0, 4).forEach(destination => { const preload = new Image(); preload.src = picture(destination); });
  } catch {
    if (token !== revision) return;
    el.hint.textContent = 'Не удалось загрузить экран. Попробуй выбрать сценарий ещё раз.';
  } finally {
    if (token === revision) el.loading.hidden = true;
  }
}

function chooseScenario(next) {
  scenario = next;
  trail = [];
  current = undefined;
  reactions = {};
  broConnected = false;
  lastBroScreen = '80:14179';
  reactionCard = 0;
  history.replaceState(null, '', `#${next.key}`);
  el.scenarios.querySelectorAll('button').forEach(button => button.setAttribute('aria-current', String(button.dataset.scenario === next.key)));
  navigate(next.start, { record: false });
}

for (const [index, item] of scenarios.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scenario';
  button.dataset.scenario = item.key;
  const number = document.createElement('span');
  number.className = 'scenario-num';
  number.textContent = `0${index + 1}`;
  number.setAttribute('aria-hidden', 'true');
  button.append(number, item.label);
  button.addEventListener('click', () => chooseScenario(item));
  el.scenarios.append(button);
}
el.back.addEventListener('click', goBack);
el.restart.addEventListener('click', () => chooseScenario(scenario));
document.querySelectorAll('[data-expand]').forEach(button => button.addEventListener('click', () => {
  const expanded = document.body.classList.toggle('immersive');
  document.querySelector('.show-menu').hidden = !expanded;
  fit();
  window.scrollTo({ top: 0, behavior: 'auto' });
}));
el['show-hotspots'].addEventListener('click', () => {
  showHotspots = !showHotspots;
  el.device.classList.toggle('show-hotspots', showHotspots);
  el['show-hotspots'].setAttribute('aria-pressed', String(showHotspots));
});
el.screen.addEventListener('click', event => {
  if (event.target !== el.screen && event.target !== el.hotspots) return;
  clearTimeout(flashTimer);
  el.device.classList.add('flash-hotspots');
  flashTimer = setTimeout(() => el.device.classList.remove('flash-hotspots'), 1100);
});
addEventListener('keydown', event => { if (event.key === 'Escape') goBack(); });
addEventListener('hashchange', () => { const next = scenarios.find(item => item.key === location.hash.slice(1)); if (next) chooseScenario(next); });
chooseScenario(scenario);
