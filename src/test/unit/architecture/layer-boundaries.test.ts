import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Architecture boundary gate (TASK-122).
 *
 * Enforces the dependency rules declared in AGENTS.md and
 * docs/mvp-backlog.md (section 3):
 *
 * Presentation → Application → Domain
 * Infrastructure → Application ports → Domain
 * app/ is the composition root and may depend on every layer.
 *
 * No production file may depend on src/test.
 */

const SRC_ROOT = path.resolve(__dirname, '../../..');

const LAYERS = [
  'domain',
  'application',
  'shared',
  'infrastructure',
  'presentation',
  'app',
] as const;

type Layer = (typeof LAYERS)[number];

const ALLOWED_TARGET_LAYERS: Readonly<Record<Layer, readonly Layer[]>> = {
  domain: ['domain', 'shared'],
  application: ['application', 'domain', 'shared'],
  shared: ['shared'],
  infrastructure: ['infrastructure', 'application', 'domain', 'shared'],
  presentation: ['presentation', 'application', 'domain', 'shared'],
  app: ['app', 'presentation', 'application', 'domain', 'infrastructure', 'shared'],
};

const FORBIDDEN_PACKAGES: Readonly<Record<Layer, readonly string[]>> = {
  domain: [
    'react',
    'react-dom',
    'react-router-dom',
    'styled-components',
    'firebase',
    '@firebase',
    '@raulrod',
    'node',
  ],
  application: [
    'react',
    'react-dom',
    'react-router-dom',
    'styled-components',
    'firebase',
    '@firebase',
    '@raulrod',
    'node',
  ],
  shared: [
    'react',
    'react-dom',
    'react-router-dom',
    'styled-components',
    'firebase',
    '@firebase',
    '@raulrod',
    'node',
  ],
  infrastructure: [
    'react',
    'react-dom',
    'react-router-dom',
    'styled-components',
    '@raulrod',
    'node',
  ],
  presentation: ['firebase', '@firebase', 'node'],
  app: ['node'],
};

const BROWSER_API_PATTERN = /\b(?:window\.|document\.|navigator\.|localStorage|sessionStorage)\b/;
const BROWSER_API_LAYERS: readonly Layer[] = ['domain', 'application', 'shared'];

const ASSET_PATTERN = /\.(?:css|svg|png|jpe?g|gif|webp|woff2?|json)$/;

const IMPORT_PATTERN = /(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;

const CODE_EXTENSIONS = new Set(['.ts', '.tsx']);

interface SourceFile {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly layer: Layer;
  readonly contents: string;
}

interface Violation {
  readonly file: string;
  readonly specifier: string;
  readonly reason: string;
}

function isCodeFile(fileName: string): boolean {
  return CODE_EXTENSIONS.has(path.extname(fileName));
}

function resolveLayer(absolutePath: string): Layer | null {
  const relative = path.relative(SRC_ROOT, absolutePath);
  if (relative.startsWith('..')) {
    return null;
  }
  const segments = relative.split(path.sep);
  if (segments[0] === 'test') {
    return null;
  }
  if (segments.length === 1) {
    return 'app';
  }
  const candidate = segments[0];
  return candidate !== undefined && (LAYERS as readonly string[]).includes(candidate)
    ? (candidate as Layer)
    : null;
}

function collectSourceFiles(directory: string): SourceFile[] {
  const entries = readdirSync(directory, { recursive: true, encoding: 'utf8' });
  const files: SourceFile[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry);
    if (!isCodeFile(entry)) {
      continue;
    }
    const layer = resolveLayer(absolutePath);
    if (layer === null) {
      continue;
    }
    files.push({
      relativePath: path.relative(SRC_ROOT, absolutePath).split(path.sep).join('/'),
      absolutePath,
      layer,
      contents: readFileSync(absolutePath, 'utf8'),
    });
  }

  return files;
}

function extractImportSpecifiers(contents: string): string[] {
  const specifiers: string[] = [];
  for (const match of contents.matchAll(IMPORT_PATTERN)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function packageNameOf(specifier: string): string {
  if (specifier.startsWith('node:')) {
    return 'node';
  }
  const segments = specifier.split('/');
  if (specifier.startsWith('@')) {
    return segments.length >= 2 && segments[0] !== undefined && segments[1] !== undefined
      ? `${segments[0]}/${segments[1]}`
      : specifier;
  }
  return segments[0] ?? specifier;
}

function isForbiddenPackage(layer: Layer, specifier: string): boolean {
  const packageName = packageNameOf(specifier);
  return FORBIDDEN_PACKAGES[layer].some(
    (forbidden) => packageName === forbidden || packageName.startsWith(`${forbidden}/`),
  );
}

function checkRelativeImport(file: SourceFile, specifier: string): Violation | null {
  if (ASSET_PATTERN.test(specifier)) {
    return null;
  }
  const targetPath = path.resolve(path.dirname(file.absolutePath), specifier);
  const targetSegments = path.relative(SRC_ROOT, targetPath).split(path.sep);

  if (targetSegments[0] === 'test') {
    return {
      file: file.relativePath,
      specifier,
      reason: 'código de producción importando desde src/test',
    };
  }

  const targetLayer = resolveLayer(targetPath);

  if (targetLayer === null) {
    return {
      file: file.relativePath,
      specifier,
      reason: 'el import relativo resuelve fuera de las capas conocidas de src/',
    };
  }
  if (!ALLOWED_TARGET_LAYERS[file.layer].includes(targetLayer)) {
    return {
      file: file.relativePath,
      specifier,
      reason: `la capa ${file.layer} no puede importar de la capa ${targetLayer}`,
    };
  }
  return null;
}

function checkFile(file: SourceFile): Violation[] {
  const violations: Violation[] = [];

  for (const specifier of extractImportSpecifiers(file.contents)) {
    if (specifier.startsWith('.')) {
      const violation = checkRelativeImport(file, specifier);
      if (violation !== null) {
        violations.push(violation);
      }
      continue;
    }
    if (isForbiddenPackage(file.layer, specifier)) {
      violations.push({
        file: file.relativePath,
        specifier,
        reason: `la capa ${file.layer} no puede depender del paquete ${packageNameOf(specifier)}`,
      });
    }
  }

  if (BROWSER_API_LAYERS.includes(file.layer) && BROWSER_API_PATTERN.test(file.contents)) {
    violations.push({
      file: file.relativePath,
      specifier: '(browser API)',
      reason: `la capa ${file.layer} no puede acceder a APIs del navegador (window/document/navigator/storage)`,
    });
  }

  return violations;
}

describe('architecture layer boundaries', () => {
  const sourceFiles = collectSourceFiles(SRC_ROOT);

  it('scans production sources across all layers', () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
    for (const layer of LAYERS) {
      expect(sourceFiles.some((file) => file.layer === layer)).toBe(true);
    }
  });

  it('keeps cross-layer imports inside the allowed dependency graph', () => {
    const violations = sourceFiles.flatMap((file) =>
      checkFile(file).filter((violation) => violation.specifier.startsWith('.')),
    );
    expect(violations).toEqual([]);
  });

  it('keeps forbidden packages out of restricted layers', () => {
    const violations = sourceFiles.flatMap((file) =>
      checkFile(file).filter(
        (violation) =>
          !violation.specifier.startsWith('.') && violation.specifier !== '(browser API)',
      ),
    );
    expect(violations).toEqual([]);
  });

  it('keeps browser APIs out of domain, application and shared', () => {
    const violations = sourceFiles.flatMap((file) =>
      checkFile(file).filter((violation) => violation.specifier === '(browser API)'),
    );
    expect(violations).toEqual([]);
  });
});
