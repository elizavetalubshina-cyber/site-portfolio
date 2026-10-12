// Everything that changes during the challenge lives here.
//
// done: how many leg routines the girl has already sent. Each routine is one
// step along the road; the finish is weeks × perWeek steps away.
// avatar: a square photo in public/krysky/avatars/, e.g. '/krysky/avatars/liza.webp'.
// Without a photo the rat carries the first letter of the name.

export const challenge = {
  weeks: 4,
  perWeek: 2,
  // Optional: shown under the title when set, e.g. '1 ноября'.
  start: null,
  finish: null,
  // Optional: the date of the last update, e.g. '12 октября'.
  updated: null,
};

// Placeholder team: replace the names, photos and counts with the real ones.
export const team = [
  { name: 'Лиза', avatar: null, done: 3 },
  { name: 'Крыска 2', avatar: null, done: 5 },
  { name: 'Крыска 3', avatar: null, done: 2 },
  { name: 'Крыска 4', avatar: null, done: 8 },
  { name: 'Крыска 5', avatar: null, done: 0 },
  { name: 'Крыска 6', avatar: null, done: 3 },
];
