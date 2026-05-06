import { describe, expect, test } from 'vitest';
import { loadEnvConfig } from '../../src/config/env.js';

describe('loadEnvConfig', () => {
  test('loads required model configuration from environment values', () => {
    const config = loadEnvConfig({
      CUA_LARK_MODEL_BASE_URL: 'https://ark.cn-beijing.volces.com/api/v3',
      CUA_LARK_MODEL: 'ep-example',
      CUA_LARK_MODEL_API_KEY: 'secret'
    });

    expect(config.model.baseURL).toBe('https://ark.cn-beijing.volces.com/api/v3');
    expect(config.model.model).toBe('ep-example');
    expect(config.model.apiKey).toBe('secret');
  });

  test('throws a readable error when required model configuration is missing', () => {
    expect(() => loadEnvConfig({})).toThrow('Missing required environment variable');
  });
});

