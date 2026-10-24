export function readPreference(storage, key, fallback, valid = () => true) {
  try {
    const value = JSON.parse(storage.getItem(key));
    return value !== null && valid(value) ? value : fallback;
  } catch { return fallback; }
}

export function writePreference(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
