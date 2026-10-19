let publicBasePath = '/';

export function setPublicBasePath(base: string): void {
  publicBasePath = base.endsWith('/') ? base.slice(0, -1) : base;
  if (publicBasePath === '') publicBasePath = '/';
}

export function getPublicBasePath(): string {
  return publicBasePath;
}
