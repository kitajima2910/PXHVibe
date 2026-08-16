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
  history?: readonly string[];
}

/**
 * Chuẩn hóa text để so sánh trùng lặp giữa các round.
 */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Tạo danh sách ý tưởng "tính năng mới" phù hợp với ngữ cảnh hiện tại,
 * dùng làm nguồn cho vòng lặp gợi ý vô tận. Mỗi ý tưởng được cá nhân hóa
 * theo target/filesChanged để luôn cảm thấy mới và liên quan đến vibe coding.
 */
function buildCandidatePool(context: SuggestionContext): Suggestion[] {
  const { target, filesChanged } = context;
  // Làm sạch target để tránh lặp chồng các câu gợi ý trước (vòng lặp vô tận).
  const cleanTarget = target
    .replace(/[""]/g, '')
    .replace(/\b(mở rộng|thêm|mở rộng thêm)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const targetShort = cleanTarget.length > 45 ? `${cleanTarget.slice(0, 42)}...` : cleanTarget;
  const firstFile = filesChanged[0] ?? undefined;
  const hasCode = filesChanged.some((f) => /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c)$/.test(f));
  const targetLower = target.toLowerCase();

  const candidates: Suggestion[] = [];

  // 1. Test / validation — chỉ khi chưa test
  if (filesChanged.length > 0 && !targetLower.includes('test') && !targetLower.includes('kiểm')) {
    candidates.push({
      id: candidates.length + 1,
      text: `Thêm test cho ${firstFile ?? 'các file vừa thay đổi'}`,
      category: 'improvement',
    });
  }

  // 2. Documentation — chỉ khi có code và chưa docs
  if (hasCode && !targetLower.includes('doc') && !targetLower.includes('readme')) {
    candidates.push({
      id: candidates.length + 1,
      text: 'Thêm documentation và comments cho code',
      category: 'idea',
    });
  }

  // 3. Pool tính năng mới mở rộng — luôn xoay vòng, cá nhân hóa theo target
  const featureIdeas: Array<{text: string; category: Suggestion['category']}> = [
    { text: `Mở rộng "${targetShort}" với options/config linh hoạt`, category: 'upgrade' },
    { text: `Thêm error handling và edge cases cho "${targetShort}"`, category: 'upgrade' },
    { text: `Thêm logging/telemetry để giám sát "${targetShort}"`, category: 'upgrade' },
    { text: `Tối ưu performance cho "${targetShort}"`, category: 'improvement' },
    { text: `Thêm input validation cho "${targetShort}"`, category: 'improvement' },
    { text: `Thêm retry/timeout cho "${targetShort}" chạy ổn định`, category: 'upgrade' },
    { text: `Thêm dark mode / theme cho "${targetShort}"`, category: 'idea' },
    { text: `Thêm export/import dữ liệu cho "${targetShort}"`, category: 'idea' },
    { text: `Thêm i18n đa ngôn ngữ cho "${targetShort}"`, category: 'idea' },
    { text: `Refactor "${targetShort}" để dễ bảo trì`, category: 'improvement' },
    { text: `Thêm CLI subcommands cho "${targetShort}"`, category: 'upgrade' },
    { text: `Thêm CI/CD workflow cho dự án`, category: 'upgrade' },
    { text: `Thêm caching để tăng tốc "${targetShort}"`, category: 'improvement' },
    { text: `Thêm unit + integration tests cho "${targetShort}"`, category: 'improvement' },
    { text: `Thêm undo/rollback an toàn cho "${targetShort}"`, category: 'idea' },
    { text: `Thêm giao diện config UI cho "${targetShort}"`, category: 'idea' },
  ];

  for (const idea of featureIdeas) {
    candidates.push({ id: candidates.length + 1, ...idea });
  }

  return candidates;
}

/**
 * Generate 3 suggestions based on completed task context.
 * Đảm bảo không lặp lại các gợi ý/目标 đã dùng ở các round trước
 * (dựa vào `history`), giúp vòng lặp gợi ý tiếp tục vô tận với tính năng mới.
 */
export function generateSuggestions(context: SuggestionContext): Suggestion[] {
  const pool = buildCandidatePool(context);
  const used = new Set((context.history ?? []).map(normalize));

  // Lọc bỏ các gợi ý đã từng xuất hiện, giữ nguyên thứ tự ưu tiên.
  const fresh = pool.filter((candidate) => !used.has(normalize(candidate.text)));

  // Nếu pool còn ít hơn 3 (đã gợi ý gần hết), sinh thêm biến thể mới
  // dựa trên target để vòng lặp không bao giờ cạn ý tưởng.
  const source = fresh.length >= 3 ? fresh : pool;
  const result: Suggestion[] = [];
  const seen = new Set<string>();
  for (const candidate of source) {
    const key = normalize(candidate.text);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...candidate, id: result.length + 1 });
    if (result.length === 3) break;
  }

  return result;
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
