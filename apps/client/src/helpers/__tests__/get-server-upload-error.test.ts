import { describe, expect, test } from 'bun:test';
import { getServerUploadError } from '../get-server-upload-error';

describe('getServerUploadError', () => {
  test('should read the message the server sends', () => {
    expect(
      getServerUploadError(
        JSON.stringify({ error: 'File uploads are disabled' })
      )
    ).toBe('File uploads are disabled');
  });

  // what cloudflare or nginx sends for a body over their limit
  test('should ignore an html error page from a proxy', () => {
    expect(
      getServerUploadError(
        '<html><body>413 Request Entity Too Large</body></html>'
      )
    ).toBeUndefined();
  });

  test('should ignore an empty response', () => {
    expect(getServerUploadError('')).toBeUndefined();
  });

  test('should ignore json without a message', () => {
    expect(getServerUploadError(JSON.stringify({ error: '' }))).toBeUndefined();
    expect(getServerUploadError('null')).toBeUndefined();
  });
});
