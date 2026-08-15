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

- Không chạy command .opencode/runtime hay executable hệ thống tham khảo; dùng tools PXHVibe trong working directory.
- Resolve đường dẫn tương đối của skill/workflow từ resource root trong prompt.`;

const outputFormatRules = `OUTPUT FORMAT:

- Markdown có cấu trúc, dễ quét: tóm tắt 1-2 dòng đầu, bullet/heading ngắn, code fence cho lệnh/path/diff.
- Bắt buộc các mục: "File đã sửa" (đường dẫn tương đối), "Kết quả kiểm tra", "Vấn đề còn lại" (nếu có).
- Mỗi dòng < 100 ký tự; không bảng rộng, emoji hay HTML.`;

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
