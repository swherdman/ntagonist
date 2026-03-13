// Named profile save/load system using localStorage
// Each profile stores: recordType + formData + updatedAt

const STORAGE_KEY = 'ntagonist_profiles';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function listProfiles() {
  const profiles = readAll();
  return Object.entries(profiles)
    .map(([name, data]) => ({ name, recordType: data.recordType, updatedAt: data.updatedAt }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function loadProfile(name) {
  const profiles = readAll();
  const profile = profiles[name];
  if (!profile) return null;
  return { recordType: profile.recordType, formData: profile.formData };
}

export function saveProfile(name, recordType, formData) {
  const profiles = readAll();
  profiles[name] = { recordType, formData, updatedAt: Date.now() };
  writeAll(profiles);
}

export function renameProfile(oldName, newName) {
  if (oldName === newName) return true;
  const profiles = readAll();
  if (!profiles[oldName]) return false;
  if (profiles[newName]) return false;
  profiles[newName] = profiles[oldName];
  profiles[newName].updatedAt = Date.now();
  delete profiles[oldName];
  writeAll(profiles);
  return true;
}

export function deleteProfile(name) {
  const profiles = readAll();
  delete profiles[name];
  writeAll(profiles);
}
