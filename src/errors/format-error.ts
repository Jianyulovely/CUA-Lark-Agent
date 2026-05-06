export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return appendCauseMessage(error.message, (error as { cause?: unknown }).cause);
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function appendCauseMessage(message: string, cause: unknown): string {
  if (!cause) {
    return message;
  }

  const causeMessage =
    cause instanceof Error
      ? cause.message
      : cause && typeof cause === 'object' && typeof (cause as { message?: unknown }).message === 'string'
        ? (cause as { message: string }).message
        : undefined;

  return causeMessage ? `${message}: ${causeMessage}` : message;
}
