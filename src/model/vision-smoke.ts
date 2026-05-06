import type { EnvConfig } from '../config/env.js';

const BLUE_SQUARE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAdSURBVDhPY5Cb8P8/JZgBXYBUPGrAqAGjBgwWAwAsZKwfgyie3AAAAABJRU5ErkJggg==';

export interface ModelConfig {
  baseURL: string;
  model: string;
  apiKey: string;
  timeout?: number;
}

export interface VisionSmokeRequest {
  url: string;
  init: RequestInit;
}

export interface VisionSmokeResult {
  ok: true;
  responseText: string;
}

export interface VisionSmokeOptions {
  fetcher?: typeof fetch;
}

export class VisionSmokeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VisionSmokeError';
  }
}

export function buildVisionSmokeRequest(config: ModelConfig): VisionSmokeRequest {
  const baseURL = config.baseURL.replace(/\/+$/, '');
  const body = {
    model: config.model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'This is a vision smoke test. Briefly describe the image.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${BLUE_SQUARE_PNG_BASE64}`
            }
          }
        ]
      }
    ],
    max_tokens: 64
  };

  return {
    url: `${baseURL}/chat/completions`,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  };
}

export async function runVisionSmokeTest(
  config: ModelConfig | EnvConfig['model'],
  options: VisionSmokeOptions = {}
): Promise<VisionSmokeResult> {
  const fetcher = options.fetcher ?? fetch;
  const request = buildVisionSmokeRequest(config);
  const response = await fetcher(request.url, request.init);
  const responseText = await response.text();

  if (!response.ok) {
    throw new VisionSmokeError(
      `Vision smoke test failed: HTTP ${response.status} ${response.statusText} ${redactSecret(
        responseText,
        config.apiKey
      )}`
    );
  }

  return {
    ok: true,
    responseText: extractAssistantText(responseText)
  };
}

function extractAssistantText(responseText: string): string {
  try {
    const parsed = JSON.parse(responseText) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
  } catch {
    return responseText;
  }

  return responseText;
}

function redactSecret(text: string, secret: string): string {
  if (!secret) {
    return text;
  }
  return text.split(secret).join('[REDACTED]');
}
