import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkoutState, updateValue, toggleSet, addSet, addExercise, markAll, workoutSummary, describeSets, workoutRecords } from './workout-state.js';

test('entering values suggests later sets without recording any set', () => {
  const state = createWorkoutState();
  updateValue(state, 0, 0, 'weight', 20.5);
  assert.equal(toggleSet(state, 0, 0), false);
  updateValue(state, 0, 0, 'reps', 10);
  assert.deepEqual(state.exercises[0].sets.map(set => [set.weight, set.reps, set.completed]), Array.from({ length: 3 }, () => [20.5, 10, false]));
  assert.equal(workoutSummary(state).completed, 0);
});

test('first and third checks do not skip an unfinished second set', () => {
  const state = createWorkoutState();
  state.expanded = 0;
  updateValue(state, 0, 0, 'weight', 20);
  updateValue(state, 0, 0, 'reps', 10);
  toggleSet(state, 0, 0);
  toggleSet(state, 0, 2);
  assert.equal(state.expanded, 0);
  assert.equal(workoutSummary(state).completed, 2);
  toggleSet(state, 0, 1);
  assert.equal(state.expanded, 1);
  assert.deepEqual(state.exercises[0].sets.map(set => set.completed), [true, true, true]);
});

test('corrections preserve manually edited later values and completed sets', () => {
  const state = createWorkoutState();
  updateValue(state, 0, 0, 'weight', 20);
  updateValue(state, 0, 0, 'reps', 10);
  updateValue(state, 0, 1, 'weight', 22.5);
  toggleSet(state, 0, 1);
  updateValue(state, 0, 0, 'weight', 25);
  assert.equal(state.exercises[0].sets[1].weight, 22.5);
  assert.equal(state.exercises[0].sets[1].completed, true);
  assert.equal(state.exercises[0].sets[2].weight, 22.5);
});

test('mark all records only valid sets; added sets copy values but remain unchecked', () => {
  const state = createWorkoutState();
  updateValue(state, 0, 2, 'weight', 40);
  updateValue(state, 0, 2, 'reps', 8);
  markAll(state, 0);
  assert.equal(workoutSummary(state).completed, 1);
  addSet(state, 0);
  assert.deepEqual(state.exercises[0].sets[3], { weight: 40, reps: 8, completed: false });
});

test('summary uses checked sets and groups; invalid reps cannot be recorded', () => {
  const state = createWorkoutState();
  assert.throws(() => updateValue(state, 0, 0, 'reps', 1.5));
  updateValue(state, 0, 0, 'weight', 0);
  updateValue(state, 0, 0, 'reps', 10);
  markAll(state, 0);
  assert.deepEqual(workoutSummary(state).groups, { 'Грудь': 3 });
  updateValue(state, 0, 0, 'reps', 0);
  assert.equal(state.exercises[0].sets[0].completed, false);
});

test('new exercise and new sessions have independent unchecked rows', () => {
  const state = createWorkoutState();
  assert.equal(addExercise(state, 'dumbbell'), true);
  assert.equal(addExercise(state, 'dumbbell'), false);
  assert.equal(state.expanded, 3);
  updateValue(state, 3, 0, 'weight', 12);
  assert.equal(createWorkoutState().exercises.length, 3);
  assert.equal(createWorkoutState().exercises[0].sets[0].weight, null);
});

test('a first custom workout starts empty; template selection has its own exercises', () => {
  const first = createWorkoutState({ templateKey: null, title: 'Первая', firstWorkout: true, goals: false });
  assert.equal(first.title, 'Первая');
  assert.equal(first.exercises.length, 0);
  assert.equal(addExercise(first, 'bench'), true);
  assert.equal(addExercise(first, 'bench'), false);
  assert.deepEqual(createWorkoutState({ templateKey: 'lower' }).exercises.map(item => item.group), ['Ноги', 'Ноги']);
  assert.ok(createWorkoutState({ templateKey: 'upper' }).exercises.every(item => item.group !== 'Ноги'));
  assert.equal(createWorkoutState().exercises[0].sets[0].weight, null);
});

test('composition summaries retain the app format and omit unrecorded sets', () => {
  const state = createWorkoutState();
  updateValue(state, 0, 0, 'weight', 20);
  updateValue(state, 0, 0, 'reps', 10);
  toggleSet(state, 0, 0);
  assert.equal(describeSets(state.exercises[0].sets), '20 кг × 10, 1 подход');
  updateValue(state, 0, 1, 'weight', 22.5);
  toggleSet(state, 0, 1);
  assert.equal(describeSets(state.exercises[0].sets), '20–22,5 кг, 2 подхода');
});

test('record cards appear only when a checked set exceeds the demo history', () => {
  const state = createWorkoutState();
  updateValue(state, 0, 0, 'weight', 60);
  updateValue(state, 0, 0, 'reps', 8);
  assert.equal(workoutRecords(state).length, 0);
  toggleSet(state, 0, 0);
  assert.equal(workoutRecords(state)[0].previous.weight, 57.5);
  state.firstWorkout = true;
  assert.equal(workoutRecords(state).length, 0);
});
