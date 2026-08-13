export interface ProviderRequestOptions {
  cwd: string;
}

export interface ProviderResponse {
  content: string;
}

export type ProviderName = 'mock' | 'opencode';
