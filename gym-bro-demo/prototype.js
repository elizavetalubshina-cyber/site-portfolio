import data from './screens.json';
import { mountSky } from '../src/sky.js';
import { createWorkoutDemo } from './workout.js';

mountSky();

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
const workoutVariants = [
  { key: 'plan', label: 'По плану', start: '80:12474', hint: 'Начни тренировку по плану, запиши подходы и посмотри итог.', templates: true },
  { key: 'first', label: 'Первая тренировка', start: '80:12149', hint: 'Истории и шаблонов пока нет. Нажми «Начать», назови первую тренировку и выбери упражнения.', firstWorkout: true },
  { key: 'free', label: 'Без плана', start: '143:15564', hint: 'Создай тренировку с нуля: введи название, выбери упражнения и запиши подходы. Готовых шаблонов ещё нет.', firstWorkout: true },
  { key: 'templates', label: 'Из шаблона', start: '80:15513', hint: 'Выбери «Фулл бади», «Верх» или «Низ». Можно также создать тренировку с новым названием.', templates: true },
];
const el = Object.fromEntries(['screen', 'screen-image', 'hotspots', 'device', 'viewport', 'hint', 'variants', 'scenarios', 'back', 'restart', 'show-hotspots', 'status', 'loading', 'preview', 'player-tools', 'guide', 'guide-slot', 'scenario-menu', 'menu-content', 'menu-toggle', 'menu-close', 'menu-title'].map(id => [id, document.getElementById(id)]));
const mobileLayout = matchMedia('(max-width:760px)');
let scenario = scenarios.find(item => item.key === location.hash.slice(1).split('/')[0]) || scenarios[0];
let workoutVariant = workoutVariants.find(item => item.key === location.hash.slice(1).split('/')[1]) || workoutVariants[0];
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
let kickSent = false;
let kickAssetsReady;
const KICK_AVAILABLE = '80:14956';
const KICK_SENT = '134:10599';
const workoutDemo = createWorkoutDemo({
  onMinimize: () => navigate('80:12868'),
  onFinish: () => navigate(workoutDemo.firstWorkout ? '80:20785' : '80:20888'),
  onHome: () => navigate(workoutDemo.firstWorkout ? '80:12357' : '80:12474'),
  onBack: () => goBack(),
  onStart: () => navigate('80:16684'),
  onPreview: () => navigate('80:16769'),
  onName: () => navigate(workoutDemo.firstWorkout ? '143:15564' : '80:15513'),
  onChooseExercises: () => navigate('80:15752'),
  onExerciseInfo: () => navigate('80:11987'),
  onBind: () => navigate('80:21147'),
});
const picture = id => {
  const screenId = id === KICK_SENT ? KICK_AVAILABLE : id;
  const filename = screenId === '80:12474' ? '80-12474-clean' : screenId.replace(':', '-');
  return `/gym-bro-demo/screens/${filename}.webp`;
};

function prepareKickAssets() {
  kickAssetsReady ||= Promise.all(['paw', 'avatar', 'sent-button'].map(name => {
    const image = new Image();
    image.src = `/gym-bro-demo/kick/${name}.webp`;
    return image.decode();
  })).catch(() => { kickAssetsReady = undefined; });
  return kickAssetsReady;
}

function renderKickFeedback(animate) {
  const feedback = document.createElement('div');
  feedback.className = 'kick-feedback';
  const buttonMask = document.createElement('div');
  buttonMask.className = 'kick-sent-mask';
  const sent = document.createElement('img');
  sent.className = 'kick-sent-label';
  sent.src = '/gym-bro-demo/kick/sent-button.webp';
  sent.alt = 'Пинок отправлен';
  feedback.append(buttonMask, sent);

  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const mask = document.createElement('div');
    mask.className = 'kick-avatar-mask';
    const avatar = document.createElement('img');
    avatar.className = 'kick-avatar';
    avatar.src = '/gym-bro-demo/kick/avatar.webp';
    avatar.alt = '';
    const paw = document.createElement('img');
    paw.className = 'kick-paw';
    paw.src = '/gym-bro-demo/kick/paw.webp';
    paw.alt = '';
    feedback.append(mask, avatar, paw);
    paw.addEventListener('animationend', () => {
      mask.remove();
      avatar.remove();
      paw.remove();
    }, { once: true });
  }
  el.screen.append(feedback);
}

function fit() {
  const room = el.preview.clientHeight - el['player-tools'].offsetHeight - 12;
  const scale = Math.max(.1, Math.min(1, el.preview.clientWidth / 393, room / 852));
  const previousScale = Number(document.documentElement.style.getPropertyValue('--scale'));
  if (Math.abs(scale - previousScale) > .00001) document.documentElement.style.setProperty('--scale', scale);
  if (current) el.screen.style.marginBottom = `${(parseFloat(el.screen.style.height) || current.height) * (scale - 1)}px`;
}

function openMenu() {
  if (!mobileLayout.matches || el['scenario-menu'].open) return;
  el['scenario-menu'].showModal();
  el['menu-toggle'].setAttribute('aria-expanded', 'true');
  el['menu-title'].focus({ preventScroll: true });
}

function closeMenu() {
  if (!el['scenario-menu'].open) return;
  el['scenario-menu'].close();
  el['menu-toggle'].setAttribute('aria-expanded', 'false');
  if (mobileLayout.matches) el['menu-toggle'].focus({ preventScroll: true });
}

function syncLayout() {
  const parent = mobileLayout.matches ? el['menu-content'] : el['guide-slot'];
  if (el.guide.parentElement !== parent) {
    closeMenu();
    parent.append(el.guide);
  }
  fit();
}

function updateBackButton() {
  const hasPrevious = trail.length > 0;
  el.back.textContent = hasPrevious ? '← Назад' : '← К кейсу';
  el.back.setAttribute('aria-label', hasPrevious ? 'Назад' : 'Вернуться к кейсу');
}

mobileLayout.addEventListener('change', syncLayout);
addEventListener('resize', fit);
const playerResize = new ResizeObserver(fit);
playerResize.observe(el.preview);
playerResize.observe(el['player-tools']);

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function goBack({ leaveAtRoot = false } = {}) {
  if (el['scenario-menu'].open) return closeMenu();
  const previous = trail.pop();
  if (previous) return navigate(previous.id, { record: false, scroll: previous.scroll });
  const home = workoutDemo.firstWorkout ? '80:12149' : '80:12474';
  if (!leaveAtRoot && current?.id !== home) return navigate(home, { record: false });
  location.assign('/cases/gym-bro.html');
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

function act(action, { record = true } = {}) {
  if (action.type === 'BACK') return goBack();
  if (action.type !== 'NODE') return;
  if (current?.id === '80:16555' && action.to === '80:16684') workoutDemo.acceptPickerSelection();
  if (current?.name.startsWith('Home /') && action.to === '80:15513' && workoutDemo.firstWorkout) return navigate('143:15564', { record });
  if (current?.id === '80:12868' && action.to === '80:20580' && workoutDemo.inProgress) {
    return navigate('80:16684', { record }).then(() => workoutDemo.requestFinish());
  }
  if (current?.id === KICK_AVAILABLE && action.to === KICK_SENT) {
    if (kickSent) return;
    kickSent = true;
    // Sending is a state change. Going back must not undo or replay it.
    return navigate(KICK_SENT, { record: false, animateKick: true });
  }
  if (current?.id === '80:14136' && action.to === '80:14179') broConnected = true;
  if (current?.id === '127:15156' && action.to === '80:13982') {
    broConnected = false;
    reactions = {};
    lastBroScreen = '80:14179';
  }
  navigate(resolveDestination(action.to), { record });
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
  if (screen.id === KICK_SENT) return 'Пинок отправлен. Можно посмотреть прогресс бро или продолжить свою тренировку.';
  if (screen.id === '127:15243') return 'Выбери реакцию. Двойной тап по тренировке сразу ставит сердце.';
  if (screen.name.startsWith('Bro /') && !/Empty|Invite/.test(screen.name)) return 'Двойной тап по тренировке ставит сердце, удержание открывает реакции. По аватару доступны настройки бро.';
  if (screen.name.startsWith('ActiveWorkout /')) return 'Введи вес и повторы. Отметь каждый подход отдельно. Когда все подходы упражнения выполнены, раскроется следующее.';
  if (screen.id === '80:16555') return 'Добавь выбранные упражнения. Удерживай строку жима лёжа, чтобы посмотреть описание.';
  if (screen.name.startsWith('Auth /')) return 'Это пример входа. Почта и код подставляются в макете, отправки писем нет.';
  if (screen.id === '88:9901') return 'Посмотри итог прошлой тренировки, сохрани шаблон или повтори её.';
  if (screen.name.startsWith('WorkoutSummary /')) return 'Тренировка записана. Можно сохранить шаблон или вернуться на главную.';
  if (screen.height > 852) return 'Экран можно прокручивать внутри телефона.';
  return scenario.key === 'workout' ? workoutVariant.hint : scenario.hint;
}

function renderVariants() {
  el.variants.replaceChildren();
  if (scenario.key === 'workout') {
    for (const variant of workoutVariants) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'variant';
      button.append(choiceMarker(), variant.label);
      button.setAttribute('aria-pressed', String(variant.key === workoutVariant.key));
      button.addEventListener('click', () => chooseScenario(scenarios[0], variant));
      el.variants.append(button);
    }
    return;
  }
  if (scenario.key !== 'bro') return;
  for (const [label, id] of broVariants) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'variant';
    button.append(choiceMarker(), label);
    button.setAttribute('aria-pressed', String(id === current.id || id === KICK_AVAILABLE && current.id === KICK_SENT));
    button.addEventListener('click', () => {
      broConnected = !['80:13982', '80:14136'].includes(id);
      closeMenu();
      navigate(id);
    });
    el.variants.append(button);
  }
}

async function navigate(id, { record = true, scroll = 0, animateKick = false } = {}) {
  if (id === KICK_AVAILABLE && kickSent) id = KICK_SENT;
  const next = screens.get(id);
  if (!next) return;
  const activeWorkout = next.name.startsWith('ActiveWorkout /');
  const workoutSummary = workoutDemo.finished && ['80:20785', '80:20888'].includes(id);
  const workoutNaming = next.name.startsWith('Sheet / NewWorkout /');
  const workoutPreview = id === '80:16769';
  const workoutLayer = activeWorkout || workoutSummary || workoutNaming || workoutPreview;
  if (activeWorkout && workoutDemo.finished && record) workoutDemo.reset();
  clearTimers();
  const token = ++revision;
  if (record && current && current.id !== id) trail.push({ id: current.id, scroll: el.viewport.scrollTop });
  current = next;
  updateBackButton();
  el.screen.dataset.screen = id;
  el.screen.dataset.screenName = next.name;
  el.screen.setAttribute('aria-busy', 'true');
  el.hotspots.inert = true;
  const previousWorkout = el.screen.querySelector('.workout-demo');
  if (previousWorkout) previousWorkout.inert = true;
  el.loading.hidden = true;
  const loadingTimer = setTimeout(() => {
    if (token === revision) el.loading.hidden = false;
  }, 180);
  try {
    const image = new Image();
    image.src = picture(workoutLayer ? '80:16684' : id);
    await image.decode();
    if (id === KICK_SENT) await prepareKickAssets();
    if (token !== revision) return;
    workoutDemo.unmount();
    el.hotspots.replaceChildren();
    el.screen.querySelectorAll('.reaction-badge, .kick-feedback, .workout-progress, .workout-picker-title, .workout-progress-title, .workout-recent-label').forEach(item => item.remove());
    el['screen-image'].src = image.src;
    const renderedHeight = workoutLayer ? 852 : next.height;
    el['screen-image'].height = renderedHeight;
    el['screen-image'].alt = `Gym Bro: ${scenarios.find(item => item.key === scenario.key).label}`;
    el.screen.style.height = `${renderedHeight}px`;
    // Transform changes visual size; margin also updates the scroll extent.
    const scale = Number(getComputedStyle(document.documentElement).getPropertyValue('--scale'));
    el.screen.style.marginBottom = `${renderedHeight * (scale - 1)}px`;
    el.viewport.scrollTop = scroll;
    if (!workoutLayer) next.hotspots.forEach((hotspot, index) => {
      const timed = hotspot.events.filter(event => event.trigger === 'AFTER_TIMEOUT');
      timed.forEach(event => timers.push(setTimeout(() => act(event.action, { record: false }), event.delay * 1000)));
      if (hotspot.events.some(event => event.trigger !== 'AFTER_TIMEOUT')) el.hotspots.append(makeHotspot(hotspot, index));
    });
    if (workoutLayer) workoutDemo.mount(el.screen, workoutSummary ? 'summary' : workoutNaming ? 'naming' : workoutPreview ? 'preview' : 'active', { templates: id !== '143:15564' && !workoutDemo.firstWorkout });
    if (next.name.startsWith('Sheet / ExercisePicker /')) {
      const title = document.createElement('div');
      title.className = 'workout-picker-title';
      title.textContent = workoutDemo.title.toUpperCase();
      el.screen.append(title);
    }
    if (id === '80:12868' && workoutDemo.inProgress) {
      const progress = document.createElement('div');
      progress.className = 'workout-progress';
      progress.textContent = workoutDemo.progressText;
      el.screen.append(progress);
      const title = document.createElement('div');
      title.className = 'workout-progress-title';
      title.textContent = workoutDemo.title.toUpperCase();
      el.screen.append(title);
      el.hotspots.querySelector('[data-hotspot="143:18368"]')?.setAttribute('aria-label', `Идёт сейчас ${workoutDemo.title}. ${workoutDemo.progressText}. Продолжить тренировку`);
    }
    const recent = next.name.startsWith('Home /') && workoutDemo.finished && next.hotspots.find(item => item.name === 'recent');
    if (recent) {
      for (const [subtitle, text] of [[false, workoutDemo.title.toUpperCase()], [true, workoutDemo.recentSubtitle]]) {
        const label = document.createElement('div');
        label.className = `workout-recent-label${subtitle ? ' is-subtitle' : ''}`;
        label.style.left = `${recent.x + 16}px`;
        label.style.top = `${recent.y + (subtitle ? 36 : 12)}px`;
        label.style.width = `${recent.w - 48}px`;
        label.textContent = text;
        el.screen.append(label);
      }
    }
    if (id === KICK_SENT) renderKickFeedback(animateKick);
    if (id === KICK_AVAILABLE) prepareKickAssets();
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
    updateBackButton();
    el.status.textContent = `Сценарий «${scenario.label}». ${el.hint.textContent}`;
    renderVariants();
    // Fetch only likely next steps, never the whole collection of screens.
    const destinations = [...new Set(next.hotspots.flatMap(hotspot => hotspot.events.map(event => event.action.to)).filter(id => screens.has(id)))];
    destinations.slice(0, 4).forEach(destination => { const preload = new Image(); preload.src = picture(destination); });
  } catch {
    if (token !== revision) return;
    el.hint.textContent = 'Не удалось загрузить экран. Попробуй выбрать сценарий ещё раз.';
  } finally {
    clearTimeout(loadingTimer);
    if (token === revision) {
      el.loading.hidden = true;
      el.screen.setAttribute('aria-busy', 'false');
      el.hotspots.inert = false;
      const layer = el.screen.querySelector('.workout-demo');
      if (layer) layer.inert = false;
    }
  }
}

function chooseScenario(next, variant = workoutVariant) {
  closeMenu();
  workoutVariant = variant;
  const firstWorkout = next.key === 'first' || next.key === 'workout' && Boolean(variant.firstWorkout);
  workoutDemo.reset({ firstWorkout, goals: !firstWorkout });
  scenario = next;
  trail = [];
  current = undefined;
  reactions = {};
  broConnected = false;
  lastBroScreen = '80:14179';
  kickSent = false;
  reactionCard = 0;
  history.replaceState(null, '', `#${next.key}${next.key === 'workout' && variant.key !== 'plan' ? `/${variant.key}` : ''}`);
  el.scenarios.querySelectorAll('button').forEach(button => button.setAttribute('aria-current', String(button.dataset.scenario === next.key)));
  navigate(next.key === 'workout' ? variant.start : next.start, { record: false });
}

function choiceMarker() {
  const marker = document.createElement('span');
  marker.className = 'choice-marker';
  marker.setAttribute('aria-hidden', 'true');
  return marker;
}

for (const item of scenarios) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scenario';
  button.dataset.scenario = item.key;
  button.append(choiceMarker(), item.label);
  button.addEventListener('click', () => chooseScenario(item));
  el.scenarios.append(button);
}
el.back.addEventListener('click', () => goBack({ leaveAtRoot: true }));
el.restart.addEventListener('click', () => chooseScenario(scenario));
el['menu-toggle'].addEventListener('click', openMenu);
el['menu-close'].addEventListener('click', closeMenu);
el['scenario-menu'].addEventListener('cancel', event => {
  event.preventDefault();
  closeMenu();
});
el['scenario-menu'].addEventListener('click', event => {
  if (event.target !== el['scenario-menu']) return;
  const box = el['scenario-menu'].getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeMenu();
});
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
addEventListener('pointerdown', () => {
  document.documentElement.dataset.inputMode = 'pointer';
}, { capture: true });
addEventListener('keydown', event => {
  if (event.key === 'Tab') document.documentElement.dataset.inputMode = 'keyboard';
  if (event.key === 'Escape' && !el['scenario-menu'].open && trail.length) goBack();
});
addEventListener('hashchange', () => {
  const [key, variantKey] = location.hash.slice(1).split('/');
  const next = scenarios.find(item => item.key === key);
  if (next) chooseScenario(next, workoutVariants.find(item => item.key === variantKey) || workoutVariants[0]);
});
syncLayout();
chooseScenario(scenario);
