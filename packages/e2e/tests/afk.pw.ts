import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';

// clicking a voice channel joins its call
const joinCall = async (page: Page) => {
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'Voice' })
    .first()
    .click({ force: true });

  await expect(page.getByTestId(TestId.VOICE_STAGE)).toBeVisible();
  await expect(page.getByTestId(TestId.USER_CONTROL_DEAFEN)).toBeEnabled();
};

const isDeafened = (page: Page) =>
  page
    .getByTestId(TestId.USER_CONTROL_DEAFEN)
    .locator('svg.lucide-headphone-off')
    .count();

test('going AFK locks the headphones and coming back hands them back', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await joinCall(page);

  // deafened before going away, which coming back undoes too
  await page.getByTestId(TestId.USER_CONTROL_DEAFEN).click();
  await expect.poll(() => isDeafened(page)).toBe(1);

  await page.getByTestId(TestId.AFK_TOGGLE).click();
  await expect(page.getByTestId(TestId.AFK_TOGGLE)).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await expect(page.getByTestId(TestId.USER_CONTROL_DEAFEN)).toBeDisabled();
  await expect(page.getByTestId(TestId.USER_CONTROL_MIC)).toBeDisabled();

  // away shows on the call tile as the AFK badge alone (the call's own controls below it
  // still show the headphones, locked)
  const tile = page
    .getByTestId(TestId.VOICE_STAGE)
    .locator('[class*="group/voice-user-card"]')
    .first();

  await expect(tile.getByTestId(TestId.AFK_BADGE).first()).toBeVisible();
  await expect(tile.locator('svg.lucide-headphone-off')).toHaveCount(0);

  // nor does the voice list beside the channel repeat it
  await expect(
    page
      .getByTestId(TestId.LEFT_SIDEBAR)
      .getByTestId(TestId.AFK_BADGE)
      .locator('xpath=..')
      .locator('svg.lucide-headphone-off')
  ).toHaveCount(0);

  await page.getByTestId(TestId.AFK_TOGGLE).click();

  await expect(page.getByTestId(TestId.USER_CONTROL_DEAFEN)).toBeEnabled();
  await expect.poll(() => isDeafened(page)).toBe(0);
});

test('the settings screens show which version you are on', async ({ page }) => {
  // the Continental desktop app leaves its own version on the page
  await page.addInitScript(() => {
    (
      globalThis as unknown as { __continentalVersion: string }
    ).__continentalVersion = '9.9.9';
  });

  await loginAs(page, 'testowner', 'password123');
  await page.getByTestId(TestId.USER_SETTINGS_TRIGGER).click();

  const version = page.getByTestId(TestId.CLIENT_VERSION);

  await expect(version).toContainText(/Server \d+\.\d+\.\d+/);
  await expect(version).toContainText('Continental 9.9.9');
});
