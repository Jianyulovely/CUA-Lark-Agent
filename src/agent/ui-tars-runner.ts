import { GUIAgent } from '@ui-tars/sdk';
import type { GUIAgentData } from '@ui-tars/sdk';
import { NutJSOperator } from '@ui-tars/operator-nut-js';
import type { ModelConfig } from '../model/vision-smoke.js';
import { ExtendedTimeoutUITarsModel } from '../model/extended-timeout-ui-tars-model.js';
import { redactForLog } from '../security/redact.js';
import type { GuiRunner } from './lark-agent.js';

export interface OperatorConstructor {
  new (): unknown;
}

export interface GuiAgentConstructor {
  new (config: {
    model: unknown;
    operator: unknown;
    maxLoopCount: number;
    onData?: (params: { data: unknown }) => void;
    onError?: (params: { data: unknown; error: unknown }) => void;
    logger?: RedactableLogger;
  }): {
    run(instruction: string): Promise<void>;
  };
}

export interface RedactableLogger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
}

export interface UITarsRunnerOptions {
  GUIAgentClass?: GuiAgentConstructor;
  OperatorClass?: OperatorConstructor;
  maxLoopCount?: number;
  onData?: (data: unknown) => void;
  onError?: (data: unknown, error: unknown) => void;
  logger?: RedactableLogger;
  modelTimeoutMs?: number;
}

export function createUITarsRunner(
  model: ModelConfig,
  options: UITarsRunnerOptions = {}
): GuiRunner<void> {
  const GUIAgentClass = options.GUIAgentClass ?? (GUIAgent as unknown as GuiAgentConstructor);
  const OperatorClass = options.OperatorClass ?? NutJSOperator;
  const operator = new OperatorClass();
  const modelClient = new ExtendedTimeoutUITarsModel(model, {
    timeoutMs: options.modelTimeoutMs ?? 120_000
  });
  let lastErrorMessage: string | undefined;
  const agent = new GUIAgentClass({
    model: modelClient,
    operator,
    maxLoopCount: options.maxLoopCount ?? 8,
    onData: ({ data }) => {
      const sanitizedData = redactForLog(data, [model.apiKey]);
      lastErrorMessage = getGUIAgentErrorMessage(sanitizedData) ?? lastErrorMessage;
      options.onData?.(sanitizedData);
    },
    onError: ({ data, error }) => {
      options.onError?.(redactForLog(data, [model.apiKey]), redactForLog(error, [model.apiKey]));
    },
    logger: createRedactingLogger(options.logger ?? console, [model.apiKey])
  });

  return {
    run: async (instruction: string) => {
      lastErrorMessage = undefined;
      await agent.run(instruction);

      if (lastErrorMessage) {
        throw new Error(lastErrorMessage);
      }
    }
  };
}

export function summarizeGUIAgentData(data: unknown): string {
  const typedData = data as Partial<GUIAgentData> | undefined;
  const status = typedData?.status ? `status=${typedData.status}` : 'status=unknown';
  const conversations = typedData?.conversations?.length ?? 0;

  return `${status} conversations=${conversations}`;
}

function createRedactingLogger(logger: RedactableLogger, secrets: string[]): RedactableLogger {
  return {
    log: (...args: unknown[]) => logger.log(...redactArgs(args, secrets)),
    error: (...args: unknown[]) => logger.error(...redactArgs(args, secrets)),
    warn: (...args: unknown[]) => logger.warn(...redactArgs(args, secrets)),
    info: (...args: unknown[]) => logger.info(...redactArgs(args, secrets))
  };
}

function redactArgs(args: unknown[], secrets: string[]): unknown[] {
  return args.map((arg) => redactForLog(arg, secrets));
}

function getGUIAgentErrorMessage(data: unknown): string | undefined {
  const typedData = data as { status?: string; error?: { message?: unknown } } | undefined;
  if (typedData?.status !== 'error') {
    return undefined;
  }

  if (typeof typedData.error?.message === 'string') {
    return typedData.error.message;
  }

  return 'UI-TARS finished with error status.';
}

