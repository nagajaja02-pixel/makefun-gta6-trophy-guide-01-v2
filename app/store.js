// Progress storage for the trophy guide: the earned set lives in the reader's
// own browser (localStorage), and can be saved out to a file and loaded back.
// Nothing leaves the browser unless the reader exports it themselves.
const STORAGE_KEY = 'leonida-trophy-guide-v1';

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch {
    // Private browsing or a full store: the checklist still works for the visit.
  }
}

export function exportProgress(earned) {
  const blob = new Blob(
    [JSON.stringify({ app: 'leonida-trophy-guide', version: 1, earned: [...earned].sort((a, b) => a - b) }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-trophy-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importProgress(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(list)) throw new Error('not a progress file');
  const ids = list.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55);
  return new Set(ids);
}

export function clearEarned() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
