import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import {
  categoryItem,
  createCategoryWithChannel,
  deleteCategory
} from './helpers/categories';
import { openChannel } from './helpers/channels';
import { dmItem, openDmPanel } from './helpers/dms';

// channel names cap at 27 characters, so the run marker is short enough to fit inside one
const RUN_ID = Date.now().toString().slice(-8);

const PHONE = { width: 390, height: 844 };

// on a phone the channel list and the open conversation are two screens, as on Discord
test.use({ viewport: PHONE, hasTouch: true });

// the list fills the screen at 0 and slides off to the left while something is open; it
// animates, so the checks poll until it settles
const listLeft = async (page: Page) => {
  const box = await page.getByTestId(TestId.LEFT_SIDEBAR).boundingBox();

  return box ? Math.round(box.x) : undefined;
};

const listWidth = async (page: Page) => {
  const box = await page.getByTestId(TestId.LEFT_SIDEBAR).boundingBox();

  return box ? Math.round(box.width) : undefined;
};

// playwright's touchscreen only taps, so the swipe is dispatched the way a finger makes it,
// left to right across the conversation
const swipeRight = async (page: Page) => {
  const main = page.locator('main');
  const start = [{ identifier: 0, clientX: 20, clientY: 400 }];
  const end = [{ identifier: 0, clientX: PHONE.width - 40, clientY: 400 }];

  await main.dispatchEvent('touchstart', {
    touches: start,
    changedTouches: start,
    targetTouches: start
  });
  await main.dispatchEvent('touchmove', {
    touches: end,
    changedTouches: end,
    targetTouches: end
  });
  await main.dispatchEvent('touchend', {
    touches: [],
    changedTouches: end,
    targetTouches: []
  });
};

test('the channel list is the first screen and fills it', async ({ page }) => {
  await loginAs(page, 'testuser', 'password123');

  await expect.poll(() => listLeft(page)).toBe(0);
  await expect.poll(() => listWidth(page)).toBe(PHONE.width);
});

// the list is a full screen layer of its own, and the settings used to open underneath it
test('user settings open over the channel list', async ({ page }) => {
  await loginAs(page, 'testuser', 'password123');

  await page.getByTestId(TestId.USER_SETTINGS_TRIGGER).click();

  const settings = page.locator('#portal');

  await expect(settings).toBeVisible();

  // a click checks nothing else sits over its target, so this fails if the list covers it
  await settings.getByRole('button').first().click();
  await expect(settings).toBeHidden();
});

test('a channel opens over the list and back returns to it', async ({
  page
}) => {
  await loginAs(page, 'testuser', 'password123');

  await openChannel(page, 'General');
  await expect.poll(() => listLeft(page)).toBe(-PHONE.width);

  await page.getByTestId(TestId.MOBILE_BACK_BUTTON).click();
  await expect.poll(() => listLeft(page)).toBe(0);

  // going back closes the channel, so the same row opens it again
  await openChannel(page, 'General');
  await expect.poll(() => listLeft(page)).toBe(-PHONE.width);
});

test('swiping right goes back to the list', async ({ page }) => {
  await loginAs(page, 'testuser', 'password123');

  await openChannel(page, 'General');
  await expect.poll(() => listLeft(page)).toBe(-PHONE.width);

  await swipeRight(page);
  await expect.poll(() => listLeft(page)).toBe(0);
});

test('back from a direct message returns to the DM list', async ({ page }) => {
  await loginAs(page, 'usera', 'password123');

  await openDmPanel(page);
  await dmItem(page, 'User B').click();
  await expect(page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();
  await expect.poll(() => listLeft(page)).toBe(-PHONE.width);

  await page.getByTestId(TestId.MOBILE_BACK_BUTTON).click();
  await expect.poll(() => listLeft(page)).toBe(0);
  await expect(dmItem(page, 'User B')).toBeVisible();
});

// with "join the last channel" on, the client used to select it again whenever the channels
// changed, which on a phone pulled you back out of the list a moment after you had left it
test('a channel added elsewhere does not pull a phone back into the last channel', async ({
  browser
}) => {
  const category = `Phone Category ${RUN_ID}`;
  const channel = `phone-channel-${RUN_ID}`;
  const phoneContext = await browser.newContext({
    viewport: PHONE,
    hasTouch: true
  });
  const ownerContext = await browser.newContext();

  try {
    const phone = await phoneContext.newPage();
    const owner = await ownerContext.newPage();

    await phone.addInitScript({
      content:
        "localStorage.setItem('sharkord-auto-join-last-channel', 'true');"
    });

    await loginAs(phone, 'testuser', 'password123');
    await loginAs(owner, 'testowner', 'password123');

    await openChannel(phone, 'General');
    await phone.getByTestId(TestId.MOBILE_BACK_BUTTON).click();
    await expect.poll(() => listLeft(phone)).toBe(0);

    await createCategoryWithChannel(owner, category, channel);
    await expect(phone.getByText(channel)).toBeVisible({ timeout: 15_000 });

    await expect.poll(() => listLeft(phone)).toBe(0);
    await expect(phone.getByTestId(TestId.MOBILE_BACK_BUTTON)).toBeHidden();

    await deleteCategory(owner, category);
    await expect(categoryItem(owner, category)).toHaveCount(0);
  } finally {
    await phoneContext.close().catch(() => {});
    await ownerContext.close().catch(() => {});
  }
});
