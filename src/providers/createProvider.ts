import type {AIProvider} from './AIProvider.js';
import {MockProvider} from './MockProvider.js';
import {OpenCodeProvider} from './OpenCodeProvider.js';
import type {ProviderName} from '../types/provider.js';

export function parseProviderName(args: readonly string[]): ProviderName {
  const providerArgument = args.find((argument) => argument.startsWith('--provider='));
  const providerName = providerArgument?.slice('--provider='.length) ?? 'mock';

  if (providerName !== 'mock' && providerName !== 'opencode') {
    throw new Error(
      `Provider "${providerName}" không hợp lệ. Giá trị hợp lệ: mock, opencode.`,
    );
  }

  return providerName;
}

export function createProvider(providerName: ProviderName): AIProvider {
  return providerName === 'opencode' ? new OpenCodeProvider() : new MockProvider();
}
