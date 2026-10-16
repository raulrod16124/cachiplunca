import { expect, test } from '@playwright/test';
import { loginUser, logout, registerUser, uniqueEmail } from './helpers/auth';

test.describe('Authentication', () => {
  test('register creates a session and lands on the workspaces list', async ({ page }) => {
    await registerUser(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create workspace' })).toBeVisible();
  });

  test('logout ends the session and login restores it', async ({ page }) => {
    const email = await registerUser(page);
    await logout(page);

    await loginUser(page, email);
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByText(`${email} is ready to plan.`)).toBeVisible();
  });

  test('login with a wrong password shows an error and keeps the form usable', async ({ page }) => {
    const email = uniqueEmail('login-negative');
    await registerUser(page, email);
    await logout(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('WrongPassword1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('visiting the workspaces list while signed out redirects to login', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible({
      timeout: 20000,
    });
    expect(page.url()).toContain('/login');
  });
});
