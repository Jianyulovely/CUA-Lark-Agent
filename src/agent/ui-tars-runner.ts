import { GUIAgent } from '@ui-tars/sdk';
import type { GUIAgentData } from '@ui-tars/sdk';
import { NutJSOperator } from '@ui-tars/operator-nut-js';
import type { ModelConfig } from '../model/vision-smoke.js';
import type { GuiRunner } from './lark-agent.js';

export interface OperatorConstructor {
  new (): unknown;
}

export interface GuiAgentConstructor {
  new (config: {
    model: ModelConfig;
    operator: unknown;
    maxLoopCount: number;
    onData?: (params: { data: unknown }) => void;
    onError?: (params: { data: unknown; error: unknown }) => void;
  }): {
    run(instruction: string): Promise<void>;
  };
}

export interface UITarsRunnerOptions {
  GUIAgentClass?: GuiAgentConstructor;
  OperatorClass?: OperatorConstructor;
  maxLoopCount?: number;
  onData?: (data: unknown) => void;
  onError?: (data: unknown, error: unknown) => void;
}

export function createUITarsRunner(
  model: ModelConfig,
  options: UITarsRunnerOptions = {}
): GuiRunner<void> {
  const GUIAgentClass = options.GUIAgentClass ?? (GUIAgent as unknown as GuiAgentConstructor);
  const OperatorClass = options.OperatorClass ?? NutJSOperator;
  const operator = new OperatorClass();
  const agent = new GUIAgentClass({
    model,
    operator,
    maxLoopCount: options.maxLoopCount ?? 8,
    onData: ({ data }) => {
      options.onData?.(data);
    },
    onError: ({ data, error }) => {
      options.onError?.(data, error);
    }
  });

  return {
    run: (instruction: string) => agent.run(instruction)
  };
}

export function summarizeGUIAgentData(data: unknown): string {
  const typedData = data as Partial<GUIAgentData> | undefined;
  const status = typedData?.status ? `status=${typedData.status}` : 'status=unknown';
  const conversations = typedData?.conversations?.length ?? 0;

  return `${status} conversations=${conversations}`;
}

