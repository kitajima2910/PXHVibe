import {AgentRuntime} from '../agent/AgentRuntime.js';
import {OpenAIModelProvider} from '../agent/OpenAIModelProvider.js';
import {createWorkspaceTools} from '../agent/tools/workspaceTools.js';
import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';

export class NativeAgentProvider implements AIProvider {
  readonly name = 'Native';
  private runtime: AgentRuntime | undefined;
  private activeController: AbortController | undefined;

  async sendMessage(prompt: string, options: ProviderRequestOptions): Promise<ProviderResponse> {
    const controller = new AbortController();
    this.activeController = controller;
    try {
      const content = await this.getRuntime().run(
        prompt,
        options.cwd,
        controller.signal,
        options.onEvent ?? (() => undefined),
      );
      return {content};
    } finally {
      if (this.activeController === controller) this.activeController = undefined;
    }
  }

  cancel(): void {
    this.activeController?.abort();
    this.activeController = undefined;
  }

  private getRuntime(): AgentRuntime {
    if (this.runtime !== undefined) return this.runtime;
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey === undefined || apiKey.length === 0) {
      throw new Error('Thiếu OPENAI_API_KEY. Hãy cấu hình biến môi trường trước khi dùng Native provider.');
    }
    const model = process.env.PXH_MODEL || 'gpt-5.6-terra';
    this.runtime = new AgentRuntime(
      new OpenAIModelProvider(model, apiKey),
      createWorkspaceTools(),
    );
    return this.runtime;
  }
}
