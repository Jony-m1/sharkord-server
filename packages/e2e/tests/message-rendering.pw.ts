import type { Locator, Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { LIVE_MESSAGES_CHANNEL, openChannel } from './helpers/channels';
import { confirmDialog } from './helpers/dialogs';
import { messageByText, sendMessage } from './helpers/messages';

// how a message shows what it carries, and the small editing behaviours around it: a picture
// is not repeated as a card unless the browser cannot show it, a youtube link is a picture
// until clicked, an edit starts at the end of the text and a shift click picks several emojis
// without closing the picker

const RUN_ID = Date.now().toString().slice(-8);

// a single red pixel, enough for the browser to show it as a picture
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const attachFiles = async (
  page: Page,
  files: { name: string; mimeType: string; buffer: Buffer }[]
) => {
  await page.locator('input[type=file]').first().setInputFiles(files);
};

// the attachment pictures are the only images in a message that ask for cors
const messagePictures = (message: Locator) =>
  message.locator('img[crossorigin]');

const emojiPicker = (page: Page) => page.getByTestId(TestId.EMOJI_PICKER);

// a button's title is the emoji's first shortcode, which for 🎉 is :party: rather than the
// :tada: searched for, so the button is found by the emoji it shows
const pickEmoji = async (
  page: Page,
  shortcode: string,
  emoji: string,
  withShift: boolean
) => {
  const picker = emojiPicker(page);

  await picker.locator('input').fill(shortcode);
  await picker
    .getByRole('button', { name: emoji, exact: true })
    .click({ modifiers: withShift ? ['Shift'] : [] });
};

test('a picture shows without a card of its own while other files keep theirs', async ({
  page
}) => {
  const pictureName = `picture-${RUN_ID}.png`;
  const archiveName = `archive-${RUN_ID}.zip`;
  const content = `a picture and an archive ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  await attachFiles(page, [
    { name: pictureName, mimeType: 'image/png', buffer: PIXEL_PNG },
    {
      name: archiveName,
      mimeType: 'application/zip',
      buffer: Buffer.from(`contents of ${archiveName}`)
    }
  ]);
  await sendMessage(page, content);

  const message = messageByText(page, content);

  await expect(messagePictures(message)).toHaveCount(1);
  await expect(message).toContainText(archiveName);
  await expect(message).not.toContainText(pictureName);
  await expect(message.getByText('Open in new tab')).toHaveCount(0);

  // the owner removes the picture from the picture itself, the card it no longer has
  await messagePictures(message).hover();
  await message.getByTestId(TestId.MESSAGE_MEDIA_REMOVE).click();
  await confirmDialog(page);

  await expect(messagePictures(message)).toHaveCount(0);
  await expect(message).toContainText(archiveName);
});

test('a picture or a video the browser cannot show keeps its card', async ({
  page
}) => {
  const scanName = `scan-${RUN_ID}.tif`;
  const recordingName = `recording-${RUN_ID}.avi`;
  const content = `a scan and a recording ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  // neither file is what its name says, so the browser can decode neither, the way chrome
  // cannot decode a real tiff or play a real avi
  await attachFiles(page, [
    {
      name: scanName,
      mimeType: 'image/tiff',
      buffer: Buffer.from(`not a picture ${RUN_ID}`)
    },
    {
      name: recordingName,
      mimeType: 'video/x-msvideo',
      buffer: Buffer.from(`not a video ${RUN_ID}`)
    }
  ]);
  await sendMessage(page, content);

  const message = messageByText(page, content);

  // the media gives way and its card is the way to the file again
  await expect(message).toContainText(scanName);
  await expect(message).toContainText(recordingName);
  await expect(messagePictures(message)).toHaveCount(0);
  await expect(message.locator('video')).toHaveCount(0);
});

test('a youtube link shows a picture and loads its player only when clicked', async ({
  page
}) => {
  const content = `watch https://www.youtube.com/watch?v=dQw4w9WgXcQ ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await sendMessage(page, content);

  const message = messageByText(page, content);
  const preview = message.getByLabel('Play video');

  await expect(preview).toBeVisible();
  await expect(message.locator('iframe')).toHaveCount(0);
  await expect(message.locator('youtube-video')).toHaveCount(0);

  await preview.click();

  await expect(preview).toHaveCount(0);
  await expect(message.locator('youtube-video')).toHaveCount(1);
});

test('editing a message puts the caret at the end of its text', async ({
  page
}) => {
  const content = `edit from the end ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await sendMessage(page, content);

  const message = messageByText(page, content);

  await message.hover();
  await message.getByRole('button', { name: 'Edit Message' }).click();

  const editor = message.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR);

  await expect(editor).toBeFocused();
  await page.keyboard.type(' and more');
  await page.keyboard.press('Enter');

  await expect(messageByText(page, `${content} and more`)).toHaveCount(1);
});

test('a shift click adds a reaction and keeps the picker open for the next', async ({
  page
}) => {
  const content = `react twice ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await sendMessage(page, content);

  const message = messageByText(page, content);

  await message.hover();
  await message.getByRole('button', { name: 'Add Reaction' }).click();
  await expect(emojiPicker(page)).toBeVisible();

  await pickEmoji(page, 'tada', '🎉', true);

  await expect(message).toContainText('🎉');
  await expect(emojiPicker(page)).toBeVisible();

  // a plain click picks the last one and closes the picker as before
  await pickEmoji(page, 'rocket', '🚀', false);

  await expect(message).toContainText('🚀');
  await expect(emojiPicker(page)).toHaveCount(0);
});

test('a shift click keeps the message box picker open and enter still sends', async ({
  page
}) => {
  const content = `emojis on the way ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR).first();

  await editor.click();
  await editor.pressSequentially(`${content} `);

  // the message box's emoji button is the only visible one: the ones on messages sit in
  // toolbars that are hidden until a message is hovered
  await page.locator('button:visible:has(svg.lucide-smile)').last().click();
  await expect(emojiPicker(page)).toBeVisible();

  await pickEmoji(page, 'tada', '🎉', true);
  await pickEmoji(page, 'rocket', '🚀', true);

  await expect(emojiPicker(page)).toBeVisible();
  await expect(editor).toContainText('🎉');
  await expect(editor).toContainText('🚀');

  // the emoji went into the message box, which took the focus, so enter is meant for it
  await expect(editor).toBeFocused();
  await page.keyboard.press('Enter');

  const message = messageByText(page, content);

  await expect(message).toHaveCount(1);
  await expect(message).toContainText('🎉');
  await expect(message).toContainText('🚀');
});
