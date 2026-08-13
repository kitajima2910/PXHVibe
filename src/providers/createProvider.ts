import type {AIProvider} from './AIProvider.js';
import {MockProvider} from './MockProvider.js';
import {NativeAgentProvider} from './NativeAgentProvider.js';
import {OpenCodeProvider} from './OpenCodeProvider.js';
import {defaultOpenCodeModel} from './OpenCodeProvider.js';
import type {ProviderName} from '../types/provider.js';

export function parseProviderName(args: readonly string[]): ProviderName {
  const providerArgument = args.find((argument) => argument.startsWith('--provider='));
  const providerName = providerArgument?.slice('--provider='.length) ?? 'opencode';

  if (providerName !== 'mock' && providerName !== 'native' && providerName !== 'opencode') {
    throw new Error(
      `Provider "${providerName}" không hợp lệ. Giá trị hợp lệ: native, mock, opencode.`,
    );
  }

  return providerName;
}

export function parseModelName(args: readonly string[]): string {
  const modelArgument = args.find((argument) => argument.startsWith('--model='));
  const modelName = modelArgument?.slice('--model='.length)
    ?? process.env.PXH_OPENCODE_MODEL
    ?? defaultOpenCodeModel;
  if (modelName.trim().length === 0) {
    throw new Error('Model không được để trống.');
  }
  return modelName;
}

export function createProvider(providerName: ProviderName, model?: string): AIProvider {
  if (providerName === 'opencode') return new OpenCodeProvider(model);
  return providerName === 'native' ? new NativeAgentProvider() : new MockProvider();
}
