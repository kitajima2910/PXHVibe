export type PXHAgentId =
  | 'auto'
  | 'expert'
  | 'fix-bugs'
  | 'architect'
  | 'qa'
  | 'review-code'
  | 'devops'
  | 'ui-ux';

export interface PXHAgent {
  id: PXHAgentId;
  label: string;
  description: string;
  instruction: string;
}

export const agents: readonly PXHAgent[] = [
  agent('auto', 'PXH PM (Auto)', 'Phân loại TARGET và chọn đúng một worker.',
    'Điều phối theo Economy Routing: dùng một specialist phù hợp nhất với TARGET.'),
  agent('expert', 'PXH Expert', 'Triển khai tính năng và vibe coding tổng quát.',
    'Bạn là specialist triển khai. Đọc code, sửa tối thiểu, kiểm tra rồi báo kết quả.'),
  agent('fix-bugs', 'PXH Bug Hunter', 'Tái hiện, tìm root cause và sửa lỗi.',
    'Bạn là bug hunter. Tái hiện lỗi, chứng minh root cause, vá nhỏ nhất và thêm regression test.'),
  agent('architect', 'PXH Architect', 'Phân tích kiến trúc và thiết kế giải pháp.',
    'Bạn là kiến trúc sư phần mềm. Phân tích ranh giới, phụ thuộc và trade-off trước khi đề xuất.'),
  agent('qa', 'PXH QA', 'Thiết kế và chạy kiểm thử theo rủi ro.',
    'Bạn là QA engineer. Ưu tiên kiểm thử tập trung, edge cases và bằng chứng có thể tái hiện.'),
  agent('review-code', 'PXH Reviewer', 'Review correctness, security và regression.',
    'Bạn là code reviewer. Tìm lỗi có thể hành động, xếp mức nghiêm trọng và không sửa ngoài TARGET.'),
  agent('devops', 'PXH DevOps', 'Build, CI, packaging và release checks.',
    'Bạn là DevOps engineer. Chẩn đoán build/deploy bằng log và giữ thay đổi hạ tầng tối thiểu.'),
  agent('ui-ux', 'PXH UI/UX', 'Thiết kế giao diện, accessibility và responsive.',
    'Bạn là UI/UX specialist. Giữ design system nhất quán, responsive và accessibility.'),
];

export function getAgent(id: PXHAgentId): PXHAgent {
  return agents.find((candidate) => candidate.id === id) ?? agents[0]!;
}

export function routeAgent(selectedAgentId: PXHAgentId, target: string): PXHAgent {
  if (selectedAgentId !== 'auto') return getAgent(selectedAgentId);
  const value = target.toLocaleLowerCase('vi');
  if (matches(value, ['lỗi', 'bug', 'fix', 'crash', 'không hoạt động', 'không phản hồi'])) {
    return getAgent('fix-bugs');
  }
  if (matches(value, ['review', 'đánh giá code', 'rà soát', 'security audit'])) {
    return getAgent('review-code');
  }
  if (matches(value, ['test', 'kiểm thử', 'coverage', 'regression'])) return getAgent('qa');
  if (matches(value, ['giao diện', 'ui', 'ux', 'css', 'responsive', 'accessibility'])) {
    return getAgent('ui-ux');
  }
  if (matches(value, ['deploy', 'ci', 'build lỗi', 'release', 'docker', 'pipeline'])) {
    return getAgent('devops');
  }
  if (matches(value, ['kiến trúc', 'architecture', 'thiết kế hệ thống', 'design system'])) {
    return getAgent('architect');
  }
  return getAgent('expert');
}

function agent(
  id: PXHAgentId,
  label: string,
  description: string,
  instruction: string,
): PXHAgent {
  return {id, label, description, instruction};
}

function matches(value: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}
