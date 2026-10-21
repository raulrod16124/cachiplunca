import { expect, test } from '@playwright/test';
import { loginUser, logout, registerUser, uniqueEmail } from './helpers/auth';

test.describe('Authentication', () => {
  test('register creates a session and lands on the workspaces list', async ({ page }) => {
    await registerUser(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create workspace' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Workspaces' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveCount(0);
  });

  test('logout ends the session and login restores it', async ({ page }) => {
    const email = await registerUser(page);
    await logout(page);

    await loginUser(page, email);
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
  });

  test('login with a wrong password shows an error and keeps the form usable', async ({ page }) => {
    const email = uniqueEmail('login-negative');
    await registerUser(page, email);
    await logout(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('remember me controls whether a new tab restores the session', async ({ page, context }) => {
    const email = await registerUser(page);
    await logout(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Secret123');
    const remember = page.getByRole('checkbox', { name: 'Remember me' });
    await expect(remember).toBeChecked();
    await remember.uncheck();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible({
      timeout: 30000,
    });

    const sessionTab = await context.newPage();
    await sessionTab.goto('/workspaces');
    await expect(sessionTab.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible({
      timeout: 20000,
    });
    await sessionTab.close();

    await logout(page);
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Secret123');
    await expect(page.getByRole('checkbox', { name: 'Remember me' })).toBeChecked();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible({
      timeout: 30000,
    });

    const localTab = await context.newPage();
    await localTab.goto('/workspaces');
    await expect(localTab.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible({
      timeout: 30000,
    });
    await localTab.close();
  });

  test('visiting the workspaces list while signed out redirects to login', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible({
      timeout: 20000,
    });
    expect(page.url()).toContain('/login');
  });
});
