import { UITarsModel, type UITarsModelConfig } from '@ui-tars/sdk/core';
import { UITarsModelVersion } from '@ui-tars/sdk';

export interface ExtendedTimeoutUITarsModelOptions {
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export class ExtendedTimeoutUITarsModel extends UITarsModel {
  private readonly requestTimeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor(modelConfig: UITarsModelConfig, options: ExtendedTimeoutUITarsModelOptions = {}) {
    super(modelConfig);
    this.requestTimeoutMs = options.timeoutMs ?? 120_000;
    this.fetcher = options.fetcher ?? fetch;
  }

  protected override async invokeModelProvider(
    uiTarsVersion: UITarsModelVersion | undefined = UITarsModelVersion.V1_0,
    params: { messages: unknown[]; previousResponseId?: string },
    options: { signal?: AbortSignal },
    headers?: Record<string, string>
  ): Promise<{
    prediction: string;
    costTime?: number;
    costTokens?: number;
    responseId?: string;
  }> {
    if (this.useResponsesApi) {
      return super.invokeModelProvider(uiTarsVersion, params as never, options, headers);
    }

    const {
      baseURL,
      apiKey,
      model,
      max_tokens = uiTarsVersion === UITarsModelVersion.V1_5 ? 65_535 : 1_000,
      temperature = 0,
      top_p = 0.7
    } = this.modelConfig;
    const startTime = Date.now();
    const response = await this.fetchWithTimeout(
      `${String(baseURL).replace(/\/+$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          model,
          messages: params.messages,
          stream: false,
          seed: null,
          stop: null,
          frequency_penalty: null,
          presence_penalty: null,
          max_tokens,
          temperature,
          top_p,
          thinking: {
            type: 'disabled'
          }
        })
      },
      options.signal
    );

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Model request failed: HTTP ${response.status} ${response.statusText} ${responseText}`
      );
    }

    const parsed = JSON.parse(responseText) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      usage?: { total_tokens?: number };
    };

    return {
      prediction: stringOrEmpty(parsed.choices?.[0]?.message?.content),
      costTime: Date.now() - startTime,
      costTokens: parsed.usage?.total_tokens ?? 0
    };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new Error(`Model request timed out after ${this.requestTimeoutMs}ms.`));
    }, this.requestTimeoutMs);
    const abortFromExternalSignal = () => controller.abort(externalSignal?.reason);

    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });

    try {
      return await this.fetcher(url, {
        ...init,
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted && !externalSignal?.aborted) {
        throw new Error(`Model request timed out after ${this.requestTimeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromExternalSignal);
    }
  }
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
