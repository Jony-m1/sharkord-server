import type { Locator, Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { startDmWith } from './helpers/dms';
import { messageByText, sendMessage } from './helpers/messages';

const RUN_ID = Date.now().toString().slice(-8);

const pinMessage = async (scope: Page | Locator, content: string) => {
  const message = messageByText(scope, content);

  await message.hover();
  await message.getByTestId(TestId.MESSAGE_PIN).click();
};

const openPinnedMessages = async (page: Page) => {
  await page.getByTestId(TestId.PINNED_MESSAGES_BUTTON).click();
};

// clicking a voice channel joins its call
const joinCall = async (page: Page, name: string) => {
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: name })
    .first()
    .click({ force: true });

  await expect(page.getByTestId(TestId.VOICE_CHAT_TOGGLE)).toBeVisible();
};

test('a message pinned in a direct message is listed in its pinned messages', async ({
  page
}) => {
  const content = `dm pin ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await startDmWith(page, 'Test User');
  await sendMessage(page, content);
  await pinMessage(page, content);

  await openPinnedMessages(page);

  await expect(page.getByTestId(TestId.PINNED_MESSAGE)).toContainText(content);
});

test('a call’s chat follows you to the next call and keeps its buttons in the top bar', async ({
  page
}) => {
  const content = `in the call ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await joinCall(page, 'Voice');

  const chat = page.getByTestId(TestId.VOICE_CHAT);

  // the chat starts open under the call on a wide screen, so there is nothing to toggle
  await expect(chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();

  await sendMessage(chat, content);

  // the chat has no header of its own: the topic and the pins are in the top bar
  await expect(page.getByTestId(TestId.VOICE_CHAT_TOPIC)).toHaveText(
    'General voice channel'
  );
  await expect(chat.getByTestId(TestId.PINNED_MESSAGES_BUTTON)).toHaveCount(0);

  await pinMessage(chat, content);
  await openPinnedMessages(page);
  await expect(page.getByTestId(TestId.PINNED_MESSAGE)).toContainText(content);
  await page.keyboard.press('Escape');

  // the chat that stayed on the previous call is the bug this guards
  await joinCall(page, 'Private Voice');

  await expect(chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();
  await expect(messageByText(chat, content)).toHaveCount(0);
  await expect(page.getByTestId(TestId.VOICE_CHAT_TOPIC)).toHaveCount(0);

  await joinCall(page, 'Voice');

  await expect(messageByText(chat, content)).toHaveCount(1);
});
