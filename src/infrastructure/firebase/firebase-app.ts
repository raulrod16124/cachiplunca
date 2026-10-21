import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
  readonly storageBucket?: string;
  readonly messagingSenderId?: string;
  readonly measurementId?: string;
}

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;
const STORAGE_EMULATOR_HOST = '127.0.0.1';
const STORAGE_EMULATOR_PORT = 9199;

let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;

export function getFirebaseAuth(): Auth {
  if (cachedAuth === null) {
    cachedAuth = getAuth(getFirebaseApp());
    connectEmulatorIfEnabled(() =>
      connectAuthEmulator(cachedAuth as Auth, AUTH_EMULATOR_URL, { disableWarnings: true }),
    );
  }
  return cachedAuth;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (cachedStorage === null) {
    cachedStorage = getStorage(getFirebaseApp());
    connectEmulatorIfEnabled(() =>
      connectStorageEmulator(
        cachedStorage as FirebaseStorage,
        STORAGE_EMULATOR_HOST,
        STORAGE_EMULATOR_PORT,
      ),
    );
  }
  return cachedStorage;
}

export function getFirebaseFirestore(): Firestore {
  if (cachedFirestore === null) {
    cachedFirestore = getFirestore(getFirebaseApp());
    connectEmulatorIfEnabled(() =>
      connectFirestoreEmulator(
        cachedFirestore as Firestore,
        FIRESTORE_EMULATOR_HOST,
        FIRESTORE_EMULATOR_PORT,
      ),
    );
  }
  return cachedFirestore;
}

/**
 * Opt-in emulator wiring for local/E2E runs. Only active when
 * `VITE_USE_EMULATORS === 'true'`, so production and real-project builds are
 * unaffected and never leak into the emulator suite.
 */
function connectEmulatorIfEnabled(connect: () => void): void {
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    connect();
  }
}

function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(readFirebaseConfig());
}

function readFirebaseConfig(): FirebaseWebConfig {
  const env = import.meta.env;
  return {
    apiKey: readRequiredEnv('VITE_FIREBASE_API_KEY', env.VITE_FIREBASE_API_KEY),
    authDomain: readRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN', env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: readRequiredEnv('VITE_FIREBASE_PROJECT_ID', env.VITE_FIREBASE_PROJECT_ID),
    appId: readRequiredEnv('VITE_FIREBASE_APP_ID', env.VITE_FIREBASE_APP_ID),
    storageBucket: readOptionalEnv(
      'VITE_FIREBASE_STORAGE_BUCKET',
      env.VITE_FIREBASE_STORAGE_BUCKET,
    ),
    messagingSenderId: readOptionalEnv(
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    ),
    measurementId: readOptionalEnv(
      'VITE_FIREBASE_MEASUREMENT_ID',
      env.VITE_FIREBASE_MEASUREMENT_ID,
    ),
  };
}

function readRequiredEnv(name: string, value: unknown): string {
  const resolved = readOptionalEnv(name, value);
  if (resolved === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return resolved;
}

function readOptionalEnv(name: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid environment variable: ${name}`);
  }
  return value;
}
