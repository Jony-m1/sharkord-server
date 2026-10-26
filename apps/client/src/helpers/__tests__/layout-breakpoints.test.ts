import { installBrowserStub, setViewport } from '@/__tests__/browser-stub';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { isPhoneLayout } from '../is-phone-layout';
import { isWideLayout } from '../is-wide-layout';

let uninstallBrowserStub: () => void;

beforeAll(() => {
  uninstallBrowserStub = installBrowserStub();
});

afterAll(() => {
  uninstallBrowserStub();
});

describe('layout breakpoints', () => {
  test('should be a phone below md', () => {
    setViewport({ width: 767, defaultFontSize: 16 });

    expect(isPhoneLayout()).toBe(true);

    setViewport({ width: 768 });

    expect(isPhoneLayout()).toBe(false);
  });

  test('should be wide from lg up', () => {
    setViewport({ width: 1023, defaultFontSize: 16 });

    expect(isWideLayout()).toBe(false);

    setViewport({ width: 1024 });

    expect(isWideLayout()).toBe(true);
  });

  // tailwind's breakpoints are rem, which a media query reads against the browser's default
  // font size: at 20px md starts at 960px and lg at 1280px, and px queries split from the css
  test('should agree with the css when the default font size is larger', () => {
    setViewport({ width: 1100, defaultFontSize: 20 });

    expect(isWideLayout()).toBe(false);
    expect(isPhoneLayout()).toBe(false);

    setViewport({ width: 900 });

    expect(isPhoneLayout()).toBe(true);
  });
});
