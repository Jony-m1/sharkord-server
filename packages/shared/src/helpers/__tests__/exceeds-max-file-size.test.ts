import { describe, expect, test } from 'bun:test';
import { STORAGE_UNLIMITED_FILE_SIZE } from '../../statics/storage';
import { exceedsMaxFileSize } from '../exceeds-max-file-size';

describe('exceedsMaxFileSize', () => {
  test('should allow a file up to the limit', () => {
    expect(exceedsMaxFileSize(100, 100)).toBe(false);
    expect(exceedsMaxFileSize(99, 100)).toBe(false);
  });

  test('should reject a file over the limit', () => {
    expect(exceedsMaxFileSize(101, 100)).toBe(true);
  });

  test('should allow any size when the limit is unlimited', () => {
    expect(
      exceedsMaxFileSize(10 * 1024 ** 4, STORAGE_UNLIMITED_FILE_SIZE)
    ).toBe(false);
  });
});
