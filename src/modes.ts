import type {ProviderName} from './types/provider.js';

export interface PXHMode {
  id: string;
  label: string;
  description: string;
  provider: ProviderName;
  model?: string;
}

export const modes: readonly PXHMode[] = [
  freeMode('pickle', 'Big Pickle', 'opencode/big-pickle'),
  freeMode('mimo', 'MiMo V2.5', 'opencode/mimo-v2.5-free'),
  freeMode('deepseek', 'DeepSeek V4 Flash', 'opencode/deepseek-v4-flash-free'),
  freeMode('nemotron', 'Nemotron 3 Ultra', 'opencode/nemotron-3-ultra-free'),
  freeMode('lightning', 'Nemotron 3.5 Lightning', 'opencode/nemotron-3.5-lightning-free'),
  freeMode('laguna', 'Laguna S 2.1', 'opencode/laguna-s-2.1-free'),
  freeMode('hy3', 'Hy3', 'opencode/hy3-free'),
  freeMode('ling', 'Ling 3.0 Tiny', 'opencode/ling-3.0-tiny-free'),
  {
    id: 'custom',
    label: 'Custom API',
    description: 'Base URL, model và API key riêng.',
    provider: 'custom',
  },
];

function freeMode(id: string, label: string, model: string): PXHMode {
  return {
    id,
    label: `${label} (Free)`,
    description: 'Cloud coding agent miễn phí',
    provider: 'free',
    model,
  };
}
