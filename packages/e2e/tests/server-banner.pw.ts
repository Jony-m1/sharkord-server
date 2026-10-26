import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, test } from './fixtures';
import { withClients } from './helpers/clients';

// the smallest valid png, one transparent pixel
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

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

test('a banner set in server settings shows at the top of everyone’s channel list', async ({
  browser
}) => {
  await withClients(
    browser,
    ['testowner', 'usere'],
    async ([owner, member]) => {
      await expect(member!.getByTestId(TestId.SERVER_BANNER)).toHaveCount(0);

      await openServerSettings(owner!);

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

      // taken off again so the rest of the suite sees the seeded server; with no logo set, the
      // banner's is the only image there is to remove
      await owner!.getByRole('button', { name: 'Remove image' }).click();
      await saveSettings(owner!);

      await expect(member!.getByTestId(TestId.SERVER_BANNER)).toHaveCount(0);
    }
  );
});
