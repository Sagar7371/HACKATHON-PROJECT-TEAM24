import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function collectionPath(file) {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../data', file);
}

export function readCollection(file) {
  const path = collectionPath(file);
  if (!existsSync(path)) writeFileSync(path, '[]', 'utf8');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeCollection(file, records) {
  writeFileSync(collectionPath(file), JSON.stringify(records, null, 2), 'utf8');
}
