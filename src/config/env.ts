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

