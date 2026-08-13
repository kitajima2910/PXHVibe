import type {AgentEvent} from '../agent/types.js';
import type {ImageAttachment} from './attachment.js';

export interface ProviderRequestOptions {
  cwd: string;
  attachments?: readonly ImageAttachment[];
  onEvent?: (event: AgentEvent) => void;
}

export interface ProviderResponse {
  content: string;
}

export type ProviderName = 'free' | 'custom';
