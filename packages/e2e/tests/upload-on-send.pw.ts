import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { LIVE_MESSAGES_CHANNEL, openChannel } from './helpers/channels';
import { messageByText, sendMessage } from './helpers/messages';

const RUN_ID = Date.now().toString().slice(-8);

const attachFile = async (page: Page, name: string) => {
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name,
      mimeType: 'text/plain',
      buffer: Buffer.from(`contents of ${name}`)
    });
};

// every upload request the page makes, to tell when one starts
const trackUploads = (page: Page) => {
  const uploads: string[] = [];

  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/upload') {
      uploads.push(request.url());
    }
  });

  return uploads;
};

test('a file waits in the box until the message is sent', async ({ page }) => {
  const fileName = `notes-${RUN_ID}.txt`;
  const content = `with a file ${RUN_ID}`;
  const uploads = trackUploads(page);

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  await attachFile(page, fileName);
  await expect(page.getByText(fileName)).toBeVisible();

  // a file dropped by mistake costs nothing until enter
  await page.waitForTimeout(500);
  expect(uploads).toHaveLength(0);

  await sendMessage(page, content);

  const message = messageByText(page, content);

  await expect(message).toContainText(fileName);
  expect(uploads).toHaveLength(1);
  await expect(page.getByTestId(TestId.PENDING_UPLOAD)).toHaveCount(0);
});

test('a cancelled upload sends nothing', async ({ page }) => {
  const fileName = `cancelled-${RUN_ID}.txt`;
  const content = `never sent ${RUN_ID}`;

  // held back long enough to be cancelled while it is still going
  await page.route('**/upload', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue().catch(() => {
      // the page cancelled it meanwhile
    });
  });

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  await attachFile(page, fileName);

  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR).first();

  await editor.click();
  await editor.pressSequentially(content);
  await editor.press('Enter');

  // the box is free again at once, with the upload showing beside it
  await expect(editor).not.toContainText(content);

  const pending = page.getByTestId(TestId.PENDING_UPLOAD);

  await expect(pending).toContainText(fileName);

  await page.getByTestId(TestId.PENDING_UPLOAD_CANCEL).click();
  await expect(pending).toHaveCount(0);

  // past the point the held upload would have finished
  await page.waitForTimeout(5000);
  await expect(messageByText(page, content)).toHaveCount(0);
});
