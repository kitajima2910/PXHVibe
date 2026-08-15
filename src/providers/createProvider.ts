import type {AIProvider} from './AIProvider.js';
import {CustomAgentProvider, type CustomApiConfig, type CustomProviderType} from './CustomAgentProvider.js';
import {OpenCodeProvider} from './OpenCodeProvider.js';
import {defaultOpenCodeModel} from './OpenCodeProvider.js';
import type {ProviderName} from '../types/provider.js';

export function parseProviderName(args: readonly string[]): ProviderName {
  const providerArgument = args.find((argument) => argument.startsWith('--provider='));
  const providerName = providerArgument?.slice('--provider='.length) ?? 'free';

  if (providerName !== 'free' && providerName !== 'custom') {
    throw new Error(
      `Mode "${providerName}" không hợp lệ. Giá trị hợp lệ: free, custom.`,
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
  if (providerName === 'free') return new OpenCodeProvider(model);
  return createCustomProviderFromEnvironment();
}

export function createCustomProvider(config: CustomApiConfig): AIProvider {
  return new CustomAgentProvider(config);
}

function createCustomProviderFromEnvironment(): AIProvider {
  const baseURL = process.env.PXH_CUSTOM_BASE_URL;
  const model = process.env.PXH_CUSTOM_MODEL;
  if (baseURL === undefined || model === undefined) {
    throw new Error('Custom API cần PXH_CUSTOM_BASE_URL và PXH_CUSTOM_MODEL.');
  }
  const providerEnv = process.env.PXH_CUSTOM_PROVIDER?.toLowerCase();
  const provider: CustomProviderType =
    providerEnv === 'anthropic' || providerEnv === 'gemini' ? providerEnv : 'openai';
  return new CustomAgentProvider({
    baseURL,
    model,
    apiKey: process.env.PXH_CUSTOM_API_KEY ?? '',
    provider,
  });
}
