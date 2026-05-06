import { Jimp } from 'jimp';
import type { ModelConfig } from '../model/vision-smoke.js';
import type {
  MessageVerificationInput,
  MessageVerificationResult,
  MessageVerifier
} from './message-verifier.js';

export interface VisionMessageVerifierOptions {
  fetcher?: typeof fetch;
  maxWidth?: number;
  timeoutMs?: number;
}

export class VisionMessageVerifier implements MessageVerifier {
  private readonly fetcher: typeof fetch;
  private readonly maxWidth: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly model: ModelConfig,
    options: VisionMessageVerifierOptions = {}
  ) {
    this.fetcher = options.fetcher ?? fetch;
    this.maxWidth = options.maxWidth ?? 1280;
    this.timeoutMs = options.timeoutMs ?? 90_000;
  }

  async verify(input: MessageVerificationInput): Promise<MessageVerificationResult> {
    const screenshotBase64 = await resizePngBase64(input.screenshotBase64, this.maxWidth);
    const responseText = await this.fetchWithTimeout(`${trimSlash(this.model.baseURL)}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.model.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'You are verifying a Feishu/Lark IM smoke test from a screenshot.',
                  `Target message: ${input.message}`,
                  'Answer in strict JSON only: {"passed":true|false,"reason":"short reason"}.',
                  'Set passed=true only if the exact target message is visible in the conversation.'
                ].join('\n')
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${screenshotBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 128,
        temperature: 0
      })
    });

    return parseVerificationResponse(responseText);
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new Error(`Verification request timed out after ${this.timeoutMs}ms.`));
    }, this.timeoutMs);

    try {
      const response = await this.fetcher(url, {
        ...init,
        signal: controller.signal
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Verification request failed: HTTP ${response.status} ${response.statusText}`);
      }
      return responseText;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`Verification request timed out after ${this.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function resizePngBase64(base64: string, maxWidth: number): Promise<string> {
  const image = await Jimp.fromBuffer(Buffer.from(stripBase64Prefix(base64), 'base64'));
  if (image.bitmap.width <= maxWidth) {
    return stripBase64Prefix(base64);
  }

  const resized = await image.resize({ w: maxWidth }).getBuffer('image/png');
  return resized.toString('base64');
}

function parseVerificationResponse(responseText: string): MessageVerificationResult {
  const assistantText = extractAssistantText(responseText);
  const jsonText = assistantText.match(/\{[\s\S]*\}/)?.[0] ?? assistantText;

  try {
    const parsed = JSON.parse(jsonText) as { passed?: unknown; reason?: unknown };
    return {
      passed: parsed.passed === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : assistantText,
      rawResponse: assistantText
    };
  } catch {
    return {
      passed: false,
      reason: `Verifier returned non-JSON response: ${assistantText}`,
      rawResponse: assistantText
    };
  }
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

function stripBase64Prefix(value: string): string {
  return value.replace(/^data:image\/\w+;base64,/, '');
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
