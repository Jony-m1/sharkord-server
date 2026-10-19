import { expect, type Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { confirmDialog } from './dialogs';

const categoryItem = (page: Page, name: string) =>
  page.getByTestId(TestId.CATEGORY_ITEM).filter({ hasText: name });

const submitDialog = async (page: Page, value: string) => {
  // waiting for the dialog rather than for its textbox: a dropdown item clicked mid animation
  // can be missed entirely, and then the failure points at the input instead of the click
  const dialog = page.getByRole('dialog');

  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill(value);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
};

// a spec builds and removes its own category, so it touches nothing the rest of the suite
// reads and survives a retry. a seeded one would be gone on the second attempt
const createCategoryWithChannel = async (
  page: Page,
  category: string,
  channel: string
) => {
  await page.getByTestId(TestId.SERVER_MENU_TRIGGER).click();

  const addCategory = page.getByTestId(TestId.SERVER_MENU_ADD_CATEGORY);

  await expect(addCategory).toBeVisible();
  await addCategory.click();
  await submitDialog(page, category);

  await expect(categoryItem(page, category)).toBeVisible();

  await categoryItem(page, category)
    .getByTestId(TestId.CATEGORY_ADD_CHANNEL)
    .click();
  await submitDialog(page, channel);

  // a rejected name leaves the dialog open and the category empty, which would otherwise
  // surface as the watcher never seeing a category that was never worth seeing
  await expect(page.getByText(channel)).toBeVisible();
};

const deleteCategory = async (page: Page, name: string) => {
  // the context menu wraps the name, not the whole row: the row's padding and its + button
  // are outside the trigger
  await categoryItem(page, name).getByText(name).click({ button: 'right' });
  await page.getByTestId(TestId.CATEGORY_MENU_DELETE).click();
  await confirmDialog(page);
};

export { categoryItem, createCategoryWithChannel, deleteCategory };
