import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { openChannel } from './helpers/channels';
import { openDmPanel } from './helpers/dms';

const PHONE = { width: 390, height: 844 };

type TFrameWidths = {
  members: number;
  main: number;
};

// what the specs below touch in the page, which this package compiles without the dom types
type TPageElement = {
  click: () => void;
  getBoundingClientRect: () => { width: number };
};

type TPageGlobals = {
  document: { querySelector: (selector: string) => TPageElement | null };
  requestAnimationFrame: (callback: () => void) => number;
};

// clicks the members toggle and reads the widths on the next three frames, all inside the page
// so no round trip to playwright can hide a frame where the panel is mid-way
const toggleMembersAndMeasure = (page: Page) =>
  page.evaluate(
    async ({ toggleId, membersId }) => {
      const browser = globalThis as unknown as TPageGlobals;

      const read = (selector: string) => {
        const element = browser.document.querySelector(selector);

        if (!element) {
          return -1;
        }

        const rect = element.getBoundingClientRect();

        return rect.width;
      };

      const nextFrame = () =>
        new Promise<void>((resolve) => {
          browser.requestAnimationFrame(() => resolve());
        });

      const toggle = browser.document.querySelector(
        `[data-testid="${toggleId}"]`
      );

      toggle?.click();

      const frames: TFrameWidths[] = [];

      for (let frame = 0; frame < 3; frame += 1) {
        await nextFrame();

        frames.push({
          members: read(`[data-testid="${membersId}"]`),
          main: read('main')
        });
      }

      return frames;
    },
    { toggleId: TestId.MEMBERS_TOGGLE, membersId: TestId.MEMBERS_SIDEBAR }
  );

const membersWidth = async (page: Page) => {
  const box = await page.getByTestId(TestId.MEMBERS_SIDEBAR).boundingBox();

  return box ? Math.round(box.width) : undefined;
};

const membersLeft = async (page: Page) => {
  const box = await page.getByTestId(TestId.MEMBERS_SIDEBAR).boundingBox();

  return box ? Math.round(box.x) : undefined;
};

const listLeft = async (page: Page) => {
  const box = await page.getByTestId(TestId.LEFT_SIDEBAR).boundingBox();

  return box ? Math.round(box.x) : undefined;
};

test.describe('on a wide screen', () => {
  // the panel used to grow over half a second, relaying out the chat on every frame
  test('the member list opens and closes at full width at once', async ({
    page
  }) => {
    await loginAs(page, 'testuser', 'password123');
    await openChannel(page, 'General');

    // a fresh browser starts with the list open on a wide screen
    await expect(page.getByTestId(TestId.MEMBER_ITEM).first()).toBeVisible();

    const openWidth = await membersWidth(page);

    const closing = await toggleMembersAndMeasure(page);

    expect(closing.map(({ members }) => members)).toEqual([0, 0, 0]);
    expect(new Set(closing.map(({ main }) => main)).size).toBe(1);

    const opening = await toggleMembersAndMeasure(page);

    expect(opening.map(({ members }) => Math.round(members))).toEqual([
      openWidth,
      openWidth,
      openWidth
    ]);
    expect(new Set(opening.map(({ main }) => main)).size).toBe(1);
  });

  // which of the other seeded users are online depends on the specs running alongside, so only
  // the one logged in here is certain
  test('the member list puts you under online, at full strength', async ({
    page
  }) => {
    await loginAs(page, 'testuser', 'password123');
    await openChannel(page, 'General');

    const members = page.getByTestId(TestId.MEMBERS_SIDEBAR);
    const ownRow = members
      .getByTestId(TestId.MEMBER_ITEM)
      .filter({ hasText: 'Test User' });

    await expect(members.getByText(/^Online \(\d+\)$/)).toBeVisible();
    await expect(ownRow).toHaveCSS('opacity', '1');
  });

  // Discord goes back to the channel you were in, not to the server's home
  test('leaving the direct messages returns to the channel that was open', async ({
    page
  }) => {
    await loginAs(page, 'testuser', 'password123');
    await openChannel(page, 'General');
    await expect(page.getByTestId(TestId.CHANNEL_HEADER)).toContainText(
      'General'
    );

    await openDmPanel(page);
    await expect(page.getByTestId(TestId.CHANNEL_HEADER)).toHaveCount(0);

    await page.getByTestId(TestId.DM_TOGGLE).click();

    await expect(page.getByTestId(TestId.CHANNEL_HEADER)).toContainText(
      'General'
    );
    await expect(page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  // on Discord the conversation stays where it is while the list slides back over it
  test('back keeps the conversation painted until the list covers it', async ({
    page
  }) => {
    await loginAs(page, 'testuser', 'password123');
    await openChannel(page, 'General');
    await expect.poll(() => listLeft(page)).toBe(-PHONE.width);

    const stillPainted = await page.evaluate(
      async ({ backId, composerId }) => {
        const browser = globalThis as unknown as TPageGlobals;
        const back = browser.document.querySelector(
          `[data-testid="${backId}"]`
        );

        back?.click();

        // two frames: the first one the click's render lands in, the second one painted
        await new Promise<void>((resolve) => {
          browser.requestAnimationFrame(() => {
            browser.requestAnimationFrame(() => resolve());
          });
        });

        const composer = browser.document.querySelector(
          `[data-testid="${composerId}"]`
        );

        return composer !== null;
      },
      {
        backId: TestId.MOBILE_BACK_BUTTON,
        composerId: TestId.MESSAGE_COMPOSE_EDITOR
      }
    );

    expect(stillPainted).toBe(true);

    await expect.poll(() => listLeft(page)).toBe(0);

    // once covered it closes, so the same row opens it again
    await expect(page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toHaveCount(
      0
    );

    await openChannel(page, 'General');
    await expect.poll(() => listLeft(page)).toBe(-PHONE.width);
  });

  test('the header opens the members, and a tap beside them closes them', async ({
    page
  }) => {
    await loginAs(page, 'testuser', 'password123');
    await openChannel(page, 'General');

    // closed, it waits off screen with its rows already there, so it can slide in and out
    await expect.poll(() => membersLeft(page)).toBe(PHONE.width);
    await expect(page.getByTestId(TestId.MEMBER_ITEM).first()).toBeAttached();

    const overlay = page.getByTestId(TestId.MEMBERS_OVERLAY);

    await expect(overlay).toHaveCSS('pointer-events', 'none');

    await page.getByTestId(TestId.MEMBERS_DRAWER_TOGGLE).click();

    const width = (await membersWidth(page)) ?? 0;

    await expect.poll(() => membersLeft(page)).toBe(PHONE.width - width);
    await expect(page.getByTestId(TestId.MEMBER_ITEM).first()).toBeVisible();

    await overlay.click({ position: { x: 20, y: PHONE.height / 2 } });

    await expect.poll(() => membersLeft(page)).toBe(PHONE.width);
    await expect(overlay).toHaveCSS('pointer-events', 'none');

    // the conversation under it takes taps again: a click fails while something covers it
    await page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR).click();
  });

  test('the header opens the search', async ({ page }) => {
    await loginAs(page, 'testuser', 'password123');
    await openChannel(page, 'General');

    await page.getByTestId(TestId.CHANNEL_HEADER_SEARCH).click();

    await expect(page.getByTestId(TestId.SEARCH_INPUT)).toBeVisible();
  });
});
