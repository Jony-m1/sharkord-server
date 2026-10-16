import {
  formatCallDuration,
  formatTotalDuration
} from '@/helpers/format-duration';
import { describe, expect, it } from 'bun:test';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe('formatCallDuration', () => {
  it('should show seconds only under a minute', () => {
    expect(formatCallDuration(0)).toBe('0s');
    expect(formatCallDuration(45 * SECOND + 900)).toBe('45s');
  });

  it('should add minutes from the first minute', () => {
    expect(formatCallDuration(MINUTE)).toBe('1m 00s');
    expect(formatCallDuration(22 * MINUTE + 5 * SECOND)).toBe('22m 05s');
  });

  it('should add hours from the first hour', () => {
    expect(formatCallDuration(HOUR + 2 * MINUTE + 5 * SECOND)).toBe(
      '1h 02m 05s'
    );
  });

  it('should never go below zero', () => {
    expect(formatCallDuration(-5 * SECOND)).toBe('0s');
  });
});

describe('formatTotalDuration', () => {
  it('should show minutes under an hour', () => {
    expect(formatTotalDuration(59 * SECOND)).toBe('0m');
    expect(formatTotalDuration(12 * MINUTE)).toBe('12m');
  });

  it('should add hours and then days', () => {
    expect(formatTotalDuration(4 * HOUR + 12 * MINUTE)).toBe('4h 12m');
    expect(formatTotalDuration(3 * 24 * HOUR + 4 * HOUR + 12 * MINUTE)).toBe(
      '3d 4h 12m'
    );
  });
});
