import { describe, expect, test } from 'vitest';
import { UITarsModelVersion } from '@ui-tars/sdk';
import { ExtendedTimeoutUITarsModel } from '../../src/model/extended-timeout-ui-tars-model.js';

class ExposedModel extends ExtendedTimeoutUITarsModel {
  callProvider(params: { messages: unknown[] }) {
    return this.invokeModelProvider(UITarsModelVersion.V1_0, params, {});
  }
}

describe('ExtendedTimeoutUITarsModel', () => {
  test('calls the OpenAI-compatible chat completions endpoint', async () => {
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const model = new ExposedModel(
      {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-example',
        apiKey: 'secret'
      },
      {
        fetcher: async (url, init) => {
          capturedUrl = url;
          capturedInit = init;
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: 'Thought: done\nAction: finished()' } }],
              usage: { total_tokens: 7 }
            }),
            { status: 200, statusText: 'OK' }
          );
        }
      }
    );

    const result = await model.callProvider({ messages: [{ role: 'user', content: 'task' }] });

    expect(capturedUrl).toBe('https://ark.cn-beijing.volces.com/api/v3/chat/completions');
    expect(JSON.parse(String(capturedInit?.body))).toMatchObject({
      model: 'ep-example',
      messages: [{ role: 'user', content: 'task' }],
      stream: false,
      thinking: { type: 'disabled' }
    });
    expect(result.prediction).toBe('Thought: done\nAction: finished()');
    expect(result.costTokens).toBe(7);
  });

  test('uses the configured request timeout instead of the SDK default', async () => {
    const model = new ExposedModel(
      {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-example',
        apiKey: 'secret'
      },
      {
        timeoutMs: 1,
        fetcher: (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(init.signal?.reason);
            });
          })
      }
    );

    await expect(model.callProvider({ messages: [] })).rejects.toThrow(
      'Model request timed out after 1ms.'
    );
  });
});
