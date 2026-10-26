import { expect, type Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';

const dmItem = (page: Page, name: string) =>
  page.getByTestId(TestId.DM_ITEM).filter({ hasText: name });

const openDmPanel = async (page: Page) => {
  await page.getByTestId(TestId.DM_TOGGLE).click();
};

// from the member list, the way a user starts a conversation with someone
const startDmWith = async (page: Page, name: string) => {
  await page.getByTestId(TestId.MEMBER_ITEM).filter({ hasText: name }).click();
  await page.getByTestId(TestId.USER_POPOVER_DM).click();

  // the card closes itself once the dm is open. it hands focus back to the member list as it
  // goes, so nothing is typed before it is gone
  await expect(page.getByTestId(TestId.USER_POPOVER_DM)).toBeHidden();
};

export { dmItem, openDmPanel, startDmWith };
