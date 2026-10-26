import type { Locator, Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import {
  INFINITE_SCROLL_CHANNEL,
  LIVE_MESSAGES_CHANNEL,
  openChannel
} from './helpers/channels';
import {
  getMockMessageNumbers,
  LIVE_MESSAGES_NEWEST,
  messageItems,
  NEWEST_MOCK_MESSAGE,
  waitForNewestMockMessage
} from './helpers/messages';
import {
  messagesContainer,
  waitForStableScroll,
  wheelUpUntil
} from './helpers/scroll';

// what a channel looks like while its history is on the way: the header and the composer are
// there from the first frame, only the message list waits, and the refetch that runs on every
// open stays out of sight. the server's answers to message pages are held back here the way a
// slow connection holds them, which is the only way to look at those frames at all

const PAGE_DELAY_MS = 1500;

type TPageMode = 'delay' | 'fail';

type TTrpcFrame = {
  id?: number | string;
  params?: { path?: string };
};

const parseFrames = (message: string | Buffer): TTrpcFrame[] => {
  try {
    const parsed: unknown = JSON.parse(message.toString());

    if (Array.isArray(parsed)) return parsed as TTrpcFrame[];

    return [parsed as TTrpcFrame];
  } catch {
    // keep-alive pings are plain text
    return [];
  }
};

// messages.get answers go through the given mode, everything else passes untouched. the
// returned counter is how many answers are being held right now, so a test can tell that a
// refetch is in flight without guessing at timings
const routeMessagePages = async (page: Page, modes: TPageMode[]) => {
  let held = 0;

  await page.routeWebSocket(/localhost:4991/, (socket) => {
    const server = socket.connectToServer();
    const pageRequestIds = new Set<string>();

    socket.onMessage((message) => {
      for (const frame of parseFrames(message)) {
        if (frame.params?.path === 'messages.get' && frame.id !== undefined) {
          pageRequestIds.add(String(frame.id));
        }
      }

      server.send(message);
    });

    server.onMessage((message) => {
      const [frame] = parseFrames(message);
      const id = frame?.id === undefined ? undefined : String(frame.id);

      if (id === undefined || !pageRequestIds.has(id)) {
        socket.send(message);

        return;
      }

      pageRequestIds.delete(id);

      const mode = modes.shift() ?? 'delay';

      if (mode === 'fail') {
        socket.send(
          JSON.stringify({
            id: frame?.id,
            error: {
              message: 'Messages are unavailable right now',
              code: -32603,
              data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 }
            }
          })
        );

        return;
      }

      held += 1;

      setTimeout(() => {
        held -= 1;
        socket.send(message);
      }, PAGE_DELAY_MS);
    });
  });

  return { held: () => held };
};

// whether the element shows up at all, however briefly, within the time given. playwright
// checks on every frame, so even a pill that flashes for one round trip is caught
const appearsWithin = (locator: Locator, timeout: number) =>
  locator.waitFor({ state: 'attached', timeout }).then(
    () => true,
    () => false
  );

test('a channel shows its header and composer while its messages load', async ({
  page
}) => {
  await routeMessagePages(page, []);
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);

  const container = messagesContainer(page);

  // the page is still held back: the list shows its placeholder, nothing else waits on it
  await expect(container.getByTestId(TestId.MESSAGES_SKELETON)).toBeVisible();
  await expect(page.getByTestId(TestId.CHANNEL_HEADER)).toBeVisible();
  await expect(
    page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR).first()
  ).toBeVisible();
  await expect(messageItems(page)).toHaveCount(0);
  await expect(page.getByTestId(TestId.MESSAGES_FETCHING_OLDER)).toHaveCount(0);

  await waitForNewestMockMessage(page);

  await expect(page.getByTestId(TestId.MESSAGES_SKELETON)).toHaveCount(0);
  await expect(page.getByTestId(TestId.MESSAGES_FETCHING_OLDER)).toHaveCount(0);
});

test('going back to a channel shows its messages at once with no loading pill', async ({
  page
}) => {
  const pages = await routeMessagePages(page, []);

  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  await openChannel(page, LIVE_MESSAGES_CHANNEL);
  await waitForNewestMockMessage(page, LIVE_MESSAGES_NEWEST);

  const pillAppears = appearsWithin(
    page.getByTestId(TestId.MESSAGES_FETCHING_OLDER),
    PAGE_DELAY_MS * 2
  );
  const skeletonAppears = appearsWithin(
    page.getByTestId(TestId.MESSAGES_SKELETON),
    PAGE_DELAY_MS * 2
  );

  await openChannel(page, INFINITE_SCROLL_CHANNEL);

  // page 1 is asked for again on every open, and that answer is being held right now, yet the
  // cached messages are already there
  await expect.poll(() => pages.held()).toBeGreaterThan(0);
  await expect(messageItems(page).first()).toBeVisible();
  expect(Math.max(...(await getMockMessageNumbers(page)))).toBe(
    NEWEST_MOCK_MESSAGE
  );

  await expect.poll(() => pages.held()).toBe(0);

  expect(await pillAppears).toBe(false);
  expect(await skeletonAppears).toBe(false);
});

test('loading older messages shows the pill until the page arrives', async ({
  page
}) => {
  await routeMessagePages(page, []);
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  const container = messagesContainer(page);

  await waitForStableScroll(container);

  const oldestOnFirstPage = Math.min(...(await getMockMessageNumbers(page)));
  const pill = page.getByTestId(TestId.MESSAGES_FETCHING_OLDER);

  await wheelUpUntil(page, container, () => pill.isVisible());

  await expect(pill).toBeHidden();
  expect(Math.min(...(await getMockMessageNumbers(page)))).toBeLessThan(
    oldestOnFirstPage
  );
});

test('a channel whose messages fail to load offers a retry', async ({
  page
}) => {
  await routeMessagePages(page, ['fail']);
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);

  const loadFailed = page.getByTestId(TestId.MESSAGES_LOAD_FAILED);

  await expect(
    page.getByText('Messages are unavailable right now')
  ).toBeVisible();
  await expect(loadFailed).toBeVisible();
  await expect(
    page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR).first()
  ).toBeVisible();

  // a failed page is not asked for again on its own, which would loop against a server that
  // keeps failing. any request that did go out would be answered once its delay is over, so
  // the list staying empty past that is the proof
  await page.waitForTimeout(PAGE_DELAY_MS + 1000);
  await expect(messageItems(page)).toHaveCount(0);

  await loadFailed.getByRole('button', { name: 'Retry' }).click();

  await waitForNewestMockMessage(page);
  await expect(loadFailed).toHaveCount(0);
});

test('an older page that fails keeps its retry after the toast is gone, and keeps the place', async ({
  page
}) => {
  await routeMessagePages(page, ['delay', 'fail']);
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, INFINITE_SCROLL_CHANNEL);
  await waitForNewestMockMessage(page);

  const container = messagesContainer(page);

  await waitForStableScroll(container);

  const oldestOnFirstPage = Math.min(...(await getMockMessageNumbers(page)));
  const loadFailed = page.getByTestId(TestId.MESSAGES_LOAD_FAILED);

  await wheelUpUntil(page, container, () => loadFailed.isVisible());

  // the toast goes away on its own after a few seconds, the way back to the history must not
  await expect(page.getByText('Messages are unavailable right now')).toBeHidden(
    { timeout: 10_000 }
  );
  await expect(loadFailed).toBeVisible();
  expect(Math.min(...(await getMockMessageNumbers(page)))).toBe(
    oldestOnFirstPage
  );

  await loadFailed.getByRole('button', { name: 'Retry' }).click();

  await expect(loadFailed).toHaveCount(0);
  await expect
    .poll(async () => Math.min(...(await getMockMessageNumbers(page))))
    .toBeLessThan(oldestOnFirstPage);
  await waitForStableScroll(container);

  // the page goes in above what was on screen. left at the top, the view would show the
  // start of the new page instead, and ask for the one after it straight away. the message is
  // matched by its own text exactly: an item's whole text also holds its hidden toolbar, so
  // "Mock message 901" runs straight into whatever that toolbar renders
  await expect(
    messageItems(page).filter({
      has: page.getByText(`Mock message ${oldestOnFirstPage}`, { exact: true })
    })
  ).toBeInViewport();
});
