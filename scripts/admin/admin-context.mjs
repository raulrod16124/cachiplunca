import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { applicationDefault, cert, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const DEFAULT_EMULATOR_PROJECT = 'demo-cachiplunca';
export const DEFAULT_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
export const DEFAULT_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

export function isEmulatorRequested(options = {}) {
  return (
    options.emulator === true ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST)
  );
}

export async function resolveProjectId(options = {}) {
  const explicit = typeof options.projectId === 'string' ? options.projectId.trim() : '';
  if (explicit.length > 0) {
    return explicit;
  }

  const envProject =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT;
  if (typeof envProject === 'string' && envProject.trim().length > 0) {
    return envProject.trim();
  }

  if (options.emulator === true) {
    return DEFAULT_EMULATOR_PROJECT;
  }

  const rcProject = await readFirebaseRcProject(options.rootDir);
  if (rcProject !== null) {
    return rcProject;
  }

  throw new Error('Missing project id. Use --project or set FIREBASE_PROJECT_ID.');
}

export async function readFirebaseRcProject(rootDir = process.cwd()) {
  try {
    const text = await readFile(path.join(rootDir, '.firebaserc'), 'utf8');
    const data = JSON.parse(text);
    const project = data?.projects?.default;
    return typeof project === 'string' && project.trim().length > 0 ? project.trim() : null;
  } catch {
    return null;
  }
}

export async function createAdminContext(options = {}) {
  const emulator = isEmulatorRequested(options);
  const projectId = await resolveProjectId({
    projectId: options.projectId,
    emulator,
    rootDir: options.rootDir,
  });

  if (emulator) {
    if (!projectId.startsWith('demo-')) {
      throw new Error(
        `Emulator project "${projectId}" must start with "demo-" to avoid touching production data.`,
      );
    }
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= DEFAULT_AUTH_EMULATOR_HOST;
    process.env.FIRESTORE_EMULATOR_HOST ??= DEFAULT_FIRESTORE_EMULATOR_HOST;
  }

  const appName = options.appName ?? 'cachiplunca-admin';
  const existing = getApps().find((app) => app.name === appName);
  const app =
    existing ??
    initializeApp(
      emulator ? { projectId } : { projectId, credential: await resolveCredential(options) },
      appName,
    );

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    projectId,
    mode: emulator ? 'emulator' : 'production',
  };
}

export async function closeAdminContext(context) {
  if (context?.app !== undefined) {
    await deleteApp(context.app);
  }
}

async function resolveCredential(options) {
  const inlineJson = options.serviceAccountJson ?? process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (typeof inlineJson === 'string' && inlineJson.trim().length > 0) {
    return cert(parseServiceAccount(inlineJson));
  }

  const filePath = options.serviceAccountPath ?? process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (typeof filePath === 'string' && filePath.trim().length > 0) {
    const text = await readFile(filePath, 'utf8');
    return cert(parseServiceAccount(text));
  }

  return applicationDefault();
}

function parseServiceAccount(value) {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed;
  } catch {
    throw new Error('The Firebase service account must be a valid JSON object.');
  }
}
