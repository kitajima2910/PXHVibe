import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';

export class MockProvider implements AIProvider {
  readonly name = 'Mock';

  async sendMessage(
    prompt: string,
    _options: ProviderRequestOptions,
  ): Promise<ProviderResponse> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 400);
    });

    return {content: `Mock response: ${prompt}`};
  }

  cancel(): void {}
}
