import type { Page, Route } from '@playwright/test';

const FIRESTORE_REQUEST =
  /127\.0\.0\.1:8080|google\.firestore\.v1\.Firestore|firestore\.googleapis\.com/;

/**
 * Delays Firestore traffic so loading states stay observable without relying on
 * `waitForTimeout` inside assertions. Returns a function that removes the route.
 */
export async function delayFirestore(page: Page, ms = 1500): Promise<() => Promise<void>> {
  const handler = async (route: Route): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  };

  await page.route(FIRESTORE_REQUEST, handler);

  return async () => {
    await page.unroute(FIRESTORE_REQUEST, handler);
  };
}
