import type { Browser, Locator, Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { LIVE_MESSAGES_CHANNEL, openChannel } from './helpers/channels';
import { confirmDialog } from './helpers/dialogs';
import { messageByText, sendMessage } from './helpers/messages';

const RUN_ID = Date.now().toString().slice(-8);

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 720 };

// a phone: no hover and no right click, so a message's actions come from holding a finger on it
test.use({
  viewport: PHONE,
  hasTouch: true,
  permissions: ['clipboard-read', 'clipboard-write']
});

const HOLD_MS = 700;

// playwright's touchscreen only taps, so a held finger goes through chromium's own touch input,
// which is also what makes the browser fire the click and context menu a real finger would
const longPress = async (page: Page, target: Locator) => {
  await expect(target).toBeVisible();

  const box = await target.boundingBox();

  if (!box) {
    throw new Error('the target has no box to press on');
  }

  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const client = await page.context().newCDPSession(page);

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point]
    });
    await page.waitForTimeout(HOLD_MS);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
  } finally {
    await client.detach();
  }
};

const actionSheet = (page: Page) =>
  page.getByTestId(TestId.MESSAGE_ACTION_SHEET);

const threadView = (page: Page) => page.getByTestId(TestId.THREAD_VIEW);

const listLeft = async (page: Page) => {
  const box = await page.getByTestId(TestId.LEFT_SIDEBAR).boundingBox();

  return box ? Math.round(box.x) : undefined;
};

// a message of the phone user's own in the channel specs may write to, held down until its
// actions open. testuser has the default member permissions, which do not include reacting
const openActionsOnNewMessage = async (
  page: Page,
  text: string,
  identity = 'testuser'
) => {
  await loginAs(page, identity, 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await sendMessage(page, text);

  await longPress(page, messageByText(page, text));
  await expect(actionSheet(page)).toBeVisible();
};

test('holding a message opens its actions, and a reaction picked there is kept', async ({
  page
}) => {
  const text = `phone reaction ${RUN_ID}`;

  await openActionsOnNewMessage(page, text, 'testowner');

  // the finger lifting off is not a tap on whatever opened under it. nothing announces a click
  // that did not happen, so this gives the browser's tap gesture time to land first
  await page.waitForTimeout(300);
  await expect(actionSheet(page)).toBeVisible();
  await expect(page.getByText(/Replying to/)).toHaveCount(0);

  await actionSheet(page).getByTestId(TestId.MESSAGE_SHEET_ADD_REACTION).tap();

  const picker = actionSheet(page).getByTestId(
    TestId.MESSAGE_SHEET_EMOJI_PICKER
  );

  await expect(picker).toBeVisible();
  await picker.locator('input').fill('smile');
  // found by what it shows: its title is its first shortcode, which is not :smile:
  await picker.getByRole('button', { name: '😄', exact: true }).tap();

  await expect(actionSheet(page)).toHaveCount(0);

  const reaction = messageByText(page, text)
    .getByRole('button')
    .filter({ hasText: '😄' });

  await expect(reaction).toContainText('1');
});

test('reply from the actions sets the reply target', async ({ page }) => {
  await openActionsOnNewMessage(page, `phone reply ${RUN_ID}`);

  await actionSheet(page).getByTestId(TestId.MESSAGE_SHEET_REPLY).tap();

  await expect(actionSheet(page)).toHaveCount(0);
  await expect(page.getByText(/Replying to/)).toBeVisible();
});

test('delete from the actions asks first, then deletes', async ({ page }) => {
  const text = `phone delete ${RUN_ID}`;

  await openActionsOnNewMessage(page, text);

  await actionSheet(page).getByTestId(TestId.MESSAGE_SHEET_DELETE).tap();
  await confirmDialog(page);

  await expect(messageByText(page, text)).toHaveCount(0);
});

test('copy text puts the message on the clipboard as it was written', async ({
  page
}) => {
  const text = `copy & paste ${RUN_ID}`;

  await openActionsOnNewMessage(page, text);

  await actionSheet(page).getByTestId(TestId.MESSAGE_SHEET_COPY).tap();

  // the e2e tsconfig has no dom lib, so the page reads its clipboard from a string
  await expect
    .poll(() => page.evaluate('navigator.clipboard.readText()'))
    .toBe(text);
});

// a reference is stored as an empty span its chip fills in, so it used to copy as nothing
test('copy text writes a channel reference out by its name', async ({
  page
}) => {
  const text = `copy reference ${RUN_ID}`;

  await loginAs(page, 'testuser', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR).first();

  await editor.click();
  await editor.pressSequentially(`${text} #Live`);
  await expect(
    page.getByRole('listbox', { name: 'Reference channel' })
  ).toBeVisible();
  await editor.press('Enter');
  await editor.pressSequentially('end');

  // as in sendMessage, an enter that lands before the compose state catches up is dropped
  await expect
    .poll(async () => {
      await editor.press('Enter');

      return (await editor.innerText()).includes(text);
    })
    .toBe(false);

  await longPress(page, messageByText(page, text));
  await actionSheet(page).getByTestId(TestId.MESSAGE_SHEET_COPY).tap();

  await expect
    .poll(() => page.evaluate('navigator.clipboard.readText()'))
    .toBe(`${text} #${LIVE_MESSAGES_CHANNEL} end`);
});

test('reply in thread from the actions opens the thread full screen', async ({
  page
}) => {
  await openActionsOnNewMessage(page, `phone thread ${RUN_ID}`);

  await actionSheet(page).getByTestId(TestId.MESSAGE_SHEET_THREAD).tap();

  // the thread sidebar is hidden below lg, so it has to be the full screen threads view
  await expect(threadView(page)).toBeVisible();
  await expect.poll(() => listLeft(page)).toBe(-PHONE.width);
});

test('closing a thread opened from the actions goes back to the conversation', async ({
  page
}) => {
  const text = `phone thread close ${RUN_ID}`;

  await openActionsOnNewMessage(page, text);

  await actionSheet(page).getByTestId(TestId.MESSAGE_SHEET_THREAD).tap();
  await expect(threadView(page)).toBeVisible();

  await threadView(page).getByTestId(TestId.THREAD_CLOSE).tap();

  // not the followed threads list, which would slide in over the conversation
  await expect(threadView(page)).toHaveCount(0);
  await expect(messageByText(page, text)).toBeVisible();
  await expect.poll(() => listLeft(page)).toBe(-PHONE.width);
});

const withDesktopAndPhone = async (
  browser: Browser,
  run: (desktop: Page, phone: Page) => Promise<void>
) => {
  // explicit, or the phone viewport and touch this file's test.use sets would apply to it too
  const desktopContext = await browser.newContext({
    viewport: DESKTOP,
    hasTouch: false
  });
  const phoneContext = await browser.newContext({
    viewport: PHONE,
    hasTouch: true
  });

  try {
    const desktop = await desktopContext.newPage();
    const phone = await phoneContext.newPage();

    await loginAs(desktop, 'userc', 'password123');
    await loginAs(phone, 'testuser', 'password123');

    await run(desktop, phone);
  } finally {
    await Promise.all(
      [desktopContext, phoneContext].map((context) =>
        context.close().catch(() => {
          // already gone, nothing to clean up
        })
      )
    );
  }
};

test('the replies under a message open the thread full screen on a phone', async ({
  browser
}) => {
  const parentText = `phone replies parent ${RUN_ID}`;
  const replyText = `phone replies reply ${RUN_ID}`;

  await withDesktopAndPhone(browser, async (desktop, phone) => {
    await openChannel(desktop, LIVE_MESSAGES_CHANNEL);
    await sendMessage(desktop, parentText);

    const parent = messageByText(desktop, parentText);

    await parent.hover();
    await parent.getByTestId(TestId.MESSAGE_REPLY_IN_THREAD).click();
    await sendMessage(threadView(desktop), replyText);

    await openChannel(phone, LIVE_MESSAGES_CHANNEL);
    await messageByText(phone, parentText)
      .getByTestId(TestId.THREAD_REPLIES_BUTTON)
      .tap();

    await expect(threadView(phone)).toBeVisible();
    await expect(messageByText(threadView(phone), replyText)).toBeVisible();
    await expect.poll(() => listLeft(phone)).toBe(-PHONE.width);
  });
});

test('the pinned messages panel fits a phone screen', async ({ page }) => {
  await loginAs(page, 'testuser', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  await page.getByTestId(TestId.PINNED_MESSAGES_BUTTON).tap();

  const panel = page.locator('[data-slot="popover-content"]');

  await expect(panel).toBeVisible();

  const box = await panel.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width);
});

test.describe('with a mouse', () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false });

  test('holding the mouse on a message opens no sheet, and hovering still shows the toolbar', async ({
    page
  }) => {
    const text = `mouse hold ${RUN_ID}`;

    await loginAs(page, 'testuser', 'password123');
    await openChannel(page, LIVE_MESSAGES_CHANNEL);
    await sendMessage(page, text);

    const message = messageByText(page, text);

    await message.hover();
    await expect(
      message.getByTestId(TestId.MESSAGE_REPLY_IN_THREAD)
    ).toBeVisible();

    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();

    await expect(actionSheet(page)).toHaveCount(0);
  });
});
