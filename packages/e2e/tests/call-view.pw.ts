import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';

// a user is in one call at a time, and other specs put testowner, userd and usere in calls
// while usera, userb and testmoderator belong to the session spec. the tests here share userc
// and testuser, so they run one after another
test.describe.configure({ mode: 'serial' });

const CALL_USER = 'userc';
const PHONE_USER = 'testuser';
const PASSWORD = 'password123';

const PHONE = { width: 390, height: 844 };
// wide enough for the channel list beside the call, too short for the call and its chat
const PHONE_ON_ITS_SIDE = { width: 844, height: 390 };
// between a phone and the top bar, which shows from lg up
const TABLET = { width: 900, height: 800 };

// seeded by seed-e2e.ts for the switch below, the only test that joins it
const EMPTY_CALL = 'Lounge';

// what the page saw while it was building the call view, recorded before it could paint
type TCallViewRecord = {
  sawEmptyCall: boolean;
  chatBelowStage: boolean | null;
};

// a mutation observer runs before the browser paints, so this catches a frame that a check
// polling from the test could miss: the empty call while joining, or the chat anywhere but
// under the call when it first appears
const recordCallView = (page: Page) =>
  page.addInitScript({
    content: `
      window.__callView = { sawEmptyCall: false, chatBelowStage: null };

      new MutationObserver(() => {
        const record = window.__callView;

        if (document.querySelector('[data-testid="${TestId.VOICE_CHANNEL_EMPTY}"]')) {
          record.sawEmptyCall = true;
        }

        if (record.chatBelowStage !== null) return;

        const stage = document.querySelector('[data-testid="${TestId.VOICE_STAGE}"]');
        const chat = document.querySelector('[data-testid="${TestId.VOICE_CHAT}"]');

        if (!stage || !chat) return;

        record.chatBelowStage =
          chat.getBoundingClientRect().top >= stage.getBoundingClientRect().bottom - 1;
      }).observe(document, { childList: true, subtree: true });
    `
  });

const readCallView = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __callView: TCallViewRecord }).__callView
  );

// clicking a voice channel joins its call, and the call is on screen straight away
const openCall = async (page: Page, name: string) => {
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: name })
    .first()
    .click({ force: true });

  await expect(page.getByTestId(TestId.VOICE_STAGE)).toBeVisible();
};

const chatHeight = async (page: Page) => {
  const box = await page.getByTestId(TestId.VOICE_CHAT).boundingBox();

  return box ? Math.round(box.height) : undefined;
};

// a pixel either way, for the pointer landing on a fractional coordinate
const chatHeightOffBy = async (page: Page, expected: number) => {
  const height = await chatHeight(page);

  if (height === undefined) return undefined;

  return Math.abs(height - expected);
};

const chatBox = async (page: Page) => {
  const box = await page.getByTestId(TestId.VOICE_CHAT).boundingBox();

  if (!box) return undefined;

  return { x: Math.round(box.x), width: Math.round(box.width) };
};

// the chat as a screen of its own covers the whole call, its header included
const chatCoversCall = async (page: Page) => {
  const chat = await page.getByTestId(TestId.VOICE_CHAT).boundingBox();
  const header = await page.getByTestId(TestId.VOICE_CALL_HEADER).boundingBox();
  const stage = await page.getByTestId(TestId.VOICE_STAGE).boundingBox();

  if (!chat || !header || !stage) return false;

  return (
    Math.round(chat.x) <= Math.round(stage.x) &&
    Math.round(chat.y) <= Math.round(header.y) &&
    Math.round(chat.x + chat.width) >= Math.round(stage.x + stage.width) &&
    Math.round(chat.y + chat.height) >= Math.round(stage.y + stage.height)
  );
};

// leaving a call from the DMs keeps it selected, and closing them goes back to it, so the call
// is on screen without being joined
const leaveCallFromDms = async (page: Page) => {
  await page.getByTestId(TestId.DM_TOGGLE).click();
  await page
    .getByTestId(TestId.VOICE_CONTROL)
    .getByRole('button', { name: 'Disconnect' })
    .click();
  await expect(page.getByTestId(TestId.VOICE_CONTROL)).toHaveCount(0);
  await page.getByTestId(TestId.DM_TOGGLE).click();
  await expect(page.getByTestId(TestId.VOICE_STAGE)).toBeVisible();
};

test('a call shows its chat underneath from the first frame and never shows as empty to the one joining it', async ({
  page
}) => {
  await recordCallView(page);
  await loginAs(page, CALL_USER, PASSWORD);

  await openCall(page, 'Voice');

  const chat = page.getByTestId(TestId.VOICE_CHAT);

  await expect(chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();

  // the placeholder stands in for the joiner until the server lists them, then makes way
  await expect(page.getByTestId(TestId.VOICE_JOINING_CARD)).toHaveCount(0);
  await expect(page.getByTestId(TestId.VOICE_CONTROL)).toContainText(
    'Voice connected'
  );

  const record = await readCallView(page);

  expect(record.sawEmptyCall).toBe(false);
  expect(record.chatBelowStage).toBe(true);

  const stageBox = await page.getByTestId(TestId.VOICE_STAGE).boundingBox();
  const settledChatBox = await chat.boundingBox();

  expect(settledChatBox!.y).toBeGreaterThanOrEqual(
    stageBox!.y + stageBox!.height - 1
  );
});

test('switching into an empty call never shows it as empty to the one joining it', async ({
  page
}) => {
  await recordCallView(page);
  await loginAs(page, CALL_USER, PASSWORD);

  await openCall(page, 'Voice');
  await expect(page.getByTestId(TestId.VOICE_CONTROL)).toContainText(
    'Voice connected'
  );

  // the call being left is no longer the current one for the whole of the leave's round trip,
  // and before the join to the next one even goes out
  await openCall(page, EMPTY_CALL);

  await expect(page.getByTestId(TestId.VOICE_JOINING_CARD)).toHaveCount(0);
  await expect(page.getByTestId(TestId.VOICE_CONTROL)).toContainText(
    'Voice connected'
  );

  const record = await readCallView(page);

  expect(record.sawEmptyCall).toBe(false);
});

test('from lg up the top bar toggles the chat of a call on screen that you are not in', async ({
  page
}) => {
  await loginAs(page, CALL_USER, PASSWORD);
  await openCall(page, 'Voice');
  await expect(page.getByTestId(TestId.VOICE_CONTROL)).toContainText(
    'Voice connected'
  );

  await leaveCallFromDms(page);

  const toggle = page.getByTestId(TestId.VOICE_CHAT_TOGGLE);
  const chat = page.getByTestId(TestId.VOICE_CHAT);

  await expect(chat).toBeVisible();

  await toggle.click();
  await expect(chat).toHaveCount(0);

  await toggle.click();
  await expect(chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();
});

test('the height the chat is dragged to is kept after a reload', async ({
  page
}) => {
  await loginAs(page, CALL_USER, PASSWORD);
  await openCall(page, 'Voice');

  const chat = page.getByTestId(TestId.VOICE_CHAT);

  await expect(chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();

  const before = await chatHeight(page);
  const handle = await page.getByTestId(TestId.VOICE_CHAT_RESIZE).boundingBox();

  expect(before).toBeDefined();
  expect(handle).not.toBeNull();

  const x = handle!.x + handle!.width / 2;
  const y = handle!.y + handle!.height / 2;

  // up by less than the room the call has above its minimum height on a 720 high window
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 80, { steps: 8 });
  await page.mouse.up();

  const dragged = before! + 80;

  await expect
    .poll(() => chatHeightOffBy(page, dragged))
    .toBeLessThanOrEqual(1);

  // logging in again loads the app afresh, which leaves the call
  await loginAs(page, CALL_USER, PASSWORD);
  await openCall(page, 'Voice');

  await expect
    .poll(() => chatHeightOffBy(page, dragged))
    .toBeLessThanOrEqual(1);
});

test('on a phone the chat is a screen of its own over the call, and back returns to the call', async ({
  browser
}) => {
  const context = await browser.newContext({
    viewport: PHONE,
    hasTouch: true
  });

  try {
    const phone = await context.newPage();

    await loginAs(phone, PHONE_USER, PASSWORD);
    await openCall(phone, 'Voice');

    // a call opens on the call, with its chat one tap away in the call's header
    await expect(phone.getByTestId(TestId.VOICE_CALL_HEADER)).toBeVisible();
    await expect(phone.getByTestId(TestId.VOICE_CHAT)).toHaveCount(0);

    await phone.getByTestId(TestId.VOICE_CALL_CHAT_TOGGLE).click();

    const chat = phone.getByTestId(TestId.VOICE_CHAT);

    await expect(chat).toBeVisible();
    // it slides in, so the check polls until it covers the screen
    await expect
      .poll(() => chatBox(phone))
      .toEqual({ x: 0, width: PHONE.width });
    await expect(chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();
    // the top bar that carries them from lg up is hidden here
    await expect(chat.getByTestId(TestId.PINNED_MESSAGES_BUTTON)).toBeVisible();

    await chat.getByTestId(TestId.VOICE_CHAT_BACK).click();

    await expect(phone.getByTestId(TestId.VOICE_CHAT)).toHaveCount(0);
    await expect(phone.getByTestId(TestId.VOICE_STAGE)).toBeVisible();
    await expect(phone.getByTestId(TestId.VOICE_CALL_HEADER)).toBeVisible();
  } finally {
    await context.close().catch(() => {});
  }
});

test('a phone on its side gets the chat as a screen of its own too, with its composer on screen', async ({
  browser
}) => {
  const context = await browser.newContext({
    viewport: PHONE_ON_ITS_SIDE,
    hasTouch: true
  });

  try {
    const phone = await context.newPage();

    await loginAs(phone, PHONE_USER, PASSWORD);
    await openCall(phone, 'Voice');

    // as with the phone held upright, a call opens on the call
    await expect(phone.getByTestId(TestId.VOICE_CHAT)).toHaveCount(0);

    await phone.getByTestId(TestId.VOICE_CALL_CHAT_TOGGLE).click();

    const chat = phone.getByTestId(TestId.VOICE_CHAT);

    await expect(chat).toBeVisible();
    // it slides in, so the check polls until it covers the call
    await expect.poll(() => chatCoversCall(phone)).toBe(true);
    await expect(chat.getByTestId(TestId.VOICE_CHAT_RESIZE)).toHaveCount(0);
    // under the call it needed more height than this screen has, and lost its composer off
    // the bottom
    await expect(
      chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)
    ).toBeInViewport({ ratio: 1 });
    await expect(chat.getByTestId(TestId.PINNED_MESSAGES_BUTTON)).toBeVisible();

    await chat.getByTestId(TestId.VOICE_CHAT_BACK).click();

    await expect(phone.getByTestId(TestId.VOICE_CHAT)).toHaveCount(0);
    await expect(phone.getByTestId(TestId.VOICE_STAGE)).toBeVisible();
  } finally {
    await context.close().catch(() => {});
  }
});

test('between a phone and the top bar the call header carries the open chat’s buttons', async ({
  page
}) => {
  await page.setViewportSize(TABLET);
  await loginAs(page, CALL_USER, PASSWORD);
  await openCall(page, 'Voice');

  const header = page.getByTestId(TestId.VOICE_CALL_HEADER);
  const chat = page.getByTestId(TestId.VOICE_CHAT);

  // there is room for the chat under the call here, so it starts open there with no header
  await expect(chat.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();
  await expect(chat.getByTestId(TestId.VOICE_CHAT_BACK)).toHaveCount(0);
  await expect(header.getByTestId(TestId.PINNED_MESSAGES_BUTTON)).toBeVisible();

  // closing the chat takes its buttons with it
  await header.getByTestId(TestId.VOICE_CALL_CHAT_TOGGLE).click();

  await expect(chat).toHaveCount(0);
  await expect(header.getByTestId(TestId.PINNED_MESSAGES_BUTTON)).toHaveCount(
    0
  );
});

// the server turns a join away when the user is already in a call from another tab. a
// forbidden or rate-limited join fails down the same path, so this stands in for all three
test('a join the server turns away leaves no call and no connecting state behind', async ({
  browser
}) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();

  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();

    await loginAs(first, PHONE_USER, PASSWORD);
    await loginAs(second, PHONE_USER, PASSWORD);

    await openCall(first, 'Voice');
    await expect(first.getByTestId(TestId.VOICE_CONTROL)).toContainText(
      'Voice connected'
    );

    await second
      .getByTestId(TestId.CHANNEL_ITEM)
      .filter({ hasText: 'Voice' })
      .first()
      .click({ force: true });

    await expect(
      second.getByText('User already in a voice channel')
    ).toBeVisible();
    await expect(second.getByTestId(TestId.VOICE_CONTROL)).toHaveCount(0);
    await expect(second.getByTestId(TestId.VOICE_JOINING_CARD)).toHaveCount(0);
    await expect(second.getByTestId(TestId.VOICE_STAGE)).toHaveCount(0);
  } finally {
    await firstContext.close().catch(() => {});
    await secondContext.close().catch(() => {});
  }
});
