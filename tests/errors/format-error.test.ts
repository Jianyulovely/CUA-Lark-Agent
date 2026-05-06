import { describe, expect, test } from 'vitest';
import { formatErrorMessage } from '../../src/errors/format-error.js';

describe('formatErrorMessage', () => {
  test('uses an Error message', () => {
    expect(formatErrorMessage(new Error('desktop denied'))).toBe('desktop denied');
  });

  test('uses message from plain error objects', () => {
    expect(formatErrorMessage({ message: 'Request timed out.' })).toBe('Request timed out.');
  });

  test('includes Error cause messages when available', () => {
    expect(formatErrorMessage(new Error('fetch failed', { cause: new Error('socket closed') }))).toBe(
      'fetch failed: socket closed'
    );
  });
});
