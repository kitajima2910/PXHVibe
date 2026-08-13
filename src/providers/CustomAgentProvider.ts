import {AgentRuntime} from '../agent/AgentRuntime.js';
import {OpenAIModelProvider} from '../agent/OpenAIModelProvider.js';
import {createWorkspaceTools} from '../agent/tools/workspaceTools.js';
import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';

export interface CustomApiConfig {
  baseURL: string;
  model: string;
  apiKey: string;
}

export class CustomAgentProvider implements AIProvider {
  readonly name: string;
  private readonly buildRuntime: AgentRuntime;
  private readonly planRuntime: AgentRuntime;
  private activeController: AbortController | undefined;

  constructor(config: CustomApiConfig) {
    this.name = `Custom API · ${config.model}`;
    const createModel = (): OpenAIModelProvider =>
      new OpenAIModelProvider(config.model, config.apiKey || 'local', config.baseURL);
    const tools = createWorkspaceTools();
    this.buildRuntime = new AgentRuntime(createModel(), tools);
    this.planRuntime = new AgentRuntime(
      createModel(),
      tools.filter((tool) => tool.name !== 'apply_patch'),
    );
  }

  async sendMessage(prompt: string, options: ProviderRequestOptions): Promise<ProviderResponse> {
    const controller = new AbortController();
    this.activeController = controller;
    try {
      const runtime = options.agentMode === 'plan' ? this.planRuntime : this.buildRuntime;
      const content = await runtime.run(
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
}
