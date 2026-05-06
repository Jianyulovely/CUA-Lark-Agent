# CUA-Lark MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable CUA-Lark MVP loop: load one IM test case, run it through a UI-TARS-backed agent, verify the result, and generate a report.

**Architecture:** A TypeScript CLI coordinates small modules for configuration, case loading, agent execution, verification, and reporting. UI-TARS remains the GUI execution dependency while CUA-Lark owns Feishu testing semantics and evaluation artifacts.

**Tech Stack:** TypeScript, Node.js, Vitest, `@ui-tars/sdk`, `@ui-tars/operator-nut-js`, dotenv, zod.

---

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Create package metadata and scripts**

Create `package.json`:

```json
{
  "name": "cua-lark-agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@ui-tars/operator-nut-js": "^1.2.0-beta.17",
    "@ui-tars/sdk": "^1.2.0-beta.17",
    "dotenv": "^16.4.7",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^3.0.2"
  }
}
```

- [ ] **Step 2: Create TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
```

- [ ] **Step 4: Create a placeholder CLI entry**

Create `src/index.ts`:

```ts
console.log('CUA-Lark-Agent MVP bootstrap');
```

- [ ] **Step 5: Install dependencies**

Run: `pnpm install`

Expected: a lockfile is created and dependencies install without errors.

- [ ] **Step 6: Verify baseline scripts**

Run: `pnpm test`

Expected: Vitest exits successfully with no tests found or a clean pass.

Run: `pnpm typecheck`

Expected: TypeScript exits with code 0.

### Task 2: Configuration Loader

**Files:**
- Create: `src/config/env.ts`
- Test: `tests/config/env.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/config/env.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/config/env.test.ts`

Expected: FAIL because `src/config/env.ts` does not exist.

- [ ] **Step 3: Implement configuration loader**

Create `src/config/env.ts`:

```ts
export interface EnvConfig {
  model: {
    baseURL: string;
    model: string;
    apiKey: string;
  };
  feishu: {
    groupName: string;
    messagePrefix: string;
  };
}

type EnvSource = Record<string, string | undefined>;

function required(env: EnvSource, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadEnvConfig(env: EnvSource = process.env): EnvConfig {
  return {
    model: {
      baseURL: required(env, 'CUA_LARK_MODEL_BASE_URL'),
      model: required(env, 'CUA_LARK_MODEL'),
      apiKey: required(env, 'CUA_LARK_MODEL_API_KEY')
    },
    feishu: {
      groupName: env.CUA_LARK_FEISHU_GROUP_NAME?.trim() || 'CUA-Lark测试群',
      messagePrefix: env.CUA_LARK_MESSAGE_PREFIX?.trim() || 'CUA-Lark test'
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/config/env.test.ts`

Expected: PASS.

### Task 3: Test Case Schema

**Files:**
- Create: `src/cases/schema.ts`
- Create: `cases/im-send-message.sample.json`
- Test: `tests/cases/schema.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/cases/schema.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { parseTestCase } from '../../src/cases/schema.js';

describe('parseTestCase', () => {
  test('accepts a valid IM test case', () => {
    const testCase = parseTestCase({
      id: 'im-send-message-001',
      product: 'im',
      instruction: '发送测试消息',
      expected: '会话中出现测试消息'
    });

    expect(testCase.product).toBe('im');
  });

  test('rejects unsupported product values', () => {
    expect(() =>
      parseTestCase({
        id: 'bad-case',
        product: 'unknown',
        instruction: 'noop',
        expected: 'noop'
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/cases/schema.test.ts`

Expected: FAIL because `src/cases/schema.ts` does not exist.

- [ ] **Step 3: Implement schema**

Create `src/cases/schema.ts`:

```ts
import { z } from 'zod';

export const TestCaseSchema = z.object({
  id: z.string().min(1),
  product: z.enum(['im', 'docs', 'calendar']),
  instruction: z.string().min(1),
  expected: z.string().min(1)
});

export type TestCase = z.infer<typeof TestCaseSchema>;

export function parseTestCase(input: unknown): TestCase {
  return TestCaseSchema.parse(input);
}
```

- [ ] **Step 4: Add sample case**

Create `cases/im-send-message.sample.json`:

```json
{
  "id": "im-send-message-001",
  "product": "im",
  "instruction": "在飞书中搜索指定测试群，发送一条唯一测试消息，并确认发送成功",
  "expected": "会话中出现唯一测试消息"
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test tests/cases/schema.test.ts`

Expected: PASS.

### Task 4: Reporter

**Files:**
- Create: `src/reporter/markdown.ts`
- Test: `tests/reporter/markdown.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/reporter/markdown.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { renderMarkdownReport } from '../../src/reporter/markdown.js';

describe('renderMarkdownReport', () => {
  test('renders case result and screenshot paths', () => {
    const markdown = renderMarkdownReport({
      caseId: 'im-send-message-001',
      product: 'im',
      status: 'passed',
      startedAt: '2026-05-06T00:00:00.000Z',
      endedAt: '2026-05-06T00:00:03.000Z',
      durationMs: 3000,
      steps: [
        {
          index: 1,
          action: 'type(content="hello")',
          screenshotPath: 'reports/run-1/step-1.png'
        }
      ]
    });

    expect(markdown).toContain('# Test Report: im-send-message-001');
    expect(markdown).toContain('passed');
    expect(markdown).toContain('reports/run-1/step-1.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/reporter/markdown.test.ts`

Expected: FAIL because `src/reporter/markdown.ts` does not exist.

- [ ] **Step 3: Implement reporter**

Create `src/reporter/markdown.ts`:

```ts
export interface ReportStep {
  index: number;
  action: string;
  screenshotPath?: string;
}

export interface ReportInput {
  caseId: string;
  product: string;
  status: 'passed' | 'failed';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  steps: ReportStep[];
  failureReason?: string;
}

export function renderMarkdownReport(input: ReportInput): string {
  const lines = [
    `# Test Report: ${input.caseId}`,
    '',
    `- Product: ${input.product}`,
    `- Status: ${input.status}`,
    `- Started At: ${input.startedAt}`,
    `- Ended At: ${input.endedAt}`,
    `- Duration: ${input.durationMs} ms`
  ];

  if (input.failureReason) {
    lines.push(`- Failure Reason: ${input.failureReason}`);
  }

  lines.push('', '## Steps', '');

  for (const step of input.steps) {
    lines.push(`### Step ${step.index}`, '', `Action: \`${step.action}\``);
    if (step.screenshotPath) {
      lines.push('', `Screenshot: \`${step.screenshotPath}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/reporter/markdown.test.ts`

Expected: PASS.

### Task 5: UI-TARS Runner Wrapper

**Files:**
- Create: `src/agent/lark-agent.ts`
- Test: `tests/agent/lark-agent.test.ts`

- [ ] **Step 1: Write failing tests around dependency injection**

Create `tests/agent/lark-agent.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { LarkAgent } from '../../src/agent/lark-agent.js';

describe('LarkAgent', () => {
  test('passes the test instruction to the injected GUI runner', async () => {
    const calls: string[] = [];
    const agent = new LarkAgent({
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/agent/lark-agent.test.ts`

Expected: FAIL because `src/agent/lark-agent.ts` does not exist.

- [ ] **Step 3: Implement wrapper**

Create `src/agent/lark-agent.ts`:

```ts
export interface GuiRunner {
  run(instruction: string): Promise<unknown>;
}

export class LarkAgent {
  constructor(private readonly runner: GuiRunner) {}

  async runInstruction(instruction: string): Promise<unknown> {
    return this.runner.run(instruction);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/agent/lark-agent.test.ts`

Expected: PASS.

### Task 6: Full MVP Verification

**Files:**
- Modify: `src/index.ts`
- Create: `docs/manual-test-checklist.md`

- [ ] **Step 1: Wire CLI to load configuration and sample case**

Update `src/index.ts` so it loads `.env`, reads `cases/im-send-message.sample.json`, validates the case, and prints the parsed test case.

- [ ] **Step 2: Run automated checks**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 3: Add manual test checklist**

Create `docs/manual-test-checklist.md` with these checks:

```markdown
# Manual Test Checklist

- Feishu desktop is open and logged in.
- Only one display is active.
- The test group exists and is searchable.
- `.env` contains local model credentials.
- The model endpoint passed a vision smoke test.
- No real API key is committed.
```

- [ ] **Step 4: Commit**

Run:

```bash
git add .
git commit -m "chore: initialize cua lark mvp plan"
```

Expected: commit succeeds.

