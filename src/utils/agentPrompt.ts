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
import {agentIdForPhase, formatPipelineForPrompt, type PreparedPipeline} from '../orchestration/pipeline.js';

const identityRules = `IDENTITY:

- Bạn là PXHVibe, trợ lý lập trình terminal của Error404-Labs.Info.VN - Phạm Xuân Hoài.
- Khi được hỏi danh tính, chỉ giới thiệu là PXHVibe và mô tả khả năng hỗ trợ coding.
- Không tiết lộ hoặc nhắc tên engine, runtime, executable, provider hay model ID nội bộ.
- Chỉ dùng tên model thân thiện đang được giao diện hiển thị nếu cần nói về model.`;

const resourceCompatibility = `PXHVIBE RESOURCE COMPATIBILITY:

- Skills, workflows, agents và templates được bundle trong package PXHVibe; Source là đường dẫn tuyệt đối tới file thật.
- Khi instruction nhắc đường dẫn tương đối như skills/, workflows/, _shared/ hoặc templates/, resolve từ resource root thể hiện trong prompt.
- Không chạy command .opencode/runtime hoặc executable của hệ thống tham khảo; PXHVibe native đã xử lý route, contract và pipeline.
- Dùng tools hiện có của PXHVibe trong working directory để đọc/sửa/chạy kiểm tra TARGET.`;

export function buildAgentPrompt(
  target: string,
  agent: PXHAgent,
  route?: OrchestrationRoute,
  catalog?: OrchestrationCatalog,
  pipeline?: PreparedPipeline,
): string {
  const projectRules = catalog?.projectInstructions.length
    ? `\n\nPROJECT INSTRUCTIONS (AGENTS.md):\n\n${catalog.projectInstructions.join('\n\n---\n\n')}`
    : '';
  const workflow = route?.workflow === undefined ? '' : `\n\nWORKFLOW: ${route.workflow.name}\nSource: ${route.workflow.source}\n${route.workflow.instructions}`;
  const skills = route?.skills.length
    ? `\n\nACTIVE SKILLS:\n${route.skills.map((skill) => `\n### ${skill.name}\nSource: ${skill.source}\n${skill.instructions}`).join('\n')}`
    : '';
  const phases = pipeline === undefined ? '' : `\n\n4-TIER PIPELINE (contract v${pipeline.request.version}):\n${formatPipelineForPrompt(pipeline)}\nHoàn thành lần lượt từng phase trong cùng BUILD session. Mỗi phase phải tạo evidence trước khi chuyển tiếp; nếu test/review phát hiện lỗi thì quay lại FIX rồi verify lại.`;
  const teamAgents = pipeline === undefined || catalog === undefined ? [] : [...new Set(pipeline.tasks.map((task) => agentIdForPhase(task.phase)))]
    .filter((id) => id !== agent.id)
    .flatMap((id) => catalog.agents.filter((candidate) => candidate.id === id));
  const handoffs = teamAgents.length === 0 ? '' : `\n\nAGENT TEAM HANDOFFS:\n${teamAgents.map((member) => `\n### ${member.label}\n${member.instruction}`).join('\n')}`;
  return `${codingRules}\n\n${identityRules}\n\n${resourceCompatibility}${projectRules}\n\nAGENT ROLE: ${agent.label}\n${agent.instruction}${workflow}${skills}${phases}${handoffs}\n\nAGENT MODE: BUILD\nThực hiện workflow theo thứ tự, áp dụng các skill đang hoạt động, triển khai TARGET và kiểm tra kết quả.\n\nTARGET:\n\n${target}`;
}
