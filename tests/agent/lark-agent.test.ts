import { describe, expect, test } from 'vitest';
import { LarkAgent } from '../../src/agent/lark-agent.js';

describe('LarkAgent', () => {
  test('passes the test instruction to the injected GUI runner', async () => {
    const calls: string[] = [];
    const agent = new LarkAgent<{ status: string }>({
      run: async (instruction: string) => {
        calls.push(instruction);
        return { status: 'END' };
      }
    });

    const result = await agent.runInstruction('发送测试消息');

    expect(calls).toEqual(['发送测试消息']);
    expect(result.status).toBe('END');
  });
});
