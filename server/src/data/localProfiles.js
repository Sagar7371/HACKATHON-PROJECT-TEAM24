import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const profilesPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/profiles.json');

function ensureStore() {
  if (!existsSync(profilesPath)) writeFileSync(profilesPath, '[]', 'utf8');
}

export function readProfiles() {
  ensureStore();
  return JSON.parse(readFileSync(profilesPath, 'utf8'));
}

export function writeProfiles(profiles) {
  ensureStore();
  writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');
}
