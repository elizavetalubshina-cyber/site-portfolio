export const INITIAL_EXERCISES = [
  { key: 'bench', name: 'Жим лёжа', group: 'Грудь' },
  { key: 'pull', name: 'Тяга верхнего блока', group: 'Спина' },
  { key: 'squat', name: 'Приседания со штангой', group: 'Ноги' },
];

export const EXTRA_EXERCISES = [
  { key: 'dumbbell', name: 'Жим гантелей', group: 'Грудь' },
  { key: 'row', name: 'Тяга штанги', group: 'Спина' },
  { key: 'press', name: 'Жим ногами', group: 'Ноги' },
];

const newSet = () => ({ weight: null, reps: null, completed: false });
const newExercise = item => ({ ...item, sets: Array.from({ length: 3 }, newSet) });
export const ready = set => Number.isFinite(set.weight) && set.weight >= 0 && Number.isInteger(set.reps) && set.reps > 0;
export const done = exercise => exercise.sets.length > 0 && exercise.sets.every(set => set.completed);

export function createWorkoutState() {
  return { exercises: INITIAL_EXERCISES.map(newExercise), expanded: null, startedAt: null, finished: false, templateSaved: false };
}

export function updateValue(state, exerciseIndex, setIndex, kind, value) {
  if (!['weight', 'reps'].includes(kind)) throw new Error('Unknown field');
  if (value !== null && (!Number.isFinite(value) || value < 0 || kind === 'reps' && !Number.isInteger(value))) throw new Error('Invalid value');
  const exercise = state.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  const before = set[kind];
  const wasCompleted = set.completed;
  const next = kind === 'reps' && value === 0 ? null : value;
  set[kind] = next;
  if (!ready(set)) set.completed = false;
  // Suggested values follow edits; manually changed later values stay intact.
  if (!wasCompleted) {
    for (const later of exercise.sets.slice(setIndex + 1)) {
      if (!later.completed && (later[kind] === null || later[kind] === before)) later[kind] = next;
    }
  }
}

function advance(state, exerciseIndex) {
  const indices = state.exercises.map((_, i) => i);
  const next = [...indices.slice(exerciseIndex + 1), ...indices.slice(0, exerciseIndex)].find(i => !done(state.exercises[i]));
  state.expanded = next ?? null;
}

export function toggleSet(state, exerciseIndex, setIndex) {
  const exercise = state.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  if (!set.completed && !ready(set)) return false;
  set.completed = !set.completed;
  if (done(exercise)) advance(state, exerciseIndex);
  return true;
}

export function markAll(state, exerciseIndex) {
  const exercise = state.exercises[exerciseIndex];
  for (const set of exercise.sets) if (ready(set)) set.completed = true;
  if (done(exercise)) advance(state, exerciseIndex);
}

export function addSet(state, exerciseIndex) {
  const exercise = state.exercises[exerciseIndex];
  const last = exercise.sets.at(-1);
  exercise.sets.push({ ...newSet(), weight: last?.weight ?? null, reps: last?.reps ?? null });
}

export function addExercise(state, key) {
  const item = EXTRA_EXERCISES.find(item => item.key === key);
  if (!item || state.exercises.some(exercise => exercise.key === key)) return false;
  state.exercises.push(newExercise(item));
  state.expanded = state.exercises.length - 1;
  return true;
}

export function workoutSummary(state) {
  const groups = {};
  let completed = 0;
  for (const exercise of state.exercises) {
    const count = exercise.sets.filter(set => set.completed).length;
    completed += count;
    if (count) groups[exercise.group] = (groups[exercise.group] || 0) + count;
  }
  return {
    completed,
    total: state.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    exercises: state.exercises.filter(exercise => exercise.sets.some(set => set.completed)).length,
    groups,
  };
}
