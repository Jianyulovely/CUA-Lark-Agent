const BASE64_OMIT_KEYS = new Set(['screenshotBase64']);

export function redactForLog(value: unknown, secrets: string[] = []): unknown {
  if (typeof value === 'string') {
    return redactString(value, secrets);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item, secrets));
  }

  if (value instanceof Error) {
    return {
      name: redactForLog(value.name, secrets),
      message: redactForLog(value.message, secrets),
      stack: redactForLog(value.stack, secrets),
      cause: redactForLog((value as { cause?: unknown }).cause, secrets)
    };
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (BASE64_OMIT_KEYS.has(key) && typeof nestedValue === 'string') {
          return [key, `[BASE64_OMITTED length=${nestedValue.length}]`];
        }

        return [key, redactForLog(nestedValue, secrets)];
      })
    );
  }

  return value;
}

function redactString(value: string, secrets: string[]): string {
  return secrets
    .filter((secret) => secret.length > 0)
    .reduce((current, secret) => current.split(secret).join('[REDACTED]'), value);
}
