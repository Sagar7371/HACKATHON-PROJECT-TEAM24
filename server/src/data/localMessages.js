import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const messagesPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/messages.json');

function ensureStore() {
  if (!existsSync(messagesPath)) writeFileSync(messagesPath, '[]', 'utf8');
}

export function readMessages() {
  ensureStore();
  return JSON.parse(readFileSync(messagesPath, 'utf8'));
}

export function writeMessages(messages) {
  ensureStore();
  writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
}
