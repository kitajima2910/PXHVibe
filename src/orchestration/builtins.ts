import type {OrchestrationCatalog, PXHSkill, PXHWorkflow} from './types.js';

function skill(id: string, name: string, description: string, triggers: string[], instructions: string): PXHSkill {
  return {id, name, description, triggers, instructions, source: 'PXHVibe'};
}

function workflow(
  id: string,
  name: string,
  description: string,
  triggers: string[],
  preferredAgentId: string,
  skillIds: string[],
  steps: string[],
): PXHWorkflow {
  return {
    id, name, description, triggers, preferredAgentId, skillIds, steps,
    instructions: steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    source: 'PXHVibe',
  };
}

export const builtinSkills: readonly PXHSkill[] = [
  skill('systematic-debugging', 'Systematic Debugging', 'Tái hiện lỗi và tìm root cause trước khi sửa.',
    ['bug', 'fix', 'debug', 'error', 'lỗi', 'crash', 'không hoạt động', 'không phản hồi'],
    'Tái hiện lỗi, thu thập bằng chứng, khoanh vùng root cause rồi mới tạo patch nhỏ nhất. Thêm regression test khi phù hợp.'),
  skill('implementation', 'Focused Implementation', 'Triển khai tính năng bằng thay đổi nhỏ, có kiểm tra.',
    ['feature', 'implement', 'build', 'create', 'thêm', 'tạo', 'triển khai', 'làm'],
    'Xác định acceptance criteria, đọc code liên quan, triển khai minimal diff và chạy kiểm tra tập trung.'),
  skill('frontend-ui', 'Frontend UI/UX', 'UI terminal/web, responsive và accessibility.',
    ['ui', 'ux', 'frontend', 'css', 'giao diện', 'terminal', 'tui', 'responsive', 'animation'],
    'Giữ visual hierarchy rõ, tương thích kích thước màn hình và hành vi bàn phím/accessibility nhất quán.'),
  skill('verification', 'Verification', 'Kiểm thử theo rủi ro và xác nhận không regression.',
    ['test', 'verify', 'qa', 'kiểm thử', 'kiểm tra', 'regression'],
    'Chọn kiểm tra sát TARGET, chạy typecheck/test/build phù hợp và báo rõ phần chưa thể xác minh.'),
  skill('code-review', 'Code Review', 'Rà soát correctness, security và regression.',
    ['review', 'audit', 'security', 'rà soát', 'đánh giá code'],
    'Ưu tiên lỗi có bằng chứng, nêu mức độ và vị trí; không mở rộng sang refactor ngoài TARGET.'),
  skill('release', 'Build & Release', 'Build, CI, đóng gói và phát hành.',
    ['release', 'deploy', 'publish', 'ci', 'package', 'đóng gói', 'phát hành'],
    'Kiểm tra quality gates, chạy build/pack có liên quan và không tự deploy nếu chưa được cho phép.'),
];

export const builtinWorkflows: readonly PXHWorkflow[] = [
  workflow('debug', 'Debug', 'Điều tra và sửa lỗi có bằng chứng.',
    ['bug', 'fix', 'debug', 'error', 'lỗi', 'crash', 'không hoạt động', 'không phản hồi'],
    'fix-bugs', ['systematic-debugging', 'verification'],
    ['Đọc trạng thái và tái hiện lỗi.', 'Khoanh vùng rồi chứng minh root cause.', 'Áp dụng patch nhỏ nhất.', 'Chạy regression test và cập nhật STATUS.md.']),
  workflow('ui', 'UI/UX', 'Thiết kế hoặc sửa giao diện.',
    ['ui', 'ux', 'frontend', 'css', 'giao diện', 'terminal', 'tui', 'responsive', 'animation'],
    'ui-ux', ['frontend-ui', 'verification'],
    ['Khảo sát UI và ràng buộc hiện có.', 'Thiết kế thay đổi nhất quán.', 'Triển khai trong TARGET.', 'Kiểm tra layout, input và regression.']),
  workflow('release', 'Release', 'Xác minh và đóng gói bản phát hành.',
    ['release', 'deploy', 'publish', 'ci', 'package', 'đóng gói', 'phát hành'],
    'devops', ['release', 'verification'],
    ['Kiểm tra trạng thái và quality gates.', 'Chạy test/typecheck/build.', 'Đóng gói trong phạm vi được phép.', 'Báo artifact và vấn đề còn lại.']),
  workflow('build', 'Build', 'Triển khai tính năng từ phân tích đến kiểm tra.',
    ['feature', 'implement', 'build', 'create', 'thêm', 'tạo', 'triển khai', 'làm'],
    'expert', ['implementation', 'verification'],
    ['Đọc project và xác định acceptance criteria.', 'Phân tích ảnh hưởng và chọn patch nhỏ nhất.', 'Triển khai TARGET.', 'Kiểm tra và cập nhật STATUS.md.']),
];

export const emptyCatalog: OrchestrationCatalog = {
  projectInstructions: [], agents: [], skills: builtinSkills, workflows: builtinWorkflows,
};
