import {countTokens} from '../utils/tokenCounter.js';

export const conversationContextCharacterBudget = 24_000;
export const conversationContextTokenBudget = 8_000; // ~8k tokens tương đương ~24k chars

export interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contextContent?: string;
}

export interface ContextUsage {
  sourceCharacters: number;
  activeCharacters: number;
  estimatedTokens: number;
  actualTokens: number;
  percent: number;
  compacted: boolean;
}

export function getContextUsage(messages: readonly ContextMessage[]): ContextUsage {
  const turns = conversationTurns(messages);
  const sourceCharacters = turns.reduce((sum, turn) => sum + turn.length, 0);
  const activeCharacters = Math.min(sourceCharacters, conversationContextCharacterBudget);
  
  // Sử dụng token counter thực tế
  const actualTokens = turns.reduce((sum, turn) => sum + countTokens(turn), 0);
  const estimatedTokens = Math.ceil(activeCharacters / 4); // Giữ lại cho backward compatibility
  
  return {
    sourceCharacters,
    activeCharacters,
    estimatedTokens,
    actualTokens,
    percent: Math.min(100, Math.round(activeCharacters / conversationContextCharacterBudget * 100)),
    compacted: sourceCharacters > conversationContextCharacterBudget || actualTokens > conversationContextTokenBudget,
  };
}

export function selectConversationContext(messages: readonly ContextMessage[]): string[] {
  const turns = conversationTurns(messages);
  if (turns.length === 0) return [];
  if (turns.reduce((sum, turn) => sum + turn.length, 0) <= conversationContextCharacterBudget) return turns;

  // Keep the original target as an anchor, then spend the remaining window on recent turns.
  const anchorBudget = Math.min(4_000, Math.floor(conversationContextCharacterBudget / 4));
  const first = turns[0] ?? '';
  const anchor = first.slice(0, anchorBudget);
  const selected: string[] = [];
  let remaining = conversationContextCharacterBudget - anchor.length;
  for (let index = turns.length - 1; index >= 1 && remaining > 0; index -= 1) {
    const turn = turns[index];
    if (turn === undefined) continue;
    const value = turn.length <= remaining ? turn : turn.slice(turn.length - remaining);
    selected.unshift(value);
    remaining -= value.length;
  }
  return [anchor, '[CONTEXT AUTO-COMPACTED: giữ TARGET gốc và các lượt gần nhất]', ...selected];
}

function conversationTurns(messages: readonly ContextMessage[]): string[] {
  return messages
    .filter((message) => message.id !== 'welcome' && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => `[${message.role === 'user' ? 'USER' : 'ASSISTANT'}]\n${message.contextContent ?? message.content}`)
    .filter((turn) => turn.trim().length > 0);
}
