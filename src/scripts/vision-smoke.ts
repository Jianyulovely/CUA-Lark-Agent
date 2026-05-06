import { config as loadDotEnv } from 'dotenv';
import { loadEnvConfig } from '../config/env.js';
import { runVisionSmokeTest } from '../model/vision-smoke.js';

loadDotEnv();

try {
  const envConfig = loadEnvConfig();
  const result = await runVisionSmokeTest(envConfig.model);

  console.log('Vision smoke test passed.');
  console.log(`Model response: ${result.responseText}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}

