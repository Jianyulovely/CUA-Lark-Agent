export interface GuiRunner<TResult = unknown> {
  run(instruction: string): Promise<TResult>;
}

export class LarkAgent<TResult = unknown> {
  constructor(private readonly runner: GuiRunner<TResult>) {}

  async runInstruction(instruction: string): Promise<TResult> {
    return this.runner.run(instruction);
  }
}
