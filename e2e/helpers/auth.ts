import { expect, type Page } from '@playwright/test';

let emailCounter = 0;

export function uniqueEmail(prefix = 'owner'): string {
  emailCounter += 1;
  return `${prefix}+${Date.now()}-${emailCounter}@example.com`;
}

export async function registerUser(
  page: Page,
  email = uniqueEmail(),
  password = 'Secret123',
): Promise<string> {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible({
    timeout: 30000,
  });
  return email;
}

export async function loginUser(page: Page, email: string, password = 'Secret123'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible({
    timeout: 30000,
  });
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible({
    timeout: 20000,
  });
}

interface EmulatorOobCode {
  readonly email?: string;
  readonly requestType?: string;
  readonly oobCode?: string;
}

function authEmulatorBaseUrl(): string {
  return `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`;
}

export async function verifyEmail(email: string): Promise<void> {
  const baseUrl = authEmulatorBaseUrl();
  const projectId = 'demo-cachiplunca';

  let oobCode: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetch(`${baseUrl}/emulator/v1/projects/${projectId}/oobCodes`);
        if (!response.ok) {
          return null;
        }
        const body = (await response.json()) as { oobCodes?: EmulatorOobCode[] };
        const match = body.oobCodes?.find(
          (code) =>
            code.email?.toLowerCase() === email.toLowerCase() &&
            code.requestType === 'VERIFY_EMAIL' &&
            code.oobCode !== undefined,
        );
        oobCode = match?.oobCode;
        return oobCode ?? null;
      },
      { timeout: 20000 },
    )
    .not.toBeNull();

  if (oobCode === undefined) {
    throw new Error(`No verification code found for ${email}`);
  }

  const response = await fetch(
    `${baseUrl}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oobCode }),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not verify ${email}: ${await response.text()}`);
  }
}
