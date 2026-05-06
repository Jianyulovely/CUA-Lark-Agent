import { describe, expect, test } from 'vitest';
import { parseTestCase } from '../../src/cases/schema.js';

describe('parseTestCase', () => {
  test('accepts a valid IM test case', () => {
    const testCase = parseTestCase({
      id: 'im-send-message-001',
      product: 'im',
      instruction: '发送测试消息',
      expected: '会话中出现测试消息'
    });

    expect(testCase.product).toBe('im');
  });

  test('rejects unsupported product values', () => {
    expect(() =>
      parseTestCase({
        id: 'bad-case',
        product: 'unknown',
        instruction: 'noop',
        expected: 'noop'
      })
    ).toThrow();
  });
});

