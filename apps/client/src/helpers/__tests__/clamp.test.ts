import { describe, expect, test } from 'bun:test';
import { clamp } from '../clamp';

describe('clamp', () => {
  test('should keep a value that is already in range', () => {
    expect(clamp(250, 160, 600)).toBe(250);
  });

  test('should raise a value below the minimum to it', () => {
    expect(clamp(120, 160, 600)).toBe(160);
  });

  test('should lower a value above the maximum to it', () => {
    expect(clamp(900, 160, 600)).toBe(600);
  });
});
