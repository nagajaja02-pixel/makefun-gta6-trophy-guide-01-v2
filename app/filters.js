// Filtering, searching and the spoiler setting for the trophy list, plus the
// shareable state the page reads from its own URL on load (grade, kind,
// status, missable, spoiler, search text, which trophy's guide to open, and
// which section to scroll to). The page never writes the URL as you click;
// the parameters exist so a view can be linked to and screenshotted.
export function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const state = {
    q: params.get('q') ?? '',
    grade: params.get('grade') ?? 'all',
    kind: params.get('kind') ?? 'all',
    status: params.get('status') ?? 'all',
    missableOnly: params.get('missable') === '1',
    spoiler: params.get('spoiler') !== 'off',
    openId: Number(params.get('open')) || null,
    scrollTo: params.get('scroll') || null,
  };
  if (!['all', 'platinum', 'gold', 'silver', 'bronze'].includes(state.grade)) state.grade = 'all';
  if (!['all', 'story', 'collectible', 'activity'].includes(state.kind)) state.kind = 'all';
  if (!['all', 'earned', 'missing'].includes(state.status)) state.status = 'all';
  return state;
}

// A trophy is hidden by the spoiler setting when it carries a story spoiler
// and the reader has not earned it yet.
export function isSpoilerHidden(trophy, earned, spoilerOn) {
  return spoilerOn && trophy.spoiler && !earned.has(trophy.id);
}

export function trophyMatches(trophy, filters, earned) {
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.kind !== 'all' && trophy.kind !== filters.kind) return false;
  if (filters.missableOnly && !trophy.missable) return false;
  if (filters.status === 'earned' && !earned.has(trophy.id)) return false;
  if (filters.status === 'missing' && earned.has(trophy.id)) return false;
  const q = filters.q.trim().toLowerCase();
  if (q) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function gradeLabel(grade) {
  return grade[0].toUpperCase() + grade.slice(1);
}

export function kindLabel(kind) {
  if (kind === 'story') return 'Story';
  if (kind === 'collectible') return 'Collectible';
  if (kind === 'activity') return 'Activity';
  return 'Platinum';
}
