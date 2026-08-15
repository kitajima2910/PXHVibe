import {AgentRuntime} from '../agent/AgentRuntime.js';
import {OpenAIModelProvider} from '../agent/OpenAIModelProvider.js';
import {AnthropicModelProvider} from '../agent/AnthropicModelProvider.js';
import {GeminiModelProvider} from '../agent/GeminiModelProvider.js';
import type {ModelProvider} from '../agent/ModelProvider.js';
import {createWorkspaceTools} from '../agent/tools/workspaceTools.js';
import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import type {AgentTool} from '../agent/types.js';

export type CustomProviderType = 'openai' | 'anthropic' | 'gemini';

export interface CustomApiConfig {
  baseURL: string;
  model: string;
  apiKey: string;
  provider?: CustomProviderType;
}

export class CustomAgentProvider implements AIProvider {
  readonly name: string;
  private readonly runtime: AgentRuntime;
  private activeController: AbortController | undefined;

  constructor(config: CustomApiConfig) {
    const providerType = config.provider ?? 'openai';
    this.name = providerType === 'openai'
      ? `Custom API · ${config.model}`
      : `Custom API · ${providerType} · ${config.model}`;
    const model = this.createModelProvider(providerType, config);
    this.runtime = new AgentRuntime(model, createWorkspaceTools());
  }

  private createModelProvider(providerType: CustomProviderType, config: CustomApiConfig): ModelProvider {
    switch (providerType) {
      case 'anthropic':
        return new AnthropicModelProvider(config.model, config.apiKey || 'local', config.baseURL);
      case 'gemini':
        return new GeminiModelProvider(config.model, config.apiKey || 'local', config.baseURL);
      case 'openai':
      default:
        return new OpenAIModelProvider(config.model, config.apiKey || 'local', config.baseURL);
    }
  }

  async sendMessage(prompt: string, options: ProviderRequestOptions): Promise<ProviderResponse> {
    const controller = new AbortController();
    this.activeController = controller;
    try {
      const content = await this.runtime.run(
        prompt,
        options.cwd,
        controller.signal,
        options.onEvent ?? (() => undefined),
        options.attachments ?? [],
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

  setMCPTools(tools: readonly AgentTool[]): void {
    this.runtime.setTools([...createWorkspaceTools(), ...tools]);
  }
}
