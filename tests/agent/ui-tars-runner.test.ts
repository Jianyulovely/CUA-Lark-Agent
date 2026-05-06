import { describe, expect, test } from 'vitest';
import {
  createUITarsRunner,
  type GuiAgentConstructor,
  type OperatorConstructor
} from '../../src/agent/ui-tars-runner.js';

describe('createUITarsRunner', () => {
  test('constructs a UI-TARS GUIAgent with model config and NutJS operator', async () => {
    const createdAgents: Array<{
      config: unknown;
      instructions: string[];
    }> = [];

    class FakeOperator {}

    class FakeGUIAgent {
      public readonly instructions: string[] = [];

      constructor(public readonly config: unknown) {
        createdAgents.push({
          config,
          instructions: this.instructions
        });
      }

      async run(instruction: string): Promise<void> {
        this.instructions.push(instruction);
      }
    }

    const runner = createUITarsRunner(
      {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-example',
        apiKey: 'secret'
      },
      {
        GUIAgentClass: FakeGUIAgent as GuiAgentConstructor,
        OperatorClass: FakeOperator as OperatorConstructor
      }
    );

    await runner.run('打开飞书');

    expect(createdAgents).toHaveLength(1);
    expect(createdAgents[0]?.instructions).toEqual(['打开飞书']);
    expect(createdAgents[0]?.config).toMatchObject({
      model: {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-example',
        apiKey: 'secret'
      },
      maxLoopCount: 8
    });
  });

  test('forwards UI-TARS data events to the provided callback', () => {
    let captured: unknown;

    class FakeOperator {}

    class FakeGUIAgent {
      constructor(config: { onData?: (params: { data: unknown }) => void }) {
        config.onData?.({ data: { status: 'RUNNING' } });
      }

      async run(): Promise<void> {}
    }

    createUITarsRunner(
      {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-example',
        apiKey: 'secret'
      },
      {
        GUIAgentClass: FakeGUIAgent as GuiAgentConstructor,
        OperatorClass: FakeOperator as OperatorConstructor,
        onData: (data) => {
          captured = data;
        }
      }
    );

    expect(captured).toEqual({ status: 'RUNNING' });
  });
});

