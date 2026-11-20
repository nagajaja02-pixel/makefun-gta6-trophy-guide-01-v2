// Leonida Trophy Guide — the app. Loads the trophy data, renders the checklist,
// the roadmap and the missable watchlist, and wires up the filters, the spoiler
// setting and progress export/import. All state lives in this file; persistence
// lives in store.js and filtering lives in filters.js.
import { loadEarned, saveEarned, exportProgress, importProgress, clearEarned } from './store.js';
import { readUrlState, isSpoilerHidden, trophyMatches, gradeLabel, kindLabel } from './filters.js';

// The road to the platinum, in order, built from the official descriptions:
// which story chapters and missions, which collectibles and their counts.
const ROADMAP_STAGES = [
  {
    title: 'Play the story',
    trophies: '12 trophies: chapters 1–4, the final mission and the six named missions',
    body: 'Start here. The story unlocks the whole of Leonida and most of the activities. '
      + 'Finish chapters 1 to 4, the missions Breakfast Run, The Cartel Heist, Child\u2019s Play, '
      + 'Headliners, VCIA Takedown and Operation Savage Glory, and the final mission. Story '
      + 'trophies are never missable — missions can be replayed.',
  },
  {
    title: 'Meet the strangers',
    trophies: '6 trophies: 8 stranger strands and 5 character finales',
    body: 'Between story missions, meet the strangers marked around Leonida and follow their '
      + 'strands. Finish any 8 stranger strands, and complete the final mission for each of '
      + 'Andy, Kenton, Billy, Randy and Tyrone.',
  },
  {
    title: 'Activities',
    trophies: 'Stunts, range, races, fishing, arcade, bowling, meditation, challenges',
    body: 'Work through the activities: 250 stunts, gold in all 42 Shooting Range challenges, '
      + 'a Top Fun Drone Race win at all 14 locations, 20 different race wins, a fishing '
      + 'challenge win over Cal, one arcade game, a bowling game, meditation at all 18 spots, '
      + 'and 50 Challenges. Try all 9 activity types once along the way.',
  },
  {
    title: 'Collectibles',
    trophies: '7 trophies: cards, WAiNK, vehicles, areas, garages, scooters',
    body: 'Sweep the state: complete 3 Collectible Card sets, WAiNK It at 100 locations, '
      + 'discover 100 vehicles, explore all 52 areas, buy all 8 garage properties and register '
      + '10 vehicles in the Scooter Bros app. The in-game lists show what is left.',
  },
  {
    title: 'Crime, money and cleanup',
    trophies: 'Vaults, trucks, gangs, laundering, spending — then 100% and the platinum',
    body: 'Finish the crime set: 5 Bank Vaults robbed and escaped, an Armored Truck, a jewelry '
      + 'store taken clean, one Illegal Operation from each of the 9 gangs, $250,000 laundered '
      + 'through contacts and $100,000 spent in shops. Then mop up the last few trophies, reach '
      + '100% completion, and the platinum pops with it.',
  },
];

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;
const urlState = readUrlState();

const state = {
  earned: loadEarned(),
  openId: urlState.openId,
  filters: {
    q: urlState.q,
    grade: urlState.grade,
    kind: urlState.kind,
    status: urlState.status,
    missableOnly: urlState.missableOnly,
  },
  spoilerOn: urlState.spoiler,
};

const cardsEl = document.getElementById('cards');
const emptyEl = document.getElementById('empty');
const countLineEl = document.getElementById('count-line');

function gradeCounts() {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (state.earned.has(t.id)) counts[t.grade] += 1;
  return counts;
}

function renderProgress() {
  const total = trophies.length;
  const earned = state.earned.size;
  const pct = Math.round((earned / total) * 100);
  document.getElementById('progress-count').textContent = `${earned} of ${total} earned`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  const c = gradeCounts();
  document.getElementById('progress-grades').textContent =
    `Platinum ${c.platinum}/1 · Gold ${c.gold}/2 · Silver ${c.silver}/6 · Bronze ${c.bronze}/46`;
}

function spoilerMask(trophy) {
  return {
    name: 'Hidden story trophy',
    description: 'Hidden until earned — tick it off to reveal its name and description.',
    guide: 'Hidden until earned.',
  };
}

function trophyCard(trophy) {
  const earned = state.earned.has(trophy.id);
  const hidden = isSpoilerHidden(trophy, state.earned, state.spoilerOn);
  const shown = hidden ? spoilerMask(trophy) : trophy;
  const open = state.openId === trophy.id;

  const card = document.createElement('article');
  card.className = `card grade-${trophy.grade}` + (earned ? ' earned' : '') + (hidden ? ' spoiler-hidden' : '');
  card.dataset.id = String(trophy.id);

  const tick = document.createElement('label');
  tick.className = 'tick';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', `Mark ${hidden ? 'this trophy' : trophy.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(trophy.id);
    else state.earned.delete(trophy.id);
    saveEarned(state.earned);
    renderProgress();
    renderCards();
  });
  const tickText = document.createElement('span');
  tickText.textContent = earned ? 'Earned' : 'Earn it';
  tick.append(box, tickText);

  const body = document.createElement('div');
  body.className = 'card-body';

  const top = document.createElement('div');
  top.className = 'card-top';
  const badge = document.createElement('span');
  badge.className = `badge grade-${trophy.grade}`;
  badge.textContent = gradeLabel(trophy.grade);
  top.append(badge);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = kindLabel(trophy.kind);
  top.append(kindTag);
  if (trophy.missable) {
    const flag = document.createElement('span');
    flag.className = 'flag-missable';
    flag.textContent = 'Missable — watch';
    top.append(flag);
  }
  if (hidden) {
    const flag = document.createElement('span');
    flag.className = 'flag-spoiler';
    flag.textContent = 'Story spoiler hidden';
    top.append(flag);
  }

  const name = document.createElement('h3');
  name.textContent = shown.name;
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = shown.description;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  toggle.textContent = open ? 'Hide the guide' : 'How to earn it';
  toggle.setAttribute('aria-expanded', String(open));

  const guide = document.createElement('div');
  guide.className = 'guide';
  guide.hidden = !open;
  const guideText = document.createElement('p');
  guideText.textContent = shown.guide;
  guide.append(guideText);
  if (!hidden && trophy.missableNote) {
    const note = document.createElement('p');
    note.className = 'missable-note';
    note.textContent = `Watch out: ${trophy.missableNote}`;
    guide.append(note);
  }
  if (!hidden) {
    const sources = document.createElement('p');
    sources.className = 'sources';
    sources.textContent = `Sources: ${trophy.sources.join('; ')}.`;
    guide.append(sources);
  }
  toggle.addEventListener('click', () => {
    state.openId = state.openId === trophy.id ? null : trophy.id;
    renderCards();
  });

  body.append(top, name, desc, toggle, guide);
  card.append(tick, body);
  return card;
}

function renderCards() {
  const visible = trophies.filter((t) => trophyMatches(t, state.filters, state.earned));
  cardsEl.replaceChildren(...visible.map(trophyCard));
  emptyEl.hidden = visible.length > 0;
  const shown = visible.length;
  countLineEl.textContent =
    `Showing ${shown} of ${trophies.length} trophies` +
    (state.spoilerOn ? ' · story spoilers hidden until earned' : ' · story spoilers revealed');
}

function renderRoadmap() {
  const list = document.getElementById('stages');
  for (const [index, stage] of ROADMAP_STAGES.entries()) {
    const item = document.createElement('li');
    const title = document.createElement('h3');
    title.textContent = `Stage ${index + 1} — ${stage.title}`;
    const meta = document.createElement('p');
    meta.className = 'stage-meta';
    meta.textContent = stage.trophies;
    const body = document.createElement('p');
    body.textContent = stage.body;
    item.append(title, meta, body);
    list.append(item);
  }
}

function renderWatchlist() {
  const wrap = document.getElementById('watch-cards');
  const watched = trophies.filter((t) => t.missable);
  for (const t of watched) {
    const card = document.createElement('article');
    card.className = 'watch-card';
    const name = document.createElement('h3');
    name.textContent = `${t.name} — ${gradeLabel(t.grade)}`;
    const note = document.createElement('p');
    note.textContent = t.missableNote;
    const guide = document.createElement('p');
    guide.className = 'watch-guide';
    guide.textContent = t.guide;
    card.append(name, note, guide);
    wrap.append(card);
  }
}

function renderFooter() {
  document.getElementById('release-note').textContent = data.release;
  document.getElementById('honesty').textContent =
    data.sourcesNote +
    ' GTA VI is not out yet, so where the exact in-game trigger is not public the guide says so ' +
    'plainly instead of guessing, and those guides will be confirmed at launch. Story trophies are ' +
    'hidden by the spoiler setting until you earn them.';
  const allSources = [...new Set(trophies.flatMap((t) => t.sources))];
  allSources.push('Rockstar Games — GTA VI release announcement (May 2025)');
  const list = document.getElementById('sources');
  for (const source of allSources) {
    const item = document.createElement('li');
    item.textContent = source;
    list.append(item);
  }
}

function bindControls() {
  const q = document.getElementById('q');
  const grade = document.getElementById('grade');
  const kind = document.getElementById('kind');
  const status = document.getElementById('status');
  const missableOnly = document.getElementById('missable-only');
  const spoiler = document.getElementById('spoiler');

  q.value = state.filters.q;
  grade.value = state.filters.grade;
  kind.value = state.filters.kind;
  status.value = state.filters.status;
  missableOnly.checked = state.filters.missableOnly;
  spoiler.checked = state.spoilerOn;

  q.addEventListener('input', () => { state.filters.q = q.value; renderCards(); });
  grade.addEventListener('change', () => { state.filters.grade = grade.value; renderCards(); });
  kind.addEventListener('change', () => { state.filters.kind = kind.value; renderCards(); });
  status.addEventListener('change', () => { state.filters.status = status.value; renderCards(); });
  missableOnly.addEventListener('change', () => { state.filters.missableOnly = missableOnly.checked; renderCards(); });
  spoiler.addEventListener('change', () => { state.spoilerOn = spoiler.checked; renderCards(); });

  document.getElementById('export').addEventListener('click', () => exportProgress(state.earned));
  document.getElementById('import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = await importProgress(file);
      state.earned = imported;
      saveEarned(state.earned);
      renderProgress();
      renderCards();
    } catch {
      alert('That file is not a trophy progress export from this guide.');
    }
    event.target.value = '';
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Clear all earned trophies?')) return;
    state.earned = new Set();
    clearEarned();
    renderProgress();
    renderCards();
  });
}

renderProgress();
renderRoadmap();
renderWatchlist();
renderFooter();
bindControls();
renderCards();

if (urlState.scrollTo) {
  const target = document.getElementById(urlState.scrollTo);
  if (target) target.scrollIntoView();
} else if (urlState.openId) {
  // A link to one trophy's guide scrolls that card into view on load.
  const card = cardsEl.querySelector(`.card[data-id="${urlState.openId}"]`);
  if (card) card.scrollIntoView({ block: 'center' });
}
