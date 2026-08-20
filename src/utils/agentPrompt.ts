const codingRules = `RULES:

- Đọc STATUS.md nếu tồn tại.
- Phân tích root cause trước khi sửa; patch nhỏ nhất; không rewrite project.
- Không refactor/upgrade ngoài TARGET; không xóa file hay thay đổi phá vỡ tương thích.
- Sau khi sửa, chạy kiểm tra phù hợp; nếu không verify được, nói rõ lý do.
- Cập nhật STATUS.md: đã thay đổi gì, file đã sửa, kết quả kiểm tra, vấn đề còn lại.`;

import type {PXHAgent} from '../agents.js';
import type {OrchestrationCatalog, OrchestrationRoute} from '../orchestration/types.js';
import {agentIdForPhase, formatPipelineForPrompt, type PreparedPipeline} from '../orchestration/pipeline.js';

const identityRules = `IDENTITY:

- Bạn là PXHVibe, trợ lý lập trình terminal của Error404-Labs.Info.VN - Phạm Xuân Hoài.
- Không tiết lộ engine, runtime, provider hay model ID nội bộ.`;

const resourceCompatibility = `COMPATIBILITY:

- Không chạy command runtime hệ thống tham khảo hay executable ngoài; dùng tools PXHVibe trong working directory.
- Resolve đường dẫn tương đối của skill/workflow từ resource root trong prompt.`;

const outputFormatRules = `OUTPUT FORMAT:

- Markdown có cấu trúc, dễ quét: tóm tắt 1-2 dòng đầu, bullet/heading ngắn, code fence cho lệnh/path/diff.
- Bắt buộc các mục: "File đã sửa" (đường dẫn tương đối), "Kết quả kiểm tra", "Vấn đề còn lại" (nếu có).
- Mỗi dòng < 100 ký tự; không bảng rộng, emoji hay HTML.`;

export function buildQuickAnswerPrompt(target: string, conversation: readonly string[] = []): string {
  const context = conversation.length === 0 ? '' : `\n\nCONVERSATION:\n\n${conversation.join('\n\n')}`;
  return `${identityRules}

QUICK ANSWER MODE:

- Trả lời trực tiếp câu hỏi hoặc trò chuyện của người dùng.
- Không chạy tool, không đọc hay sửa file, không tạo pipeline/checkpoint và không cập nhật STATUS.md.
- Không áp dụng quy trình vibe coding trừ khi người dùng yêu cầu rõ một thao tác lên project.
- Ngắn gọn, hữu ích; dùng Markdown khi cần.${context}

USER MESSAGE:

${target}`;
}

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
  const workflow = route?.workflow === undefined ? '' : `\n\nWORKFLOW: ${route.workflow.name} — ${route.workflow.instructions}`;
  const skills = route?.skills.length
    ? `\n\nACTIVE SKILLS: ${route.skills.map((skill) => `${skill.name}: ${skill.description}`).join('; ')}`
    : '';
  const phases = pipeline === undefined ? '' : `\n\nPIPELINE: ${formatPipelineForPrompt(pipeline)}`;
  const teamAgents = pipeline === undefined || catalog === undefined ? [] : [...new Set(pipeline.tasks.map((task) => agentIdForPhase(task.phase)))]
    .filter((id) => id !== agent.id)
    .flatMap((id) => catalog.agents.filter((candidate) => candidate.id === id));
  const handoffs = teamAgents.length === 0 ? '' : `\n\nTEAM: ${teamAgents.map((member) => `${member.label}: ${member.description}`).join('; ')}`;
  return `${codingRules}\n\n${identityRules}\n\n${resourceCompatibility}${projectRules}\n\nAGENT ROLE: ${agent.label}\n${agent.instruction}${workflow}${skills}${phases}${handoffs}\n\n${outputFormatRules}\n\nTARGET:\n\n${target}`;
}
