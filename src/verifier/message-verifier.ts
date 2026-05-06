export interface MessageVerificationInput {
  message: string;
  screenshotBase64: string;
}

export interface MessageVerificationResult {
  passed: boolean;
  reason: string;
  rawResponse?: string;
}

export interface MessageVerifier {
  verify(input: MessageVerificationInput): Promise<MessageVerificationResult>;
}
