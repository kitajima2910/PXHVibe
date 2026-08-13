import type {AgentEvent} from '../agent/types.js';

export interface ProviderRequestOptions {
  cwd: string;
  onEvent?: (event: AgentEvent) => void;
}

export interface ProviderResponse {
  content: string;
}

export type ProviderName = 'free' | 'custom';
