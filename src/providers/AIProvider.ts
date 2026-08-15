import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import type {AgentTool} from '../agent/types.js';

export interface AIProvider {
  readonly name: string;

  sendMessage(
    prompt: string,
    options: ProviderRequestOptions,
  ): Promise<ProviderResponse>;

  cancel(): void;

  setMCPTools?(tools: readonly AgentTool[]): void;
}
