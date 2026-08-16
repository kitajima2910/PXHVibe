/**
 * Generate suggestions for next improvements after task completion
 */

export interface Suggestion {
  id: number;
  text: string;
  category: 'improvement' | 'idea' | 'upgrade';
}

export interface SuggestionContext {
  target: string;
  lastOutput: string;
  filesChanged: string[];
  pipelinePhases: string[];
}

/**
 * Generate 3 suggestions based on completed task context
 */
export function generateSuggestions(context: SuggestionContext): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Analyze context to generate relevant suggestions
  const { target, lastOutput, filesChanged } = context;
  
  // Suggestion 1: Testing/Validation
  if (filesChanged.length > 0 && !target.toLowerCase().includes('test')) {
    suggestions.push({
      id: 1,
      text: `Thêm test cho ${filesChanged[0] ?? 'các file đã thay đổi'}`,
      category: 'improvement',
    });
  } else {
    suggestions.push({
      id: 1,
      text: 'Tối ưu performance cho code vừa viết',
      category: 'improvement',
    });
  }
  
  // Suggestion 2: Documentation
  if (filesChanged.some(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'))) {
    suggestions.push({
      id: 2,
      text: 'Thêm documentation và comments cho code',
      category: 'idea',
    });
  } else {
    suggestions.push({
      id: 2,
      text: 'Review và refactor code để clean hơn',
      category: 'idea',
    });
  }
  
  // Suggestion 3: Feature expansion
  const targetLower = target.toLowerCase();
  if (targetLower.includes('fix') || targetLower.includes('sửa')) {
    suggestions.push({
      id: 3,
      text: 'Thêm error handling và edge cases',
      category: 'upgrade',
    });
  } else if (targetLower.includes('add') || targetLower.includes('thêm') || targetLower.includes('tạo')) {
    suggestions.push({
      id: 3,
      text: 'Mở rộng tính năng với options/config',
      category: 'upgrade',
    });
  } else {
    suggestions.push({
      id: 3,
      text: 'Thêm logging và monitoring',
      category: 'upgrade',
    });
  }
  
  return suggestions;
}

/**
 * Format suggestions for display
 */
export function formatSuggestions(suggestions: Suggestion[]): string {
  const lines = [
    '',
    '💡 Gợi ý tiếp theo (gõ 1, 2, 3 hoặc click):',
    '',
  ];
  
  suggestions.forEach((suggestion, index) => {
    const categoryIcon = suggestion.category === 'improvement' ? '🔧' 
      : suggestion.category === 'idea' ? '💭' 
      : '⚡';
    lines.push(`  ${index + 1}. ${categoryIcon} ${suggestion.text}`);
  });
  
  lines.push('');
  return lines.join('\n');
}

/**
 * Parse suggestion selection from user input
 */
export function parseSuggestionSelection(input: string): number | null {
  const trimmed = input.trim();
  
  // Check for number selection (1, 2, 3)
  if (/^[123]$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  
  return null;
}
