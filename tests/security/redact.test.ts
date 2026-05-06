import { describe, expect, test } from 'vitest';
import { redactForLog } from '../../src/security/redact.js';

describe('redactForLog', () => {
  test('redacts configured secrets from nested log values', () => {
    const redacted = redactForLog(
      {
        apiKey: 'secret',
        nested: ['prefix-secret-suffix']
      },
      ['secret']
    );

    expect(redacted).toEqual({
      apiKey: '[REDACTED]',
      nested: ['prefix-[REDACTED]-suffix']
    });
  });

  test('omits screenshot base64 payloads from logs', () => {
    const redacted = redactForLog({
      screenshotBase64: 'abc123',
      keep: 'value'
    });

    expect(redacted).toEqual({
      screenshotBase64: '[BASE64_OMITTED length=6]',
      keep: 'value'
    });
  });

  test('preserves redacted Error details for diagnostics', () => {
    const error = new Error('failed with secret');
    const redacted = redactForLog(error, ['secret']);

    expect(redacted).toMatchObject({
      name: 'Error',
      message: 'failed with [REDACTED]'
    });
    expect(JSON.stringify(redacted)).not.toContain('secret');
  });
});
