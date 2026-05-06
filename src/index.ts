import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotEnv } from 'dotenv';
import { parseTestCase } from './cases/schema.js';
import { loadEnvConfig } from './config/env.js';

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
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`Model configuration not ready: ${message}`);
}
