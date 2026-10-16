import { expect, test, type Page } from '@playwright/test';

type Snapshot = {
  state: string;
  position: number[];
  speed: number;
  pressure: number;
  grounded: boolean;
  elapsed: number;
  bodies: number;
  colliders: number;
  canvasCount: number;
  geometries: number;
  frameMs: number;
  heading: number;
  steering: number;
  input: { left: boolean; right: boolean; forward: boolean } | null;
};
const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() =>
    (window as unknown as { __roadster: { snapshot(): Snapshot } }).__roadster.snapshot(),
  );

test('loads real city data at the Pages prefix, drives, hops and pauses safely', async ({
  page,
}) => {
  const errors: string[] = [],
    failed: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1'))
      failed.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('./?debug=1');
  await expect(page.getByRole('button', { name: 'Drive New York' })).toBeEnabled({
    timeout: 30000,
  });
  await expect(page.locator('[data-city="tokyo"]')).toBeDisabled();
  await page.screenshot({ path: 'artifacts/menu.png' });
  const menu = await snapshot(page);
  expect(menu.canvasCount).toBe(1);
  await page.getByRole('button', { name: 'Drive New York' }).click();
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
  const start = await snapshot(page);
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await snapshot(page)).speed).toBeGreaterThan(5);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await snapshot(page)).pressure).toBeLessThan(95);
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyW');
  const driving = await snapshot(page);
  expect(
    Math.hypot(driving.position[0] - start.position[0], driving.position[2] - start.position[2]),
  ).toBeGreaterThan(2);
  await page.keyboard.press('Shift');
  await expect.poll(async () => (await snapshot(page)).position[1]).toBeGreaterThan(1.5);
  await page.screenshot({ path: 'artifacts/driving.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  const paused = await snapshot(page);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).elapsed).toBe(paused.elapsed);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Reset to 6th Avenue' }).click();
  await expect.poll(async () => (await snapshot(page)).speed).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Back to destinations' }).click();
  await expect(page.getByRole('button', { name: 'Drive New York' })).toBeVisible();
  await page.getByRole('button', { name: 'Drive New York' }).click();
  const restarted = await snapshot(page);
  expect(restarted.canvasCount).toBe(1);
  expect(restarted.bodies).toBe(menu.bodies);
  expect(restarted.colliders).toBe(menu.colliders);
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

for (const side of ['left', 'right'] as const) {
  test(`real keyboard ${side} changes chassis heading on Midtown streets`, async ({ page }) => {
    await page.goto('./?debug=1');
    await expect(page.getByRole('button', { name: 'Drive New York' })).toBeEnabled({
      timeout: 30000,
    });
    await page.getByRole('button', { name: 'Drive New York' }).click();
    await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
    const initial = await snapshot(page);
    await page.keyboard.down('w');
    await expect.poll(async () => (await snapshot(page)).speed).toBeGreaterThan(4);
    await page.keyboard.down(side === 'left' ? 'a' : 'd');
    await expect
      .poll(async () => {
        const s = await snapshot(page);
        const delta = Math.atan2(
          Math.sin(s.heading - initial.heading),
          Math.cos(s.heading - initial.heading),
        );
        return (delta * (side === 'left' ? 1 : -1) * 180) / Math.PI;
      })
      .toBeGreaterThan(12);
    const turning = await snapshot(page);
    expect(turning.input?.[side]).toBe(true);
    expect(turning.steering * (side === 'left' ? 1 : -1)).toBeGreaterThan(0.1);
    await page.keyboard.up(side === 'left' ? 'a' : 'd');
    await page.keyboard.up('w');
    await expect.poll(async () => Math.abs((await snapshot(page)).steering)).toBeLessThan(0.02);
  });
}

test('city download failure offers retry and never enables an empty world', async ({ page }) => {
  await page.route('**/district.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.goto('./?debug=1');
  await expect(page.getByRole('button', { name: 'Retry loading' })).toBeVisible();
  await expect(page.locator('#start')).toBeDisabled();
  await page.unroute('**/district.json');
  await page.getByRole('button', { name: 'Retry loading' }).click();
  await expect(page.getByRole('button', { name: 'Drive New York' })).toBeEnabled({
    timeout: 30000,
  });
  expect((await snapshot(page)).canvasCount).toBe(1);
});
