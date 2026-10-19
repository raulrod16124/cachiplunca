#!/usr/bin/env node
// Resolves the FIREBASE_WEB_CONFIG secret (JSON) into a .env.production.local
// file that Vite loads during `vite build`. Fails fast with workflow annotations
// when the secret is missing, malformed, lacks required keys, or carries
// redacted/placeholder values that would otherwise ship a build unable to reach
// Firebase Auth. Logs only key names and value lengths, never the values.
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

const KEY_RULES = {
  VITE_FIREBASE_API_KEY: {
    expectation: 'a Google API key starting with "AIza"',
    pattern: /^AIza[A-Za-z0-9_-]{20,}$/,
  },
  VITE_FIREBASE_AUTH_DOMAIN: {
    expectation: 'a domain ending in ".firebaseapp.com" or ".web.app"',
    pattern: /\.(firebaseapp\.com|web\.app)$/,
  },
  VITE_FIREBASE_PROJECT_ID: {
    expectation: 'a lowercase project id such as "my-app-dev"',
    pattern: /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/,
  },
  VITE_FIREBASE_APP_ID: {
    expectation: 'a Firebase web app id such as "1:1234567890:web:abc123"',
    pattern: /^\d+:[A-Za-z0-9]+:web:[A-Za-z0-9]+$/,
  },
  VITE_FIREBASE_MESSAGING_SENDER_ID: {
    expectation: 'a numeric sender id',
    pattern: /^\d+$/,
  },
  VITE_FIREBASE_MEASUREMENT_ID: {
    expectation: 'a Google Analytics id such as "G-ABC123"',
    pattern: /^G-[A-Z0-9]+$/,
  },
};

// A value made only of punctuation, whitespace or redaction characters
// ("", "\", "***", "xxxx") can never be a real Firebase value.
const PLACEHOLDER_PATTERN = /^[-*\\."'\sx]+$/i;

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

const KNOWN_KEYS = new Set([...REQUIRED_KEYS, ...OPTIONAL_KEYS]);

// Accepts every common spelling: the Firebase console's camelCase config
// ("apiKey"), plus "FIREBASE_API_KEY" and "VITE_FIREBASE_API_KEY".
function normalizeKey(key) {
  const snakeCase = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
  const bare = snakeCase.replace(/^VITE_/, '').replace(/^FIREBASE_/, '');
  const candidate = `VITE_FIREBASE_${bare}`;
  if (KNOWN_KEYS.has(candidate)) {
    return candidate;
  }
  return snakeCase.startsWith('VITE_') ? snakeCase : `VITE_${snakeCase}`;
}

function describeLength(value) {
  return `${value.length} chars`;
}

function validateValue(key, value) {
  if (PLACEHOLDER_PATTERN.test(value)) {
    fail(
      `${key} looks like a placeholder or redacted value (${describeLength(value)}). ` +
        'Copy the real value from the Firebase console (Project settings > Your apps > SDK setup).',
    );
  }

  const rule = KEY_RULES[key];
  if (rule !== undefined && !rule.pattern.test(value)) {
    fail(`${key} is not ${rule.expectation} (got ${describeLength(value)}).`);
  }
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
    .map(([key, value]) => [
      normalizeKey(key.trim()),
      typeof value === 'string' ? value.trim() : value,
    ])
    .filter(([, value]) => typeof value === 'string' && value !== ''),
);

const missing = REQUIRED_KEYS.filter((key) => normalized[key] === undefined);
if (missing.length > 0) {
  fail(`FIREBASE_WEB_CONFIG is missing required keys: ${missing.join(', ')}`);
}

const resolvedKeys = [...REQUIRED_KEYS, ...OPTIONAL_KEYS].filter(
  (key) => normalized[key] !== undefined,
);

for (const key of resolvedKeys) {
  validateValue(key, normalized[key]);
}

const lines = resolvedKeys.map((key) => `${key}=${JSON.stringify(normalized[key])}`);

writeFileSync('.env.production.local', `${lines.join('\n')}\n`, 'utf8');

const requiredCount = REQUIRED_KEYS.filter((key) => normalized[key] !== undefined).length;
console.log(
  `Wrote ${lines.length} variables to .env.production.local (${requiredCount} required, ${lines.length - requiredCount} optional).`,
);
for (const key of resolvedKeys) {
  console.log(`  ${key}: ${normalized[key].length} chars`);
}
