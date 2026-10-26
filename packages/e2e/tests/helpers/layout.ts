import type { Locator } from '@playwright/test';

// the box a layout assertion measures; an element that is not rendered has none, which fails
// the test here rather than as a null deep inside the arithmetic
const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error('the element has no box to measure');
  }

  return box;
};

export { boxOf };
