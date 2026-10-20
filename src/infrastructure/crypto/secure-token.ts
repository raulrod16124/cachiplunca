const TOKEN_BYTES = 32;

export interface IssuedSecureToken {
  readonly token: string;
  readonly tokenHash: string;
}

export type IssueSecureToken = () => Promise<IssuedSecureToken>;

export function createSecureTokenIssuer(): IssueSecureToken {
  return async (): Promise<IssuedSecureToken> => {
    const bytes = new Uint8Array(TOKEN_BYTES);
    crypto.getRandomValues(bytes);
    const token = toBase64Url(bytes);
    const tokenHash = await hashSecureToken(token);
    return { token, tokenHash };
  };
}

export async function hashSecureToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}
