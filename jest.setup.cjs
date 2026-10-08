/**
 * Test-environment polyfills. Runs before test modules are loaded
 * (setupFilesAfterEnv), so react-router v7 can import safely.
 *
 * jsdom (jest-environment-jsdom 29) does not expose the WHATWG text codecs.
 * Node ships compatible implementations; requiring them from CJS keeps this
 * file out of the app's TypeScript program (no `node` types needed there).
 */
const { TextDecoder, TextEncoder } = require('node:util');

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}
