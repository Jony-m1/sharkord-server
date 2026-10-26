import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { withClients } from './helpers/clients';
import { boxOf } from './helpers/layout';

// the smallest valid png, one transparent pixel
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const HEADER_ROW_HEIGHT = 48;

const openServerSettings = async (page: Page) => {
  await page.getByTestId(TestId.SERVER_MENU_TRIGGER).click();
  await page.getByTestId(TestId.SERVER_MENU_SERVER_SETTINGS).click();
};

// general settings has the logo picker first and the banner picker second
const bannerPicker = (page: Page) =>
  page.locator('#portal .group.cursor-pointer').nth(1);

const saveSettings = async (page: Page) => {
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeHidden();
};

const headerHeight = async (page: Page) => {
  const { height } = await boxOf(page.getByTestId(TestId.SERVER_HEADER));

  return height;
};

// the name and the menu share one centre line in the header's top 48px row, banner or not, so
// they also line up with the 48px channel header next to them
const expectNameAndMenuAligned = async (page: Page) => {
  const header = await boxOf(page.getByTestId(TestId.SERVER_HEADER));
  const name = await boxOf(page.getByTestId(TestId.LEFT_SIDEBAR_SERVER_NAME));
  const trigger = await boxOf(page.getByTestId(TestId.SERVER_MENU_TRIGGER));
  const nameCentre = name.y + name.height / 2;
  const triggerCentre = trigger.y + trigger.height / 2;

  expect(Math.abs(nameCentre - triggerCentre)).toBeLessThanOrEqual(2);

  for (const box of [name, trigger]) {
    expect(box.y).toBeGreaterThanOrEqual(header.y);
    expect(box.y + box.height).toBeLessThanOrEqual(
      header.y + HEADER_ROW_HEIGHT
    );
  }
};

test('a banner set in server settings shows at the top of everyone’s channel list', async ({
  browser
}) => {
  await withClients(
    browser,
    ['testowner', 'usere'],
    async ([owner, member]) => {
      await expect(member!.getByTestId(TestId.SERVER_BANNER)).toHaveCount(0);
      await expectNameAndMenuAligned(member!);

      // the owner's channel list follows the published settings too, so it tells the cleanup
      // below whether the save went through
      const ownerBanner = owner!.getByTestId(TestId.SERVER_BANNER);

      await openServerSettings(owner!);

      try {
        const chooser = owner!.waitForEvent('filechooser');

        await bannerPicker(owner!).click();
        await (
          await chooser
        ).setFiles({
          name: 'banner.png',
          mimeType: 'image/png',
          buffer: PIXEL_PNG
        });

        await saveSettings(owner!);

        // the member's page was open all along: it arrives with the published settings
        const banner = member!.getByTestId(TestId.SERVER_BANNER);

        await expect(banner).toBeVisible();
        await expect(banner).toHaveAttribute('src', /\/public\//);
        // a broken image is still a visible element, so check the picture itself arrived
        await expect
          .poll(() =>
            banner.evaluate(
              (element) =>
                (element as unknown as { naturalWidth: number }).naturalWidth
            )
          )
          .toBeGreaterThan(0);
        await expect(ownerBanner).toHaveCount(1);

        // the banner makes the header taller, but the name and the menu stay in its top row
        await expect
          .poll(() => headerHeight(member!))
          .toBeGreaterThan(HEADER_ROW_HEIGHT * 2);
        await expectNameAndMenuAligned(member!);
      } finally {
        // every spec shares this server, so the banner comes off even when a check above failed:
        // left on, each retry would stop at its first check and later specs would run with it.
        // with no logo set, the banner's is the only image there is to remove
        const bannersLeft = await ownerBanner.count();

        if (bannersLeft > 0) {
          await owner!.getByRole('button', { name: 'Remove image' }).click();
          await saveSettings(owner!);
        }
      }

      await expect(member!.getByTestId(TestId.SERVER_BANNER)).toHaveCount(0);
      await expect.poll(() => headerHeight(member!)).toBe(HEADER_ROW_HEIGHT);
      await expectNameAndMenuAligned(member!);
    }
  );
});

test('the server menu hangs from its chevron, which turns over while the menu is open', async ({
  page
}) => {
  await loginAs(page, 'testuser', 'password123');

  const trigger = page.getByTestId(TestId.SERVER_MENU_TRIGGER);
  const chevron = trigger.locator('svg');
  const menu = page.getByRole('menu');

  await expect(chevron).toHaveCSS('rotate', 'none');

  await trigger.click();

  await expect(menu).toBeVisible();
  await expect(chevron).toHaveCSS('rotate', '180deg');

  // the trigger sits at the sidebar's right edge, so the menu lines up with that edge instead
  // of centring on the button; polled because the menu zooms in as it opens
  const rightEdgeGap = async () => {
    const [menuBox, triggerBox] = await Promise.all([
      boxOf(menu),
      boxOf(trigger)
    ]);

    return Math.abs(
      menuBox.x + menuBox.width - (triggerBox.x + triggerBox.width)
    );
  };

  await expect.poll(rightEdgeGap).toBeLessThanOrEqual(1);

  await page.keyboard.press('Escape');

  await expect(menu).toBeHidden();
  await expect(chevron).toHaveCSS('rotate', 'none');
});
