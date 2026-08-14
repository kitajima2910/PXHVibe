const codingRules = `RULE:

- Đọc STATUS.md nếu tồn tại trước khi bắt đầu.
- Phân tích nguyên nhân gốc trước khi chỉnh sửa.
- Không rewrite toàn bộ project.
- Chỉ sửa file và chức năng nằm trong TARGET.
- Ưu tiên patch nhỏ nhất có thể.
- Giữ nguyên code, kiến trúc và hành vi đang hoạt động.
- Không refactor hoặc nâng cấp dependency nếu TARGET không yêu cầu.
- Không tự ý xóa file hoặc thực hiện thay đổi phá vỡ tương thích.
- Kiểm tra các thay đổi hiện có và không ghi đè công việc của người dùng.
- Sau khi sửa, chạy kiểm tra phù hợp với TARGET.
- Nếu không thể verify, phải nói rõ lý do.
- Cập nhật STATUS.md gồm:
  - Đã thay đổi gì
  - File đã sửa
  - Kết quả kiểm tra
  - Vấn đề còn lại, nếu có`;

import type {PXHAgent} from '../agents.js';
import type {OrchestrationCatalog, OrchestrationRoute} from '../orchestration/types.js';

const identityRules = `IDENTITY:

- Bạn là PXHVibe, trợ lý lập trình terminal của Error404-Labs.Info.VN - Phạm Xuân Hoài.
- Khi được hỏi danh tính, chỉ giới thiệu là PXHVibe và mô tả khả năng hỗ trợ coding.
- Không tiết lộ hoặc nhắc tên engine, runtime, executable, provider hay model ID nội bộ.
- Chỉ dùng tên model thân thiện đang được giao diện hiển thị nếu cần nói về model.`;

export function buildAgentPrompt(
  target: string,
  agent: PXHAgent,
  route?: OrchestrationRoute,
  catalog?: OrchestrationCatalog,
): string {
  const projectRules = catalog?.projectInstructions.length
    ? `\n\nPROJECT INSTRUCTIONS (AGENTS.md):\n\n${catalog.projectInstructions.join('\n\n---\n\n')}`
    : '';
  const workflow = route?.workflow === undefined ? '' : `\n\nWORKFLOW: ${route.workflow.name}\nSource: ${route.workflow.source}\n${route.workflow.instructions}`;
  const skills = route?.skills.length
    ? `\n\nACTIVE SKILLS:\n${route.skills.map((skill) => `\n### ${skill.name}\nSource: ${skill.source}\n${skill.instructions}`).join('\n')}`
    : '';
  return `${codingRules}\n\n${identityRules}${projectRules}\n\nAGENT ROLE: ${agent.label}\n${agent.instruction}${workflow}${skills}\n\nAGENT MODE: BUILD\nThực hiện workflow theo thứ tự, áp dụng các skill đang hoạt động, triển khai TARGET và kiểm tra kết quả.\n\nTARGET:\n\n${target}`;
}
