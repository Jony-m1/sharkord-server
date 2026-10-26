import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { boxOf } from './helpers/layout';

// nothing here joins a call: every user that could is already put in one by another spec, and a
// second join of the same user is refused. the voice row and the voice moderation routes are
// covered by the selector tests and by voice.test.ts on the server

const PHONE = { width: 390, height: 844 };

const openOwnCard = async (page: Page, name: string) => {
  await page.getByTestId(TestId.USER_CONTROL).getByText(name).click();
  await expect(page.getByTestId(TestId.USER_POPOVER)).toBeVisible();
};

const openServerSettings = async (page: Page) => {
  await page.getByTestId(TestId.SERVER_MENU_TRIGGER).click();
  await page.getByTestId(TestId.SERVER_MENU_SERVER_SETTINGS).click();
};

const settingsEntry = (page: Page, label: string) =>
  page.getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY).filter({ hasText: label });

test.describe('your own card', () => {
  test('opens above your panel and leaves its buttons uncovered', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');
    await openOwnCard(page, 'Test Owner');

    const card = await boxOf(page.getByTestId(TestId.USER_POPOVER));

    // the card used to open to the right, straight over the afk, mic, deafen and settings buttons
    for (const testId of [TestId.AFK_TOGGLE, TestId.USER_SETTINGS_TRIGGER]) {
      const button = await boxOf(page.getByTestId(testId));

      expect(card.y + card.height).toBeLessThanOrEqual(button.y);
    }
  });

  test('offers editing your profile, and no moderation of yourself', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');
    await openOwnCard(page, 'Test Owner');

    const card = page.getByTestId(TestId.USER_POPOVER);

    await expect(card.getByText('Online', { exact: true })).toBeVisible();
    await expect(card.getByTestId(TestId.USER_POPOVER_MODERATE)).toHaveCount(0);
    await expect(card.getByTestId(TestId.USER_POPOVER_DM)).toHaveCount(0);

    await card.getByTestId(TestId.USER_POPOVER_EDIT_PROFILE).click();

    await expect(page.getByTestId(TestId.USER_POPOVER)).toBeHidden();
    await expect(settingsEntry(page, 'Profile')).toBeVisible();
  });
});

test("someone else's card offers a message, moderation and their totals", async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await page
    .getByTestId(TestId.MEMBER_ITEM)
    .filter({ hasText: 'Test User' })
    .click();

  const card = page.getByTestId(TestId.USER_POPOVER);

  await expect(card.getByTestId(TestId.USER_POPOVER_DM)).toHaveText('Message');
  await expect(card.getByTestId(TestId.USER_POPOVER_MODERATE)).toBeVisible();
  await expect(card.getByTestId(TestId.USER_POPOVER_MENU)).toBeVisible();

  // the totals of another member are readable by anyone signed in
  await expect(card.getByText('Time online')).toBeVisible();
  await expect(card.getByText('Time in calls')).toBeVisible();

  await card.getByTestId(TestId.USER_POPOVER_MENU).click();

  await expect(page.getByRole('menuitem', { name: 'Roles' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Kick' })).toBeVisible();
});

test('a member without moderation rights gets no moderation on a card', async ({
  page
}) => {
  await loginAs(page, 'testuser', 'password123');
  await page
    .getByTestId(TestId.MEMBER_ITEM)
    .filter({ hasText: 'Test Owner' })
    .click();

  const card = page.getByTestId(TestId.USER_POPOVER);

  await expect(card.getByTestId(TestId.USER_POPOVER_DM)).toBeVisible();
  await expect(card.getByText('Time online')).toBeVisible();
  await expect(card.getByTestId(TestId.USER_POPOVER_MODERATE)).toHaveCount(0);
  await expect(card.getByTestId(TestId.USER_POPOVER_MENU)).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test('the card slides up from the bottom and stays on screen', async ({
    page
  }) => {
    await loginAs(page, 'testuser', 'password123');
    await openOwnCard(page, 'Test User');

    const sheet = await boxOf(page.getByRole('dialog'));

    expect(sheet.x).toBeGreaterThanOrEqual(0);
    expect(sheet.y).toBeGreaterThanOrEqual(0);
    expect(sheet.x + sheet.width).toBeLessThanOrEqual(PHONE.width);

    // it opens with a slide, so its resting place is polled for
    await expect
      .poll(async () => {
        const { y, height } = await boxOf(page.getByRole('dialog'));

        return Math.round(y + height);
      })
      .toBe(PHONE.height);

    await page.keyboard.press('Escape');

    await expect(page.getByTestId(TestId.USER_POPOVER)).toBeHidden();
  });
});

test.describe('the users settings page', () => {
  test('filters, finds by role and opens the moderation view from a row', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');
    await openServerSettings(page);
    await settingsEntry(page, 'Users').click();

    const rows = page.getByTestId(TestId.USERS_TABLE_ROW);
    const ownerRow = rows.filter({ hasText: 'Test Owner' });

    await expect(ownerRow).toBeVisible();
    await expect(ownerRow).toContainText('Online');

    await page
      .getByTestId(TestId.USERS_FILTER)
      .and(page.locator('[data-filter="online"]'))
      .click();

    // whoever else is signed in at the moment, the one looking is, and nobody offline is left
    await expect(ownerRow).toBeVisible();
    await expect(rows.filter({ hasText: 'Offline' })).toHaveCount(0);

    await page
      .getByTestId(TestId.USERS_FILTER)
      .and(page.locator('[data-filter="all"]'))
      .click();
    await page
      .getByPlaceholder('Search users by name or role...')
      .fill('moderator');

    await expect(rows.filter({ hasText: 'Test Moderator' })).toBeVisible();
    await expect(ownerRow).toHaveCount(0);

    await rows.filter({ hasText: 'Test Moderator' }).click();

    await expect(page.getByTestId(TestId.MOD_VIEW_KICK)).toBeVisible();

    // escape belongs to the sheet on top, the settings stay open under it
    await page.keyboard.press('Escape');

    await expect(page.getByTestId(TestId.MOD_VIEW_KICK)).toBeHidden();
    await expect(rows.filter({ hasText: 'Test Moderator' })).toBeVisible();
  });

  test('the save bar can throw an edit away', async ({ page }) => {
    await loginAs(page, 'testowner', 'password123');
    await openServerSettings(page);

    const nameInput = page.getByPlaceholder('Enter server name');

    await expect(nameInput).not.toHaveValue('');

    const savedName = await nameInput.inputValue();

    await nameInput.fill(`${savedName} draft`);
    await page.getByTestId(TestId.SETTINGS_SAVE_BAR_RESET).click();

    await expect(nameInput).toHaveValue(savedName);
    await expect(page.getByTestId(TestId.SETTINGS_SAVE_BAR_RESET)).toBeHidden();
  });
});
