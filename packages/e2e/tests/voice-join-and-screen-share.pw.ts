import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, test } from './fixtures';
import { withClients } from './helpers/clients';

// no other spec puts these two in a call, and a user is in one call at a time, so nothing
// elsewhere can pull them out of this one. the ids are their rows in the server's seed.ts
const FIRST = { identity: 'userd', id: 7 };
const SECOND = { identity: 'usere', id: 8 };

// seeded for e2e only, after the users above: every default permission but SHARE_SCREEN
const NO_SHARE = { identity: 'usernoshare', id: 9 };

// the first two tests put the same two users in the same call
test.describe.configure({ mode: 'serial' });

// clicking a voice channel joins its call. the panel only says connected once the transports,
// the people already in the call and the microphone are all set up
const joinCall = async (page: Page) => {
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'Voice' })
    .first()
    .click({ force: true });

  await expect(
    page.getByTestId(TestId.LEFT_SIDEBAR).getByText('Voice connected')
  ).toBeVisible();
};

// other specs sign in as these users too, and the server only ends a call on a socket close
// once the user has no socket left, so closing the pages could leave them in the call and the
// next test's join would be refused. the panel goes the moment the button is pressed, but the
// user's own row under the channel only once the server has taken them out
const leaveCall = async (page: Page, userId: number) => {
  await page
    .getByTestId(TestId.VOICE_CONTROL)
    .getByRole('button', { name: 'Disconnect' })
    .click();

  await expect(
    page.locator(
      `[data-testid="${TestId.SIDEBAR_VOICE_USER}"][data-user-id="${userId}"]`
    )
  ).toHaveCount(0);
};

// the e2e tsconfig has no dom lib, so the little of a media element these checks read is typed
// by hand
type TMediaElement = {
  srcObject: {
    getTracks: () => { kind: string; readyState: string }[];
  } | null;
};

// a user's audio element appears once their microphone has been consumed. a consumed track is
// live before any packet arrives, so this holds without a working ice path to the server
const hasLiveAudioFrom = (page: Page, userId: number) => {
  const audios = page.locator(`audio[data-user-id="${userId}"]`);

  return audios.evaluateAll((elements) =>
    elements.some((element) => {
      const { srcObject } = element as unknown as TMediaElement;

      if (!srcObject) return false;

      const tracks = srcObject.getTracks();

      return tracks.some(
        (track) => track.kind === 'audio' && track.readyState === 'live'
      );
    })
  );
};

// nobody in these calls turns a camera on, so every live video on the page is a screen share
const liveVideoCount = (page: Page) => {
  const videos = page.locator('video');

  return videos.evaluateAll(
    (elements) =>
      elements.filter((element) => {
        const { srcObject } = element as unknown as TMediaElement;

        if (!srcObject) return false;

        const tracks = srcObject.getTracks();

        return tracks.some(
          (track) => track.kind === 'video' && track.readyState === 'live'
        );
      }).length
  );
};

const screenShareButton = (page: Page, name: string) =>
  page.getByTestId(TestId.LEFT_SIDEBAR).getByRole('button', { name });

test('joining a call that is already running hears the people in it, and they hear the joiner', async ({
  browser
}) => {
  await withClients(
    browser,
    [FIRST.identity, SECOND.identity],
    async ([first, second]) => {
      await joinCall(first!);
      await joinCall(second!);

      // the second user consumed a producer that existed before they joined
      await expect.poll(() => hasLiveAudioFrom(second!, FIRST.id)).toBe(true);

      // and the first consumed the second's microphone as it was produced
      await expect.poll(() => hasLiveAudioFrom(first!, SECOND.id)).toBe(true);

      await leaveCall(first!, FIRST.id);
      await leaveCall(second!, SECOND.id);
    }
  );
});

test('a screen share reaches the other people in the call and goes away when it stops', async ({
  browser
}) => {
  await withClients(
    browser,
    [FIRST.identity, SECOND.identity],
    async ([sharer, viewer]) => {
      await joinCall(sharer!);
      await joinCall(viewer!);

      await expect.poll(() => liveVideoCount(viewer!)).toBe(0);

      // chromium's fake media flags answer the screen picker with a fake screen
      await screenShareButton(sharer!, 'Start screen share').click();

      await expect(
        screenShareButton(sharer!, 'Stop screen share')
      ).toBeVisible();
      await expect.poll(() => liveVideoCount(sharer!)).toBeGreaterThan(0);
      await expect.poll(() => liveVideoCount(viewer!)).toBeGreaterThan(0);

      await screenShareButton(sharer!, 'Stop screen share').click();

      await expect(
        screenShareButton(sharer!, 'Start screen share')
      ).toBeVisible();
      await expect.poll(() => liveVideoCount(viewer!)).toBe(0);
      await expect.poll(() => liveVideoCount(sharer!)).toBe(0);

      await leaveCall(sharer!, FIRST.id);
      await leaveCall(viewer!, SECOND.id);
    }
  );
});

// a public channel lets everyone share, so only the server permission stops this member from
// starting a share that the server would refuse after the whole call had heard it begin
test('a member without the screen share permission is not offered a screen share', async ({
  browser
}) => {
  await withClients(browser, [NO_SHARE.identity], async ([member]) => {
    await joinCall(member!);

    await expect(
      screenShareButton(member!, 'Start screen share')
    ).toBeDisabled();

    // the call's own bar only shows on hover, which keeps it out of the accessibility tree
    await expect(
      member!
        .getByTestId(TestId.VOICE_STAGE)
        .getByRole('button', { name: 'Share Screen', includeHidden: true })
    ).toBeDisabled();

    await leaveCall(member!, NO_SHARE.id);
  });
});
