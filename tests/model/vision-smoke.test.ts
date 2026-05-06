import { describe, expect, test } from 'vitest';
import {
  buildVisionSmokeRequest,
  runVisionSmokeTest,
  VisionSmokeError
} from '../../src/model/vision-smoke.js';

describe('buildVisionSmokeRequest', () => {
  test('builds an OpenAI-compatible multimodal chat completions request', () => {
    const request = buildVisionSmokeRequest({
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3/',
      model: 'ep-example',
      apiKey: 'secret'
    });

    expect(request.url).toBe('https://ark.cn-beijing.volces.com/api/v3/chat/completions');
    expect(request.init.method).toBe('POST');
    expect(request.init.headers).toMatchObject({
      Authorization: 'Bearer secret',
      'Content-Type': 'application/json'
    });
    expect(JSON.parse(String(request.init.body))).toMatchObject({
      model: 'ep-example',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text' },
            {
              type: 'image_url',
              image_url: {
                url: expect.stringContaining('data:image/png;base64,')
              }
            }
          ]
        }
      ]
    });
  });
});

describe('runVisionSmokeTest', () => {
  test('returns assistant text when the endpoint accepts image input', async () => {
    const result = await runVisionSmokeTest(
      {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-example',
        apiKey: 'secret'
      },
      {
        fetcher: async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'The image contains a blue square.' } }]
            }),
            { status: 200 }
          )
      }
    );

    expect(result.ok).toBe(true);
    expect(result.responseText).toContain('blue square');
  });

  test('redacts api keys from endpoint errors', async () => {
    await expect(
      runVisionSmokeTest(
        {
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          model: 'ep-example',
          apiKey: 'secret'
        },
        {
          fetcher: async () =>
            new Response('bad key secret rejected', {
              status: 401,
              statusText: 'Unauthorized'
            })
        }
      )
    ).rejects.toThrow(VisionSmokeError);

    await expect(
      runVisionSmokeTest(
        {
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          model: 'ep-example',
          apiKey: 'secret'
        },
        {
          fetcher: async () =>
            new Response('bad key secret rejected', {
              status: 401,
              statusText: 'Unauthorized'
            })
        }
      )
    ).rejects.not.toThrow('secret');
  });
});

