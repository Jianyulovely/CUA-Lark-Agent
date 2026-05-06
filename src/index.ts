import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotEnv } from 'dotenv';
import { parseTestCase } from './cases/schema.js';
import { loadEnvConfig } from './config/env.js';
import { createUITarsRunner, summarizeGUIAgentData } from './agent/ui-tars-runner.js';
import { createRunLogger, createRunName } from './logging/run-logger.js';
import { runInstructionWithLogging } from './runner/instruction-runner.js';

loadDotEnv();

const casePath = resolve(process.cwd(), 'cases/im-send-message.sample.json');
const testCase = parseTestCase(JSON.parse(readFileSync(casePath, 'utf8')));

console.log('CUA-Lark-Agent MVP bootstrap');
console.log(`Loaded case: ${testCase.id} (${testCase.product})`);

try {
  const envConfig = loadEnvConfig();
  console.log(`Model endpoint configured: ${envConfig.model.baseURL}`);
  console.log(`Model id configured: ${envConfig.model.model}`);
  console.log(`Default Feishu group: ${envConfig.feishu.groupName}`);

  const runInstruction = getFlagValue('--run-instruction');
  if (runInstruction) {
    const runLogger = createRunLogger({
      rootDir: resolve(process.cwd(), 'runs'),
      runName: createRunName('manual-instruction')
    });
    const runner = createUITarsRunner(envConfig.model, {
      onData: (data) => {
        console.log(`UI-TARS data: ${summarizeGUIAgentData(data)}`);
        runLogger.write({
          type: 'runner.data',
          timestamp: new Date().toISOString(),
          payload: data
        });
      },
      onError: (_data, error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`UI-TARS error: ${message}`);
      }
    });
    console.log(`Run log: ${runLogger.eventsPath}`);
    await runInstructionWithLogging({
      instruction: runInstruction,
      runner,
      logger: runLogger
    });
  } else if (process.argv.includes('--init-ui-tars')) {
    createUITarsRunner(envConfig.model, {
      onData: (data) => {
        console.log(`UI-TARS data: ${summarizeGUIAgentData(data)}`);
      },
      onError: (_data, error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`UI-TARS error: ${message}`);
      }
    });
    console.log('UI-TARS runner initialized.');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`Model configuration not ready: ${message}`);
}

function getFlagValue(flagName: string): string | undefined {
  const flagIndex = process.argv.indexOf(flagName);
  if (flagIndex === -1) {
    return undefined;
  }

  return process.argv[flagIndex + 1]?.trim() || undefined;
}
