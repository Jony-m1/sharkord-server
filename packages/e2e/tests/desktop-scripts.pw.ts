import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { readFileSync } from 'fs';
import path from 'path';
import { expect, loginAs, test } from './fixtures';
import { LIVE_MESSAGES_CHANNEL, openChannel } from './helpers/channels';
import { openDmPanel } from './helpers/dms';
import { boxOf } from './helpers/layout';
import { messageByText, sendMessage } from './helpers/messages';

// the Continental desktop app, and its iOS shell, dress this client with a stylesheet and
// scripts it injects into the page. they live in that app's repository, so these specs only run
// when CONTINENTAL_STATIC_DIR points at its static folder
const STATIC_DIR = process.env.CONTINENTAL_STATIC_DIR;

test.skip(!STATIC_DIR, 'CONTINENTAL_STATIC_DIR is not set');

const RUN_ID = Date.now().toString().slice(-8);

const PHONE = { width: 390, height: 844 };

// the theme draws the server's header this tall on a phone, with the menu 10px from its top
const PHONE_BANNER_HEIGHT = 164;
const PHONE_MENU_TOP = 10;

// voice-layout-inject.js lays the call out 100ms after the page last changed, so a check that it
// left something alone has to wait that long first
const LAYOUT_SCRIPT_SETTLE_MS = 400;

// frame.css turns a muted microphone's red into this softer one
const THEME_RED = 'rgb(217, 112, 95)';

type TBox = {
  left: number;
  width: number;
};

// what the measuring below touches in the page, which this package compiles without the dom types
type TPageElement = {
  click: () => void;
  getBoundingClientRect: () => TBox;
};

type TPageGlobals = {
  document: { querySelector: (selector: string) => TPageElement | null };
  requestAnimationFrame: (callback: () => void) => number;
};

type TLocationReport = {
  type?: string;
  kind: string;
  inCall?: boolean;
};

type TLocationGlobals = {
  __locationReports: TLocationReport[];
  addEventListener: (
    type: string,
    listener: (event: { data: TLocationReport | null }) => void
  ) => void;
};

const readStatic = (file: string) =>
  readFileSync(path.join(STATIC_DIR ?? '', file), 'utf8');

// the way the desktop app runs them once the page has loaded (injectIntoServerFrame in its
// main.ts): the theme first, with its stylesheet handed over in a global, then each script
const injectDesktop = async (page: Page, scripts: string[]) => {
  const css = JSON.stringify(readStatic('theme/frame.css'));

  await page.addScriptTag({
    content: `window.__continentalThemeCss = ${css};\n${readStatic('theme-inject.js')}`
  });

  for (const script of scripts) {
    await page.addScriptTag({ content: readStatic(script) });
  }
};

// keeps what location-inject.js posts to the window above the page, which is the page itself
// when nothing frames it, as in the iOS app
const recordLocationReports = (page: Page) =>
  page.evaluate(() => {
    const browser = globalThis as unknown as TLocationGlobals;

    browser.__locationReports = [];
    browser.addEventListener('message', (event) => {
      if (event.data?.type === 'sharkord-location') {
        browser.__locationReports.push(event.data);
      }
    });
  });

const isReportedInCall = async (page: Page) => {
  const reports = await page.evaluate(
    () => (globalThis as unknown as TLocationGlobals).__locationReports
  );
  const latest = reports[reports.length - 1];

  return latest?.inCall;
};

// clicking a voice channel joins its call
const joinCall = async (page: Page, name: string) => {
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: name })
    .first()
    .click({ force: true });

  await expect(page.getByTestId(TestId.VOICE_STAGE)).toBeVisible();
};

// clicks the members toggle inside the page and measures two frames later. a bar placed from
// <main>'s resize observer has moved with it by then, while one placed on the frame after the
// observer (as the script used to) still has the width <main> had before
const toggleMembersAndMeasureBar = (page: Page) =>
  page.evaluate(async (toggleId) => {
    const browser = globalThis as unknown as TPageGlobals;

    const nextFrame = () =>
      new Promise<void>((resolve) => {
        browser.requestAnimationFrame(() => resolve());
      });

    const toggle = browser.document.querySelector(
      `[data-testid="${toggleId}"]`
    );

    toggle?.click();

    await nextFrame();
    await nextFrame();

    const bar = browser.document.querySelector('[data-spk-topbar]');
    const main = browser.document.querySelector('main');

    if (!bar || !main) {
      return null;
    }

    const barBox = bar.getBoundingClientRect();
    const mainBox = main.getBoundingClientRect();

    return {
      left: Math.abs(barBox.left - mainBox.left),
      width: Math.abs(barBox.width - mainBox.width)
    };
  }, TestId.MEMBERS_TOGGLE);

test('the desktop call layout leaves the call chat to the fork and never takes a thread for it', async ({
  page
}) => {
  const content = `desktop thread ${RUN_ID}`;

  await loginAs(page, 'testowner', 'password123');
  await recordLocationReports(page);
  await injectDesktop(page, [
    'voice-layout-inject.js',
    'topbar-inject.js',
    'location-inject.js'
  ]);

  await expect.poll(() => isReportedInCall(page)).toBe(false);

  await joinCall(page, 'Voice');

  // the iOS app keeps the screen awake for as long as this says the page is in a call
  await expect.poll(() => isReportedInCall(page)).toBe(true);

  const chat = page.getByTestId(TestId.VOICE_CHAT);
  const toggle = page.getByTestId(TestId.VOICE_CHAT_TOGGLE);
  const thread = page.getByTestId(TestId.THREAD_VIEW);
  const moved = page.locator(
    '[data-spk-vsplit], [data-spk-vmain], [data-spk-vchat]'
  );

  // the fork draws the chat under the call itself, and older scripts clicked it shut
  await expect(
    page.locator('main').getByTestId(TestId.VOICE_CHAT)
  ).toBeVisible();
  await page.waitForTimeout(LAYOUT_SCRIPT_SETTLE_MS);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(moved).toHaveCount(0);

  // a name centred under the picture, now that the theme draws no tile round it
  await expect(
    page
      .locator("[class*='group/voice-user-card'] > .absolute.bottom-0")
      .first()
  ).toHaveCSS('justify-content', 'center');

  await sendMessage(chat, content);

  const message = messageByText(chat, content);

  await message.hover();
  await message.getByTestId(TestId.MESSAGE_REPLY_IN_THREAD).click();
  await expect(thread).toBeVisible();

  // with the chat closed, the open thread is the panel after <main>, which older scripts pulled
  // under the call as if it were the chat
  await toggle.click();
  await expect(chat).toHaveCount(0);
  await page.waitForTimeout(LAYOUT_SCRIPT_SETTLE_MS);
  await expect(moved).toHaveCount(0);
  await expect(thread).toBeVisible();

  await toggle.click();
  await expect(chat).toBeVisible();
  await page.waitForTimeout(LAYOUT_SCRIPT_SETTLE_MS);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(moved).toHaveCount(0);
});

test('the desktop top bar sits on the named channel header and moves with the member list', async ({
  page
}) => {
  await loginAs(page, 'testuser', 'password123');
  await injectDesktop(page, ['topbar-inject.js']);
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  const bar = page.locator('[data-spk-topbar]');

  await expect(page.getByTestId(TestId.CHANNEL_HEADER)).toHaveAttribute(
    'data-spk-header',
    ''
  );
  await expect(bar).toHaveCSS('position', 'fixed');
  await expect(bar).toHaveCSS('transition-duration', '0s');

  for (let toggles = 0; toggles < 2; toggles += 1) {
    const offset = await toggleMembersAndMeasureBar(page);

    expect(offset).not.toBeNull();
    expect(offset?.left).toBeLessThanOrEqual(1);
    expect(offset?.width).toBeLessThanOrEqual(1);
  }

  // the DM landing has no header, so the bar becomes the header and <main> makes room for it
  await openDmPanel(page);
  await expect(page.locator('main')).toHaveAttribute('data-spk-noheader', '');
});

test('the desktop theme marks only the open row as selected and colours a muted microphone', async ({
  page
}) => {
  await loginAs(page, 'testuser', 'password123');
  await injectDesktop(page, []);
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  const selected = page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: LIVE_MESSAGES_CHANNEL })
    .first();
  const userControl = page.getByTestId(TestId.USER_CONTROL);

  // a gold bar at the selected row's edge instead of a box round it, and no box round the
  // Direct Messages row that is not open
  await expect(selected).toHaveCSS('box-shadow', /inset/);
  await expect(selected).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await expect(page.getByTestId(TestId.DM_TOGGLE)).toHaveCSS(
    'border-top-width',
    '0px'
  );

  await userControl.locator('button:has(svg.lucide-mic)').click();

  // the red reaches the icon, not only the button round it
  await expect(userControl.locator('svg.lucide-mic-off')).toHaveCSS(
    'color',
    THEME_RED
  );
});

test.describe('on a phone', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test('the theme lays the server banner out with the menu in its corner and the numbers under the name', async ({
    page
  }) => {
    await loginAs(page, 'testuser', 'password123');
    await injectDesktop(page, ['home-inject.js']);

    const header = page.getByTestId(TestId.SERVER_HEADER);
    const stats = header.locator(':scope > .ct-list-stats');

    await expect(stats).toHaveText(/^\d+ members? · \d+ online$/);

    const headerBox = await boxOf(header);
    const nameBox = await boxOf(
      page.getByTestId(TestId.LEFT_SIDEBAR_SERVER_NAME)
    );
    const menuBox = await boxOf(page.getByTestId(TestId.SERVER_MENU_TRIGGER));
    const statsBox = await boxOf(stats);

    expect(Math.round(headerBox.height)).toBe(PHONE_BANNER_HEIGHT);

    expect(Math.round(menuBox.y - headerBox.y)).toBe(PHONE_MENU_TOP);
    expect(menuBox.x + menuBox.width).toBeGreaterThan(
      headerBox.x + headerBox.width - 24
    );

    expect(nameBox.y).toBeGreaterThan(headerBox.y + headerBox.height / 2);
    expect(statsBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height - 1);
    expect(statsBox.y + statsBox.height).toBeLessThanOrEqual(
      headerBox.y + headerBox.height
    );

    // the channel list covers <main> on a phone, so no home panel is built under it
    await expect(page.locator('#ct-home')).toHaveCount(0);
  });
});
