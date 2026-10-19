import { expect, loginAs, test } from './fixtures';
import {
  categoryItem,
  createCategoryWithChannel,
  deleteCategory
} from './helpers/categories';

// channel names cap at 27 characters, so the run marker is short enough to fit inside one
const RUN_ID = Date.now().toString().slice(-8);

const CATEGORY = `Doomed Category ${RUN_ID}`;
const CHANNEL = `doomed-channel-${RUN_ID}`;

// categories.test.ts covers the server side: the channels are announced and any call in them
// is dropped. what only a browser shows is the other client's sidebar reacting to those
// events, which is the half that would silently need a reload if a subscription were missed
test('deleting a category removes it and its channels from every client', async ({
  browser
}) => {
  const ownerContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  try {
    const owner = await ownerContext.newPage();
    const watcher = await watcherContext.newPage();

    await loginAs(owner, 'testowner', 'password123');
    await loginAs(watcher, 'testuser', 'password123');

    await createCategoryWithChannel(owner, CATEGORY, CHANNEL);

    // the watcher learns about both through a subscription, which under a full parallel run
    // can take longer than the default expect timeout allows
    await expect(categoryItem(watcher, CATEGORY)).toBeVisible({
      timeout: 15_000
    });
    await expect(watcher.getByText(CHANNEL)).toBeVisible({ timeout: 15_000 });

    await deleteCategory(owner, CATEGORY);

    for (const page of [owner, watcher]) {
      await expect(categoryItem(page, CATEGORY)).toHaveCount(0, {
        timeout: 15_000
      });
      await expect(page.getByText(CHANNEL)).toHaveCount(0, { timeout: 15_000 });
    }
  } finally {
    await ownerContext.close().catch(() => {});
    await watcherContext.close().catch(() => {});
  }
});
