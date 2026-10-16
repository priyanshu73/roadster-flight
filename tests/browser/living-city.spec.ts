import { test, expect, type Page } from '@playwright/test';
type Snapshot = {
  state: string;
  district: string;
  pedestrians: number;
  traffic: number;
  props: number;
  activeCops: number;
  brokenProps: number;
  perched: boolean;
  canvasCount: number;
  geometries: number;
  calls: number;
  cameraMode: string;
  roads: number;
  buildings: number;
  heat: { chase: boolean; over: boolean; clock: number; level: number; best: number };
  audio: { state: string; muted: boolean; localVoices: number };
  dialogue: { speaker: string; text: string };
};
type TestBridge = {
  snapshot(): Snapshot;
  advance(seconds: number, actions?: { forward?: boolean; boost?: boolean }): void;
};
const snapshot = (page: Page) =>
  page.evaluate(() => (window as unknown as { __roadster: TestBridge }).__roadster.snapshot());
const advance = (page: Page, seconds: number, actions = {}) =>
  page.evaluate(
    ({ seconds, actions }) =>
      (window as unknown as { __roadster: TestBridge }).__roadster.advance(seconds, actions),
    { seconds, actions },
  );
async function start(page: Page) {
  await page.goto('./?debug=1&test=1');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await page.locator('#start').click();
}

test('living harbor includes actors, local audio fallback, dialogue, mute, courier and overview', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await expect.poll(async () => (await snapshot(page)).audio.state).toBe('running');
  expect(await snapshot(page)).toMatchObject({
    district: 'new-york-harbor',
    pedestrians: 96,
    traffic: 32,
    props: 80,
  });
  await page.keyboard.press('e');
  await expect(page.locator('#dialogue')).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).dialogue.speaker).not.toBe('HARBOR RADIO');
  await page.keyboard.press('h');
  await page.keyboard.press('m');
  await expect.poll(async () => (await snapshot(page)).audio.muted).toBe(true);
  await page.keyboard.press('m');
  await expect.poll(async () => (await snapshot(page)).audio.muted).toBe(false);
  await page.screenshot({ path: 'artifacts/living-street.png' });
  await advance(page, 10.5);
  await expect.poll(async () => (await snapshot(page)).perched).toBe(true);
  await page.screenshot({ path: 'artifacts/living-courier.png' });
  await page.keyboard.press('c');
  await page.keyboard.press('c');
  await expect.poll(async () => (await snapshot(page)).cameraMode).toBe('overview');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/living-overview.png' });
  expect((await snapshot(page)).calls).toBeLessThan(250);
  expect(errors).toEqual([]);
});

test('actual prop crash starts pursuit, cops capture, best saves and Enter/R restart cleanly', async ({
  page,
}) => {
  await start(page);
  await advance(page, 2.5, { forward: true, boost: true });
  expect((await snapshot(page)).heat.chase).toBe(true);
  expect((await snapshot(page)).brokenProps).toBeGreaterThan(0);
  await advance(page, 90);
  await expect(page.locator('#caught')).toBeVisible();
  const caught = await snapshot(page);
  expect(caught.state).toBe('caught');
  expect(caught.heat.best).toBeGreaterThan(0);
  expect(Number(await page.evaluate(() => localStorage.getItem('heatclock.best')))).toBe(
    caught.heat.best,
  );
  await page.screenshot({ path: 'artifacts/living-caught.png' });
  await page.keyboard.press('Enter');
  await expect(page.locator('#caught')).toBeHidden();
  let restarted = await snapshot(page);
  expect(restarted.heat.chase).toBe(false);
  expect(restarted.heat.best).toBe(caught.heat.best);
  expect(restarted.activeCops).toBe(0);
  expect(restarted.brokenProps).toBe(0);
  await advance(page, 2.5, { forward: true, boost: true });
  expect((await snapshot(page)).heat.chase).toBe(true);
  await page.keyboard.press('r');
  await expect.poll(async () => (await snapshot(page)).heat.chase).toBe(false);
  restarted = await snapshot(page);
  expect(restarted.brokenProps).toBe(0);
  expect(restarted.heat.best).toBe(caught.heat.best);
});

test('district switch preserves real Midtown and releases old city resources', async ({ page }) => {
  await page.goto('./?debug=1');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  const original = await snapshot(page);
  await page.selectOption('#district-select', 'midtown');
  await expect.poll(async () => (await snapshot(page)).district).toBe('new-york-midtown');
  await expect(page.locator('#start')).toBeEnabled();
  expect((await snapshot(page)).roads).toBe(230);
  expect((await snapshot(page)).buildings).toBe(1160);
  await page.selectOption('#district-select', 'harbor');
  await expect.poll(async () => (await snapshot(page)).district).toBe('new-york-harbor');
  await expect(page.locator('#start')).toBeEnabled();
  const back = await snapshot(page);
  expect(back.canvasCount).toBe(1);
  expect(back.geometries).toBeLessThanOrEqual(original.geometries + 3);
});
