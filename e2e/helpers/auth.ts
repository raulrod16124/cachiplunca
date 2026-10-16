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
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible({
    timeout: 30000,
  });
  return email;
}

export async function loginUser(page: Page, email: string, password = 'Secret123'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible({
    timeout: 30000,
  });
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible({
    timeout: 20000,
  });
}
