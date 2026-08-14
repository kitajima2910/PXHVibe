import type {OrchestrationCatalog, PXHSkill, PXHWorkflow} from './types.js';

type SkillDefinition = readonly [id: string, description: string, triggers?: readonly string[]];

const skillDefinitions: readonly SkillDefinition[] = [
  ['3d-web-experience', 'Trải nghiệm web 3D với Three.js, React Three Fiber, Spline và WebGL.', ['three.js', 'webgl', '3d website', '3d web']],
  ['ais-agents', 'AI agents với tools, multi-step reasoning, memory và rate control.', ['ai agent', 'agent framework', 'tool calling']],
  ['ais-llm', 'Tích hợp LLM production: streaming, function calling, retry và fallback.', ['llm', 'streaming', 'function calling']],
  ['ais-production', 'Vận hành AI production với cache, rate limit, monitoring và graceful degradation.', ['ai production', 'rate limit', 'fallback model']],
  ['ais-prompts', 'Prompt engineering: template, versioning, đánh giá và chống prompt injection.', ['prompt', 'prompt injection', 'prompt engineering']],
  ['ais-rag', 'RAG pipeline: ingestion, chunking, embedding, hybrid search và reranking.', ['rag', 'embedding', 'vector search']],
  ['game-art', 'Nguyên lý game art, color theory, animation và asset pipeline.', ['game art', 'sprite', 'animation']],
  ['game-design', 'Core loop, GDD, tâm lý người chơi, progression và cân bằng độ khó.', ['game design', 'gdd', 'core loop']],
  ['game-development', 'Điều phối phát triển game và chọn đúng skill theo platform/dimension.', ['game', 'trò chơi', 'gameplay']],
  ['games-2d', 'Game 2D với Phaser: entity, tilemap, HUD, animation và object pool.', ['phaser', 'game 2d', '2d game']],
  ['games-3d', 'Game 3D với Three.js: camera, lighting, AI, LOD và instancing.', ['game 3d', 'three.js game', '3d game']],
  ['games-assets', 'Tìm, nhập và quản lý asset game có trạng thái animation đầy đủ.', ['game asset', 'spritesheet', 'model 3d']],
  ['games-audio', 'Audio game với Web Audio API, pooling, spatial audio và fallback format.', ['game audio', 'web audio', 'sound']],
  ['games-core', 'Game loop fixed timestep, scene manager, asset loader và input.', ['game engine', 'game loop', 'scene manager']],
  ['games-deploy', 'Đóng gói và triển khai game lên web/Itch.io với CI/CD.', ['game deploy', 'itch.io', 'github pages']],
  ['games-isometric', 'Game isometric: chuyển tọa độ, depth sort, fog và A* pathfinding.', ['isometric', '2.5d', 'pathfinding']],
  ['games-optimization', 'Tối ưu FPS/memory game bằng pooling, instancing, LOD và profiling.', ['game performance', 'fps', 'object pool']],
  ['games-physics', 'Physics/collision với AABB, spatial hash, raycast và response.', ['physics', 'collision', 'raycast']],
  ['games-preview', 'Live preview game bằng Vite HMR sau khi hoàn thành feature.', ['game preview', 'hot reload', 'vite hmr']],
  ['games-pwa', 'PWA cho game: offline, manifest, service worker và install prompt.', ['game pwa', 'offline game', 'service worker']],
  ['games-testing', 'Kiểm thử game headless, E2E, benchmark và phát hiện memory leak.', ['game test', 'headless game', 'benchmark']],
  ['mobile-games', 'Game mobile: touch, battery, thermal, store và monetization.', ['mobile game', 'touch game', 'app store']],
  ['multiplayer', 'Multiplayer: networking, synchronization, security và matchmaking.', ['multiplayer', 'network game', 'matchmaking']],
  ['pc-games', 'Game PC/console: engine, controller, Steam và tối ưu platform.', ['pc game', 'console game', 'steam']],
  ['process-code-review', 'Code review có cấu trúc cho correctness, security và regression.', ['review', 'code review', 'audit']],
  ['process-driven-development', 'Thực thi kế hoạch nhiều task theo phase và acceptance criteria.', ['implementation plan', 'multi task', 'triển khai']],
  ['process-finishing-branch', 'Hoàn tất branch: verify, lịch sử sạch và báo cáo/PR.', ['finish branch', 'pull request', 'hoàn tất branch']],
  ['process-parallel-agents', 'Chia các task độc lập để xử lý song song mà không xung đột state.', ['parallel agents', 'song song', 'independent task']],
  ['process-systematic-debugging', 'Tái hiện và chứng minh root cause trước khi sửa lỗi.', ['bug', 'fix', 'debug', 'error', 'lỗi', 'crash', 'không hoạt động', 'không phản hồi']],
  ['process-tdd', 'Test-driven development: test fail trước, code tối thiểu, refactor sau.', ['tdd', 'test first', 'unit test']],
  ['process-verification', 'Chạy kiểm tra và đọc output trước khi tuyên bố hoàn tất.', ['verify', 'test', 'kiểm thử', 'kiểm tra', 'regression']],
  ['process-writing-plans', 'Lập kế hoạch cho task nhiều bước trước khi chỉnh code.', ['plan', 'kế hoạch', 'specification']],
  ['prompt-compiler', 'Biên dịch yêu cầu tự nhiên thành prompt có intent, constraint và output contract.', ['compile prompt', 'tối ưu prompt', 'prompt compiler']],
  ['tools-automation', 'Automation ổn định với watcher, batch, retry và logging.', ['automation', 'script', 'watcher']],
  ['tools-cli', 'CLI production: parser, spinner, error handling, completion và cross-platform.', ['cli', 'terminal app', 'command line']],
  ['tools-codegen', 'Code generator và scaffold dựa trên template có kiểm tra.', ['codegen', 'scaffold', 'generator']],
  ['tools-extensions', 'VS Code extension: commands, views, providers và lifecycle.', ['vscode extension', 'extension', 'webview']],
  ['tools-packaging', 'Build và phân phối qua npm, Cargo, PyPI, Docker hoặc Homebrew.', ['package', 'publish', 'release', 'đóng gói']],
  ['ui-ux', 'UI/UX production cho web, game HUD và terminal.', ['ui', 'ux', 'giao diện', 'tui', 'responsive', 'accessibility']],
  ['vibe-memory', 'Nạp và lưu knowledge project, decision và context phiên làm việc.', ['memory', 'context', 'history']],
  ['vr-ar', 'VR/AR: comfort, spatial interaction và performance.', ['vr', 'ar', 'webxr']],
  ['web-games', 'Game trình duyệt: framework, WebGPU, PWA, audio và browser constraints.', ['web game', 'browser game', 'webgpu']],
  ['webs-auth', 'Authentication: OAuth, JWT, RBAC, session, cookie và CSRF.', ['auth', 'login', 'oauth', 'jwt']],
  ['webs-backend', 'Backend web: API, middleware, validation, error handling và rate limit.', ['backend', 'api', 'express', 'fastapi']],
  ['webs-database', 'Database: schema, index, query, transaction và zero-downtime migration.', ['database', 'postgresql', 'prisma', 'migration']],
  ['webs-deployment', 'Triển khai web với CI/CD, monitoring, canary và rollback.', ['deploy', 'vercel', 'docker', 'ci']],
  ['webs-frontend', 'Frontend React production: components, hooks, data và bundle.', ['frontend', 'react', 'next.js', 'component']],
  ['webs-security', 'Web security: auth, XSS, CSRF, SQLi, headers và dependency audit.', ['security', 'xss', 'csrf', 'sqli']],
  ['webs-styling', 'Styling: design system, responsive, dark mode và animation.', ['css', 'tailwind', 'styling', 'dark mode']],
  ['webs-testing', 'Kiểm thử web với unit, integration, E2E và API mocking.', ['web test', 'vitest', 'playwright', 'e2e']],
];

const displayNames: Readonly<Record<string, string>> = {
  'process-systematic-debugging': 'Systematic Debugging',
  'process-verification': 'Verification',
  'process-code-review': 'Code Review',
  'process-tdd': 'Test-Driven Development',
  'process-writing-plans': 'Writing Plans',
  'process-driven-development': 'Driven Development',
  'process-parallel-agents': 'Parallel Agents',
  'process-finishing-branch': 'Finishing Branch',
  'ui-ux': 'UI/UX',
};

export const builtinSkills: readonly PXHSkill[] = skillDefinitions.map(([id, description, triggers = []]) => ({
  id,
  name: displayNames[id] ?? title(id),
  description,
  triggers: [...triggers, ...id.split('-').filter((word) => word.length >= 3)],
  instructions: skillInstructions(id, description),
  source: 'PXHVibe capability pack',
  origin: 'fallback',
}));

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
    source: 'PXHVibe capability pack',
    origin: 'fallback',
  };
}

export const builtinWorkflows: readonly PXHWorkflow[] = [
  workflow('ai', 'AI', 'Xây dựng tính năng AI, RAG hoặc agent production.', ['ai', 'llm', 'rag', 'chatbot', 'agent'], 'expert', ['ais-llm', 'ais-production', 'process-verification'],
    ['Phân tích use case, dữ liệu và failure modes.', 'Thiết kế model/tool/data flow.', 'Triển khai với retry, limits và observability.', 'Test fallback, security và cost behavior.']),
  workflow('company', 'Company', 'Workflow BUILD mặc định từ phân tích đến persist.', ['feature', 'implement', 'build', 'create', 'thêm', 'tạo', 'triển khai', 'làm'], 'expert', ['process-driven-development', 'process-code-review', 'process-verification'],
    ['Analyze TARGET và project state.', 'Architect thay đổi nhỏ nhất.', 'Code theo acceptance criteria.', 'Test và fix failures.', 'Review correctness/security.', 'Build và persist STATUS.md.']),
  workflow('debug', 'Debug', 'Điều tra và sửa lỗi có bằng chứng.', ['bug', 'fix', 'debug', 'error', 'lỗi', 'crash', 'không hoạt động', 'không phản hồi'], 'fix-bugs', ['process-systematic-debugging', 'process-verification'],
    ['Tái hiện lỗi.', 'Khoanh vùng và chứng minh root cause.', 'Áp dụng patch nhỏ nhất.', 'Chạy regression test và cập nhật STATUS.md.']),
  workflow('game', 'Game', 'Thiết kế, triển khai, polish và kiểm thử game.', ['game', 'trò chơi', 'phaser', 'three.js game'], 'expert', ['game-development', 'games-testing', 'process-verification'],
    ['Chọn platform, dimension và core loop.', 'Thiết kế architecture/assets.', 'Triển khai gameplay.', 'Test headless và performance.', 'Polish rồi build.']),
  workflow('meeting', 'Meeting', 'Làm rõ yêu cầu và tạo quyết định/kế hoạch hành động.', ['meeting', 'brainstorm', 'thảo luận', 'làm rõ'], 'architect', ['process-writing-plans', 'vibe-memory'],
    ['Thu thập mục tiêu và constraints.', 'Nêu câu hỏi/giả định quan trọng.', 'Chốt quyết định và acceptance criteria.', 'Lưu kế hoạch hành động.']),
  workflow('release', 'Release', 'Xác minh, đóng gói và chuẩn bị phát hành.', ['release', 'deploy', 'publish', 'ci', 'package', 'đóng gói', 'phát hành'], 'devops', ['tools-packaging', 'process-finishing-branch', 'process-verification'],
    ['Kiểm tra branch và quality gates.', 'Chạy test/typecheck/build.', 'Đóng gói trong phạm vi được phép.', 'Báo artifact, rollback và vấn đề còn lại.']),
  workflow('tool', 'Tool', 'Xây dựng CLI, automation, extension hoặc code generator.', ['cli', 'tool', 'automation', 'script', 'extension', 'codegen'], 'expert', ['tools-cli', 'tools-automation', 'process-verification'],
    ['Xác định command/input/output contract.', 'Thiết kế cross-platform behavior.', 'Triển khai error handling.', 'Test CLI và packaging.']),
  workflow('web', 'Web', 'Xây dựng web app frontend/backend production.', ['web', 'website', 'frontend', 'backend', 'react', 'next.js', 'ui', 'ux', 'giao diện'], 'ui-ux', ['webs-frontend', 'webs-styling', 'webs-testing'],
    ['Phát hiện stack và constraints.', 'Thiết kế component/data/API flow.', 'Triển khai UI và backend trong TARGET.', 'Test responsive, accessibility, security và build.']),
];

export const emptyCatalog: OrchestrationCatalog = {
  projectInstructions: [], agents: [], skills: builtinSkills, workflows: builtinWorkflows,
};

function skillInstructions(id: string, description: string): string {
  const category = id.split('-')[0];
  const verification = category === 'process'
    ? 'Tuân thủ đúng thứ tự của quy trình; không bỏ qua evidence hoặc verification gate.'
    : 'Đọc kiến trúc hiện tại, áp dụng phần liên quan nhỏ nhất và kiểm tra failure/edge cases của lĩnh vực này.';
  return `${description}\n${verification}\nKhông thay đổi ngoài TARGET và phải báo rõ kết quả kiểm tra.`;
}

function title(id: string): string {
  return id.split('-').map((word) => word.length <= 3 ? word.toUpperCase() : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join(' ');
}
