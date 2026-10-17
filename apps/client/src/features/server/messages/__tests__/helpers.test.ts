import { describe, expect, test } from 'bun:test';
import { shouldSendMessageNotification } from '../helpers';

const rules = {
  isDm: false,
  isMentioned: false,
  isReplyToOwnMessage: false,
  allMessages: false,
  mentionsOnly: false,
  dms: false,
  replies: false
};

describe('shouldSendMessageNotification', () => {
  test('should not notify when every toggle is off', () => {
    expect(
      shouldSendMessageNotification({
        ...rules,
        isDm: true,
        isMentioned: true,
        isReplyToOwnMessage: true
      })
    ).toBe(false);
  });

  test('should notify for a plain channel message with all messages on', () => {
    expect(shouldSendMessageNotification({ ...rules, allMessages: true })).toBe(
      true
    );
  });

  test('should still notify for every message when mentions only is on too', () => {
    expect(
      shouldSendMessageNotification({
        ...rules,
        allMessages: true,
        mentionsOnly: true
      })
    ).toBe(true);
  });

  test('should notify for a mention only when mentions only is on', () => {
    expect(
      shouldSendMessageNotification({ ...rules, mentionsOnly: true })
    ).toBe(false);
    expect(
      shouldSendMessageNotification({
        ...rules,
        mentionsOnly: true,
        isMentioned: true
      })
    ).toBe(true);
  });

  test('should notify for a reply to an own message alongside mentions only', () => {
    expect(
      shouldSendMessageNotification({
        ...rules,
        mentionsOnly: true,
        replies: true,
        isReplyToOwnMessage: true
      })
    ).toBe(true);
  });

  test('should notify for a direct message only when dms are on', () => {
    expect(shouldSendMessageNotification({ ...rules, dms: true })).toBe(false);
    expect(
      shouldSendMessageNotification({ ...rules, dms: true, isDm: true })
    ).toBe(true);
  });
});
