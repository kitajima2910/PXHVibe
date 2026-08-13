import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';

export interface AIProvider {
  readonly name: string;

  sendMessage(
    prompt: string,
    options: ProviderRequestOptions,
  ): Promise<ProviderResponse>;

  cancel(): void;
}
