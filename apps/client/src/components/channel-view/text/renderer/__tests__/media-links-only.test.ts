import { describe, expect, test } from 'bun:test';
import { isMediaLinksOnly } from '../helpers';
import type { TFoundMedia } from '../types';

const GIF_URL = 'https://static.klipy.com/ii/abc/DNk3YHhb.gif';

const gif: TFoundMedia = {
  key: 'metadata:image:gif',
  type: 'image',
  url: GIF_URL
};

const link = (href: string) => `<a href="${href}" target="_blank">${href}</a>`;

describe('isMediaLinksOnly', () => {
  test('should hide a message that is only a link to the media it shows', () => {
    expect(isMediaLinksOnly(`<p>${link(GIF_URL)}</p>`, [gif])).toBe(true);
  });

  test('should match the link even with a different hash', () => {
    expect(isMediaLinksOnly(`<p>${link(`${GIF_URL}#top`)}</p>`, [gif])).toBe(
      true
    );
  });

  test('should keep a message with words next to the link', () => {
    expect(
      isMediaLinksOnly(`<p>happy monday ${link(GIF_URL)}</p>`, [gif])
    ).toBe(false);
  });

  test('should keep a link that is not shown as media', () => {
    expect(
      isMediaLinksOnly(`<p>${link('https://example.com/page')}</p>`, [gif])
    ).toBe(false);
  });

  test('should keep a link while its media has not loaded yet', () => {
    expect(isMediaLinksOnly(`<p>${link(GIF_URL)}</p>`, [])).toBe(false);
  });

  test('should keep a message with a custom emoji next to the link', () => {
    expect(
      isMediaLinksOnly(
        `<p>${link(GIF_URL)} <img src="/emoji/party.png" alt=":party:"></p>`,
        [gif]
      )
    ).toBe(false);
  });

  test('should hide several media links on their own lines', () => {
    const second: TFoundMedia = {
      key: 'metadata:image:second',
      type: 'image',
      url: 'https://example.com/b.png'
    };

    expect(
      isMediaLinksOnly(
        `<p>${link(GIF_URL)}</p><p>${link('https://example.com/b.png')}</p>`,
        [gif, second]
      )
    ).toBe(true);
  });
});
