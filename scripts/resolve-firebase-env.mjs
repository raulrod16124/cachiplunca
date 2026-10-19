#!/usr/bin/env node
// Resolves the FIREBASE_WEB_CONFIG secret (JSON) into a .env.production.local
// file that Vite loads during `vite build`. Fails fast with workflow annotations
// when the secret is missing, malformed, or lacks required keys.
import { writeFileSync } from 'node:fs';

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const OPTIONAL_KEYS = [
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
];

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function normalizeKey(key) {
  return key.startsWith('VITE_') ? key : `VITE_${key}`;
}

const raw = process.env.FIREBASE_WEB_CONFIG;
if (raw === undefined || raw.trim() === '') {
  fail(
    'Missing FIREBASE_WEB_CONFIG repository secret. Add it in Settings > Secrets and variables > Actions.',
  );
}

let config;
try {
  config = JSON.parse(raw);
} catch {
  fail('FIREBASE_WEB_CONFIG is not valid JSON.');
}

if (typeof config !== 'object' || config === null || Array.isArray(config)) {
  fail('FIREBASE_WEB_CONFIG must be a JSON object.');
}

const normalized = Object.fromEntries(
  Object.entries(config)
    .filter(([, value]) => typeof value === 'string' && value !== '')
    .map(([key, value]) => [normalizeKey(key), value]),
);

const missing = REQUIRED_KEYS.filter((key) => normalized[key] === undefined);
if (missing.length > 0) {
  fail(`FIREBASE_WEB_CONFIG is missing required keys: ${missing.join(', ')}`);
}

const lines = [...REQUIRED_KEYS, ...OPTIONAL_KEYS]
  .filter((key) => normalized[key] !== undefined)
  .map((key) => `${key}=${JSON.stringify(normalized[key])}`);

writeFileSync('.env.production.local', `${lines.join('\n')}\n`, 'utf8');

console.log(
  `Wrote ${lines.length} variables to .env.production.local (${REQUIRED_KEYS.length} required, ${lines.length - REQUIRED_KEYS.length} optional).`,
);
