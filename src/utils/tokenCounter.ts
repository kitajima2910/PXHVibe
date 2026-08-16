/**
 * Token counting utilities - ước lượng tokens chính xác hơn characters/4
 * 
 * Sử dụng các heuristic dựa trên nghiên cứu về tokenization:
 * - Tiếng Anh: ~4 characters/token
 * - Code: ~3 characters/token (nhiều ký tự đặc biệt)
 * - Tiếng Việt: ~2.5 characters/token (do UTF-8 encoding)
 * - JSON/structured data: ~3.5 characters/token
 */

export interface TokenCountResult {
  tokens: number;
  characters: number;
  breakdown: {
    english: number;
    code: number;
    vietnamese: number;
    structured: number;
  };
}

/**
 * Đếm tokens với độ chính xác cao hơn characters/4
 */
export function countTokens(text: string): number {
  if (text.length === 0) return 0;
  
  const breakdown = analyzeText(text);
  const totalTokens = 
    breakdown.english / 4 +
    breakdown.code / 3 +
    breakdown.vietnamese / 2.5 +
    breakdown.structured / 3.5;
  
  return Math.ceil(totalTokens);
}

/**
 * Phân tích text để xác định tỷ lệ các loại content
 */
function analyzeText(text: string): { english: number; code: number; vietnamese: number; structured: number } {
  let code = 0;
  let vietnamese = 0;
  let structured = 0;
  let english = 0;
  
  // Detect code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = text.match(codeBlockRegex) || [];
  codeBlocks.forEach(block => {
    code += block.length;
  });
  
  // Detect inline code
  const inlineCodeRegex = /`[^`]+`/g;
  const inlineCodes = text.match(inlineCodeRegex) || [];
  inlineCodes.forEach(inline => {
    code += inline.length;
  });
  
  // Detect JSON/structured data
  const jsonRegex = /\{[\s\S]*?\}|\[[\s\S]*?\]/g;
  const jsonBlocks = text.match(jsonRegex) || [];
  jsonBlocks.forEach(block => {
    if (!codeBlocks.some(cb => cb.includes(block))) {
      structured += block.length;
    }
  });
  
  // Detect Vietnamese characters (UTF-8 multi-byte)
  const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi;
  const vietnameseChars = text.match(vietnameseRegex) || [];
  vietnamese = vietnameseChars.length * 2; // Mỗi ký tự tiếng Việt ~2 bytes
  
  // Phần còn lại là English
  const totalAccounted = code + structured + vietnamese;
  english = Math.max(0, text.length - totalAccounted);
  
  return { english, code, vietnamese, structured };
}

/**
 * Đếm tokens cho conversation context
 */
export function countConversationTokens(messages: readonly { content: string; contextContent?: string }[]): number {
  let total = 0;
  for (const msg of messages) {
    const content = msg.contextContent ?? msg.content;
    total += countTokens(content);
    // Add overhead for message formatting
    total += 4; // [USER] or [ASSISTANT] prefix
  }
  return total;
}

/**
 * Ước lượng token budget cho context window
 */
export function estimateTokenBudget(characters: number, contentType: 'english' | 'code' | 'mixed' = 'mixed'): number {
  switch (contentType) {
    case 'english':
      return Math.ceil(characters / 4);
    case 'code':
      return Math.ceil(characters / 3);
    case 'mixed':
      return Math.ceil(characters / 3.5);
  }
}
