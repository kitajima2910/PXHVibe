# STATUS

## Cập nhật v0.7.0: Live activity và cảnh báo treo

### Đã thay đổi gì

- Compose box hiển thị tổng thời gian agent đã chạy.
- Hiển thị phase và tiến độ hiện tại, ví dụ `CODE 3/8`.
- Hiển thị activity thật gần nhất từ provider: phân tích, tool, terminal, chỉnh sửa hoặc checkpoint.
- Sau 60 giây không có event mới, hiển thị thời gian đang chờ model/runtime.
- Sau 180 giây im lặng, cảnh báo chuyển đỏ; giữ `Esc×2` để hủy an toàn.
- Không tạo thêm message heartbeat nên lịch sử TUI không bị spam.
- Nâng version lên `v0.7.0`.

### File đã sửa

- `src/app.tsx`
- `src/components/PromptInput.tsx`
- `src/tests/imageClipboard.test.ts`
- `package.json`
- `package-lock.json`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm run typecheck`: đạt.
- `npm test`: đạt toàn bộ 16 nhóm test.
- TUI regression xác nhận elapsed `03:12`, phase `CODE 3/8` và cảnh báo đỏ sau `03:01` không có event.
- `npm pack --dry-run --json`: tạo metadata `pxhvibe@0.7.0`, 336 entry.
- Global install: `pxhvibe@0.7.0`; `pxh.cmd --version` trả `PXHVibe v0.7.0`.

### Vấn đề còn lại

- TUI chỉ có thể chứng minh activity khi provider phát event; khoảng im lặng có thể là model đang suy luận hoặc runtime bị chậm, vì vậy giao diện báo đúng là “đang chờ” thay vì khẳng định giả rằng vẫn đang xử lý.

## Cập nhật v0.6.0: Context meter và auto-resume

### Đã thay đổi gì

- Hiển thị `CTX n%` trên header; `↻` xuất hiện khi lịch sử đã được auto-compact.
- `/context` báo phần trăm, token ước lượng, số ký tự đang hoạt động và trạng thái auto-compact.
- Khi vượt 24.000 ký tự hội thoại, giữ TARGET gốc và các lượt mới nhất thay vì chỉ cắt đuôi mù.
- Giới hạn prompt từng phase ở 64.000 ký tự, giữ phần rule/identity đầu và TARGET/handoff cuối.
- Tự tiếp tục lỗi tạm thời tối đa ba attempt.
- Khi khởi động TUI, tự resume session `fail/running` từ checkpoint; không tự chạy lại session người dùng đã hủy.
- Giữ `/resume` làm phương án khôi phục thủ công.
- Nâng version lên `v0.6.0`.

### File đã tạo hoặc sửa

- `src/runtime/contextManager.ts`
- `src/runtime/sessionStore.ts`
- `src/runtime/teamRunner.ts`
- `src/app.tsx`
- `src/components/Header.tsx`
- `src/tests/teamRunner.test.ts`
- `src/tests/slashCommands.test.ts`
- `package.json`
- `package-lock.json`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm run typecheck`: đạt.
- `npm test`: đạt toàn bộ 16 nhóm test.
- Context regression xác nhận giữ TARGET gốc + lượt mới nhất, báo `100%`, `~6.000 tokens` và trạng thái compact.
- Team-runner regression xác nhận lỗi tạm thời tự tiếp tục ở attempt thứ ba; checkpoint thủ công vẫn resume đúng phase.
- `npm pack --dry-run --json`: đạt cho `pxhvibe@0.6.0`.
- Global install: `pxhvibe@0.6.0`; `pxh.cmd --version` trả `PXHVibe v0.6.0`.

### Vấn đề còn lại

- Context không thể vô cực về vật lý; PXHVibe dùng rolling context + STATUS.md + checkpoint để duy trì công việc dài hạn.
- Token là ước lượng theo ký tự vì free provider không cung cấp usage/context-window thống nhất cho mọi model.

## Cập nhật v0.5.0: Native multi-agent execution runtime

### Đã thay đổi gì

- Thay pipeline một request bằng phase runner: mỗi specialist thực hiện một lượt model riêng và nhận handoff từ phase trước.
- Workflow Debug chạy Analyze → Fix → Test → Review → Persist; các workflow AI, Web, Tool và Release cũng có phase Fix thực thi thật.
- Nạp đầy đủ agent Markdown, skills và workflow tương ứng cho từng phase.
- Thêm enforcement gate trước/sau phase và validate đủ 6 contract: Event, Result, Response, Config, Tools, Agent.
- Thêm retry có giới hạn cho lỗi tạm thời, checkpoint atomic và khôi phục từ phase lỗi bằng `/resume`.
- Lưu trạng thái tại `.pxhvibe/runtime-state.json`; hỗ trợ hủy qua signal hiện có và lệnh `/cancel`.
- Triển khai đủ 23 command handler native; thêm `/retry`, `/new`, `/resume`, `/session`, `/context`, `/detect`, `/doctor`, `/diff`, `/history`, `/version`, `/about`, `/clear`.
- Thêm `pxh --version` và `pxh --help` không cần mở TUI.
- Tách working directory trong test để không tạo state trong source project.
- Nâng version lên `v0.5.0`.

### File đã tạo hoặc sửa

- `src/runtime/sessionStore.ts`
- `src/runtime/teamRunner.ts`
- `src/runtime/enforcer.ts`
- `src/runtime/commands.ts`
- `src/app.tsx`
- `src/cli.tsx`
- `src/orchestration/pipeline.ts`
- `src/tests/teamRunner.test.ts`
- `src/tests/runtimeCommands.test.ts`
- `src/tests/slashCommands.test.ts`
- `src/tests/pipeline.test.ts`
- `package.json`
- `package-lock.json`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm run typecheck`: đạt.
- `npm test`: đạt toàn bộ 16 nhóm test, gồm provider, agent, router, orchestration, 6 contracts, team runner, 23 commands, TUI, image và viewport.
- Team runner regression xác nhận 5 provider call thật cho Debug, handoff đúng specialist, retry lỗi tạm thời và resume từ checkpoint.
- `pxh --version`: trả `PXHVibe v0.5.0`; `pxh --help`: liệt kê đủ 23 command.
- `npm pack --dry-run --json`: đạt; gói `pxhvibe@0.5.0` có 335 entry, gồm runtime mới và capability assets.
- Kiểm kê asset: 10 agents, 8 workflows, 50 skills.
- `git diff --check`: đạt; chỉ có cảnh báo chuyển LF sang CRLF của Git trên Windows.
- Global install: `pxhvibe@0.5.0`; `pxh --version` xác nhận đúng bản.

### Vấn đề còn lại

- Runtime đạt tương thích chức năng native với capability pack, không sao chép executable/runtime nội bộ của pxhopencode.
- Chất lượng và giới hạn thực tế vẫn phụ thuộc model/provider miễn phí đang được chọn.

## Cập nhật v0.4.0: Bundle full Skills/Agents/Workflows

### Đã thay đổi gì

- Vendor nguyên bộ capability assets MIT từ pxhopencode commit `0d712cf1b2dd59eaf40d225b6254f251762e2941`.
- Thêm 10 file agent Markdown thật, 50 `SKILL.md`, 8 workflow Markdown, 173 template/helper trong skills và 28 shared files.
- Giữ nguyên license và attribution tại `resources/LICENSE.pxhopencode` và `resources/ATTRIBUTION.md`.
- Npm package giờ bundle `resources/`; không mang theo `.git`, executable, provider config hoặc runtime CLI của nguồn.
- Discovery tự tìm resources từ vị trí module khi chạy source, global install hoặc package npm.
- Bundled Markdown override instruction rút gọn TypeScript; TypeScript catalog chỉ còn vai trò fallback/trigger ổn định.
- Project vẫn có thể bổ sung agent và override skill/workflow bằng `.pxhvibe`, `.agents`, `.opencode` hoặc thư mục gốc.
- Selected skill lazy-load tối đa ba referenced resource với budget 20.000 ký tự; source path đầy đủ luôn có trong prompt.
- Pipeline đưa instruction đầy đủ của các agent handoff liên quan vào BUILD prompt.
- Thêm compatibility layer: không chạy command `.opencode/runtime`; dùng router/contracts/tools native PXHVibe.
- `/status` và `/validate` đếm bundled assets thật thay vì đếm fallback arrays.
- Nâng version lên `v0.4.0`.

### File đã tạo hoặc sửa

- `resources/agents/**`
- `resources/skills/**`
- `resources/workflows/**`
- `resources/_shared/**`
- `resources/LICENSE.pxhopencode`
- `resources/ATTRIBUTION.md`
- `src/orchestration/discovery.ts`
- `src/orchestration/types.ts`
- `src/orchestration/builtins.ts`
- `src/orchestration/router.ts`
- `src/orchestration/pipeline.ts`
- `src/agents.ts`
- `src/app.tsx`
- `src/utils/agentPrompt.ts`
- `src/tests/orchestration.test.ts`
- `package.json`
- `package-lock.json`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- Discovery test xác nhận full `games-2d`, `pxh-expert`, Debug workflow và referenced implementation được đọc từ `resources`.
- Prompt integration test xác nhận selected full skill và agent team handoffs thật xuất hiện trong request.
- Npm pack dry-run v0.4.0: 329 files, đúng 50 skills, 10 agents, 8 workflows; unpacked size 679.074 bytes.
- `npm.cmd run typecheck` và toàn bộ `npm.cmd test`: thành công.
- Global install xác nhận `pxhvibe@0.4.0` liên kết đến `D:\PXHVibe`.

### Vấn đề còn lại

- PXHVibe dùng runtime/provider native; các command `.opencode/runtime` trong tài liệu nguồn được compatibility layer vô hiệu hóa.
- Các specialist handoff cùng chạy trong một BUILD model request để giữ quota free, chưa spawn model request riêng cho từng agent.

## Cập nhật v0.3.1: Sửa auto-router Game bị nhận thành Web

### Đã thay đổi gì

- Tái hiện lỗi bằng spec game HTML5 có nhiều từ `web app`, `frontend UI`, `responsive` và `canvas`.
- Root cause: router cộng điểm mọi keyword ngang hàng nên nhiều tín hiệu delivery Web lấn át domain Game.
- Thêm classifier hai lớp: task intent (`debug/release/meeting`) trước, sau đó domain intent (`game/ai/tool/web`) với trọng số tín hiệu chuyên biệt.
- `gameplay`, `player`, `enemy`, `boss`, `level`, Phaser/Godot/Unity và từ tiếng Việt tương ứng giờ ưu tiên Game workflow.
- Route event hiển thị confidence, ví dụ `Workflow → Game (99%)`.
- Không còn ghép prompt trước vào mọi lần phân loại; chỉ kế thừa intent khi người dùng nhập `tiếp tục`, `làm tiếp`, `sửa tiếp` hoặc từ tương đương.
- Nâng version lên `v0.3.1`.

### File đã sửa

- `src/orchestration/types.ts`
- `src/orchestration/router.ts`
- `src/app.tsx`
- `src/tests/pipeline.test.ts`
- `src/tests/slashCommands.test.ts`
- `README.md`
- `package.json`
- `package-lock.json`
- `STATUS.md`

### Kết quả kiểm tra

- Regression spec game HTML5 chứa Web/UI terms: chọn Game workflow, PXH Expert, `game-development` và `games-testing`.
- Mixed intent `Fix crash ... trong game`: chọn Debug workflow và vẫn nạp game skill.
- Routing context test: TARGET mới không bị prompt trước làm lệch; `tiếp tục task` vẫn kế thừa prompt trước.
- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công, toàn bộ regression suite.
- Global install xác nhận `pxhvibe@0.3.1` liên kết đến `D:\PXHVibe`.

### Vấn đề còn lại

- Classifier là deterministic local intent routing, không gọi thêm model để phân loại nhằm giữ tốc độ và quota free.

## Cập nhật v0.3.0: Capability pack và runtime contracts

### Đã thay đổi gì

- Đối chiếu trực tiếp manifest pxhopencode v82.6 tại commit `0d712cf1b2dd59eaf40d225b6254f251762e2941`.
- Mở rộng capability pack native từ 8 lên 10 agents, từ 4 lên 8 workflows và từ 6 lên đúng 50 skills chuyên biệt.
- Thêm kiến trúc runtime 4 tầng: Interface, Orchestration, Workers và Infrastructure.
- Thêm 6 contract TypeScript có runtime validation: Request, Task, Result, Response, Event và State.
- Mỗi TARGET tạo pipeline theo workflow, gắn agent vào từng phase và đưa contract/phase vào BUILD prompt.
- Workflow Debug chạy `analyze → fix → test → review → persist`; Company/Web/Game/AI/Tool/Release/Meeting có phase riêng.
- Thêm `/status`, `/pipeline`, `/validate` để kiểm tra capability và pipeline trong TUI.
- Nâng version từ `v0.2.0` lên `v0.3.0`.

### File đã tạo hoặc sửa

- `src/orchestration/builtins.ts`
- `src/orchestration/contracts.ts`
- `src/orchestration/pipeline.ts`
- `src/agents.ts`
- `src/app.tsx`
- `src/utils/agentPrompt.ts`
- `src/tests/pipeline.test.ts`
- `src/tests/orchestration.test.ts`
- `src/tests/slashCommands.test.ts`
- `README.md`
- `package.json`
- `package-lock.json`
- `STATUS.md`

### Kết quả kiểm tra

- Capability assertions: 10 agents, 4 tiers, 8 workflows, 50 skills và 6 contracts.
- Pipeline/contract tests: thành công.
- Slash command tests cho `/status`, `/pipeline`, `/validate`: thành công.
- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công, toàn bộ regression suite.
- `npm.cmd install --global D:\PXHVibe`: thành công; `npm.cmd list --global pxhvibe --depth=0` xác nhận `pxhvibe@0.3.0`.

### Vấn đề còn lại

- Pipeline điều phối specialist phases trong một BUILD request để tiết kiệm quota model free; chưa spawn một model request riêng cho từng specialist.
- PXHVibe chưa có 23 slash command hay 119 self-test; không hiển thị các con số này trong TUI để tránh gây hiểu nhầm.

## Cập nhật v0.2.0: Skills, agents và workflows native

### Đã thay đổi gì

- Phân tích kiến trúc `kitajima2910/pxhopencode`: metadata agent, thư mục `SKILL.md`, workflow Markdown và router intent → workflow → skills.
- Thêm orchestration native cho PXHVibe; không gọi hoặc phụ thuộc CLI của dự án tham khảo.
- Tự đọc `AGENTS.md` từ project hiện tại đến git root trước khi tạo prompt.
- Tự khám phá skills trong `.pxhvibe/skills`, `.agents/skills`, `.opencode/skills` và `skills`; chỉ nạp tối đa ba skill khớp TARGET vào prompt.
- Tự khám phá project agents và workflows từ các thư mục tương ứng; workflow có thể khai báo `triggers`, `agent`, `skills` bằng YAML frontmatter.
- Thêm bộ tích hợp Debug, UI/UX, Build, Release cùng các skill Systematic Debugging, Focused Implementation, Frontend UI/UX, Verification, Code Review và Build & Release.
- Economy Router giờ chọn workflow, skills và agent ưu tiên; TUI hiển thị route đã chọn trước khi xử lý.
- Thêm `/skills` và `/workflows`; `/agents` hiển thị cả project agents được khám phá.
- Nâng version từ `v0.1.14` lên `v0.2.0`.

### File đã tạo hoặc sửa

- `src/orchestration/types.ts`
- `src/orchestration/builtins.ts`
- `src/orchestration/discovery.ts`
- `src/orchestration/router.ts`
- `src/agents.ts`
- `src/utils/agentPrompt.ts`
- `src/app.tsx`
- `src/tests/orchestration.test.ts`
- `src/tests/slashCommands.test.ts`
- `README.md`
- `package.json`
- `package-lock.json`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công; gồm discovery, routing, project agent, prompt injection và toàn bộ regression suite hiện có.
- Regression test xác nhận `/skills` và `/workflows` không gọi model.
- `npm.cmd install --global D:\PXHVibe`: thành công.
- `npm.cmd list --global pxhvibe --depth=0`: xác nhận `pxhvibe@0.2.0` đang liên kết đến workspace.

### Vấn đề còn lại

- Workflow v0.2.0 điều phối các phase trong một agent request; chưa chạy từng phase thành nhiều child-agent process độc lập.
- Chỉ đọc file orchestration trong project; chưa tải skill từ registry hoặc URL từ xa.

## Đã thay đổi gì

- Sửa lỗi `/models` bị gửi nhầm thành AI prompt và làm UI kẹt ở `Thinking...`.
- Chỉ giữ `/models` để chọn model; `/modes` đã bị loại bỏ và được báo là lệnh không hợp lệ.
- Thêm timeout Free request mặc định 120 giây; hết hạn sẽ dừng child process và hướng dẫn chọn model khác.
- Hỗ trợ `PXH_REQUEST_TIMEOUT_MS` để điều chỉnh timeout.
- Đổi giao diện sang thương hiệu PXHVibe: Header hiển thị `Mode`, tên model thân thiện và không hiển thị tên engine hoặc model ID nội bộ.
- Thêm Big Pickle Free và giữ các cloud coding model miễn phí hiện có trong `/models`.
- Đổi model Free mặc định từ MiMo V2.5 sang Big Pickle vì MiMo không trả dữ liệu trong kiểm tra live, trong khi Big Pickle phản hồi bình thường.
- Sửa Free mode bị kẹt `Thinking...`: đóng stdin của child process ngay sau khi spawn để runtime nhận EOF và bắt đầu xử lý positional prompt.
- Free mode dùng JSON event stream để TUI hiển thị quá trình thật: phân tích, tool đang chạy/hoàn tất và nội dung trả lời ngay khi runtime phát ra.
- Tự động bọc mọi prompt gửi từ TUI bằng coding RULE; nội dung người dùng được đặt nguyên vẹn trong `TARGET` cho cả Free và Custom API.
- Thiết kế lại TUI theo phong cách Matrix hacker: logo ASCII PXHVibe responsive, palette xanh, cyber borders, terminal prompt và dòng tác giả `Error404-Labs.Info.VN - Phạm Xuân Hoài`.
- Đơn giản hóa agent: bỏ `/plan` và `/build`; mọi specialist trong `/agents` luôn chạy BUILD và có thể triển khai TARGET.
- Tham khảo kiến trúc MIT của `kitajima2910/pxhopencode` để thêm Economy Router chạy local, `/agents` và 7 specialist roles native; không bundle runtime/skills pack của repo tham khảo.
- Format lại input/output TUI: message card riêng cho TARGET/OUTPUT, event compact, timestamp, command panel và renderer Markdown terminal cho heading/list/quote/inline code/code fence.
- Tinh gọn visual hierarchy theo phản hồi ảnh thực tế: bỏ text/shortcut trùng, status bar một dòng, border nhẹ hơn và khoảng cách card gọn hơn.
- Thêm boot animation ngắn, spinner khi agent chạy và đặt terminal/tab title thành `PXHVibe` bằng process title + ANSI OSC.
- Chạy TUI trong alternate screen full-height: ẩn prompt shell cũ như `D:\test>pxh` khi app hoạt động, đặt conversation co giãn và input ở đáy; khôi phục shell khi thoát.
- Ghi rõ cấu hình VS Code `${sequence}` cần thiết để tab dùng OSC title thay vì foreground process `node`.
- Xóa Mock khỏi provider contract, menu, source và build output.
- Thêm Custom API mode với form nhập Base URL, model và API key ngay trong TUI.
- API key Custom được che khi nhập, chỉ giữ trong bộ nhớ process và không ghi vào message, log hoặc file.
- Custom API sử dụng AgentRuntime cùng workspace tools hiện có và yêu cầu endpoint tương thích OpenAI Responses API/function calling.
- Hỗ trợ cấu hình Custom qua `PXH_CUSTOM_BASE_URL`, `PXH_CUSTOM_MODEL`, `PXH_CUSTOM_API_KEY`.
- Gỡ OpenAI API khỏi menu, provider contract và CLI; Free mode vẫn là mặc định.
- Bundle runtime miễn phí trong package npm; attribution MIT được giữ trong README nhưng không đưa branding runtime vào TUI.
- Thêm clean build để tarball không chứa artifact provider cũ.

## File đã tạo hoặc chỉnh sửa

- `package.json`
- `package-lock.json`
- `README.md`
- `src/app.tsx`
- `src/cli.tsx`
- `src/modes.ts`
- `src/types/provider.ts`
- `src/components/Header.tsx`
- `src/components/Banner.tsx`
- `src/components/AgentPicker.tsx`
- `src/components/FormattedText.tsx`
- `src/components/ModePicker.tsx`
- `src/components/CustomApiSetup.tsx`
- `src/providers/OpenCodeProvider.ts`
- `src/providers/CustomAgentProvider.ts`
- `src/providers/createProvider.ts`
- `src/agent/OpenAIModelProvider.ts`
- `src/tests/openCodeProvider.test.ts`
- `src/tests/modes.test.ts`
- `src/tests/customApiSetup.test.ts`
- `src/tests/slashCommands.test.ts`
- `src/utils/agentPrompt.ts`
- `src/agents.ts`
- `src/tests/agents.test.ts`
- `src/utils/terminalFormat.ts`
- `src/utils/terminalTitle.ts`
- `src/tests/terminalFormat.test.ts`
- `src/tests/terminalTitle.test.ts`
- `STATUS.md`
- Đã xóa `src/providers/MockProvider.ts` và `src/providers/NativeAgentProvider.ts`.

## Mode đã hỗ trợ

- Free (mặc định): Big Pickle, MiMo V2.5, DeepSeek V4 Flash, Nemotron, Laguna, Hy3 và Ling.
- Custom API: endpoint tương thích OpenAI Responses API với Base URL/model/API key riêng.

## Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công.
- Free runtime test: tìm đúng executable bundled và tên Header thân thiện.
- Native Agent test: tool loop, session, sửa file và workspace boundary thành công.
- Mode catalog test: Big Pickle đứng đầu, có Custom API, không có Mock, không lộ engine trong description.
- Custom API setup test: API key được mask và không xuất hiện trong output render.
- Slash command test: `/models` mở menu; `/modes` và `/unknown` báo lỗi; không lệnh nào gọi provider.
- Timeout parser test: mặc định 120.000 ms.
- Clean build: `dist/providers/MockProvider.js` không còn tồn tại.
- Clean build: `dist/providers/NativeAgentProvider.js` không còn tồn tại.
- `npm.cmd install --global D:\PXHVibe`: thành công; lệnh `pxh` global đã cập nhật.
- `pxh --provider=mock`: bị từ chối; danh sách provider CLI chỉ còn `free, custom`.
- `pxh.cmd --provider=native`: bị từ chối với danh sách hợp lệ `free, custom`.
- Live probe trong thư mục Temp rỗng: MiMo V2.5 không có output sau 30 giây; Big Pickle trả lời thành công trong khoảng 6,5 giây.
- Root-cause probe: cùng lệnh Big Pickle chạy trực tiếp thành công nhưng qua `OpenCodeProvider` timeout vì stdin pipe còn mở.
- Post-fix live probe qua chính `OpenCodeProvider` tại `D:\test`: trả `xin chào` thành công trong 6,07 giây.
- JSON event probe: nhận đủ `step_start`, `tool_use`, `text`, `step_finish`; parser regression test bao phủ activity/tool/text.
- Live provider stream probe: phát 5 event theo thứ tự activity → tool start → tool complete → activity → text và tạo file Temp thành công.
- Prompt integration test: provider nhận đủ RULE và TARGET, trong khi slash command vẫn không bị gửi lên model.
- TUI render test: banner hiển thị đúng tên Error404-Labs.Info.VN và Phạm Xuân Hoài.
- Agent-mode tests: runtime luôn dùng agent `build` với auto tool và prompt luôn chứa `AGENT MODE: BUILD`.
- Economy Router tests: route đúng bug, UI/UX, QA, Expert và tôn trọng specialist được khóa thủ công.
- Terminal formatter tests: nhận đúng heading, blank, bullet, numbered list, quote và fenced code kèm language.
- Terminal title test: ANSI OSC được sanitize và phát đúng tiêu đề `PXHVibe`.
- Alternate-screen test: phát đúng enter/clear/home và restore sequences, restore idempotent.

## Vấn đề còn lại

- Package chưa được publish lên npm; cần tài khoản npm và chạy `npm publish`.
- Free cloud model có thể chậm hoặc thay đổi khả dụng theo thời điểm.
- Custom endpoint phải hỗ trợ Responses API và function calling; endpoint chỉ hỗ trợ Chat Completions chưa dùng được với agent loop hiện tại.
- Free mode vẫn phải giữ attribution MIT trong tài liệu/package; chỉ phần giao diện end-user được ẩn branding runtime.

## Cập nhật: Output branding firewall

### Đã thay đổi gì

- Thêm identity rule để agent luôn tự giới thiệu là PXHVibe và không nêu engine, runtime, provider hoặc model ID nội bộ.
- Thêm output firewall cho câu trả lời, activity, tool event và lỗi trước khi hiển thị trong TUI.
- Hỗ trợ lọc an toàn cả khi tên nội bộ bị chia giữa nhiều streaming chunk.
- Giữ nguyên attribution MIT trong README/package; chỉ che chi tiết triển khai khỏi output end-user.

### File đã sửa

- `src/app.tsx`
- `src/utils/agentPrompt.ts`
- `src/utils/outputBranding.ts`
- `src/tests/outputBranding.test.ts`
- `package.json`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công, gồm regression test cho output thường, URL/path nội bộ và streaming chunk bị chia nhỏ.

### Vấn đề còn lại

- Tên dependency/runtime vẫn tồn tại trong source, package lock và attribution theo yêu cầu kỹ thuật/pháp lý; không còn được render trong câu trả lời TUI.

## Cập nhật: Clipboard image và thumbnail TUI

### Đã thay đổi gì

- Thêm `Ctrl+V` và `/paste` để đọc ảnh hoặc file ảnh từ clipboard Windows.
- Hiển thị thumbnail true-color bằng ký tự half-block trong khung nhập và message TARGET đã gửi.
- Hỗ trợ tối đa 4 ảnh; khi input trống có thể dùng Backspace/Delete để bỏ ảnh cuối.
- Free mode gửi ảnh bằng file attachment; Custom API gửi ảnh bằng `input_image` của Responses API.
- Ảnh clipboard được lưu trong thư mục tạm riêng và tự động xóa sau request hoặc khi người dùng bỏ ảnh/thoát.

### File đã sửa

- `src/types/attachment.ts`
- `src/types/provider.ts`
- `src/types/message.ts`
- `src/utils/imageClipboard.ts`
- `src/components/ImageThumbnail.tsx`
- `src/components/PromptInput.tsx`
- `src/components/MessageList.tsx`
- `src/components/Footer.tsx`
- `src/app.tsx`
- `src/providers/OpenCodeProvider.ts`
- `src/providers/CustomAgentProvider.ts`
- `src/agent/types.ts`
- `src/agent/ModelProvider.ts`
- `src/agent/AgentRuntime.ts`
- `src/agent/OpenAIModelProvider.ts`
- `src/tests/imageClipboard.test.ts`
- `src/tests/openCodeProvider.test.ts`
- `README.md`
- `package.json`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công; gồm attachment arguments, clipboard payload và render thumbnail.
- Clipboard probe không thay đổi clipboard: cơ chế báo đúng lỗi thân thiện khi clipboard hiện không chứa ảnh.

### Vấn đề còn lại

- `Ctrl+V` có thể bị VS Code/terminal giữ lại; `/paste` là đường dự phòng ổn định.
- Khả năng phân tích ảnh phụ thuộc model vision đang chọn; PXHVibe không thể biến model text-only thành model vision.

## Cập nhật: Thumbnail rõ hơn và phím dán VS Code

### Đã thay đổi gì

- Tăng giới hạn thumbnail từ `24×12` lên `44×28` pixel màu, tương đương tối đa 44 cột × 14 dòng terminal.
- Bật pixel offset và compositing chất lượng cao khi thu nhỏ ảnh.
- Thêm `Alt+V` để PXHVibe nhận trực tiếp trong VS Code; vẫn giữ `/paste` và khả năng nhận `Ctrl+V` ở terminal có chuyển tiếp phím.
- Footer và tài liệu không còn hướng dẫn `Ctrl+V` như phím chính trong VS Code.

### File đã sửa

- `src/utils/imageClipboard.ts`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công; test mới xác nhận `Alt+V`, `Ctrl+V` khi được chuyển tiếp và không nhận nhầm phím khác.

### Vấn đề còn lại

- VS Code giữ `Ctrl+V` trước khi dữ liệu đến process terminal; không thể sửa từ bên trong PXHVibe. `Alt+V` và `/paste` là hai đường hoạt động trong VS Code.

## Cập nhật: Message timeline, thumbnail và Auto agent

### Đã thay đổi gì

- Tăng mẫu thumbnail lên tối đa `64×44` pixel màu và dùng High Quality Bilinear để giảm độ nhòe khi thu nhỏ avatar/UI.
- Đổi message card viền kín và nhãn dài thành timeline viền trái nhẹ với badge ngắn `YOU` / `PXH`.
- Rút gọn system event từ `◆ EVENT` lặp lại thành ký hiệu `↳`.
- Sửa Header bị đổi từ `PXH PM (Auto)` sang worker: Economy Router vẫn route specialist cho prompt nhưng Header luôn phản ánh agent người dùng đã chọn.

### File đã sửa

- `src/utils/imageClipboard.ts`
- `src/components/MessageList.tsx`
- `src/app.tsx`
- `src/tests/slashCommands.test.ts`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công; regression test xác nhận Header Auto không bị worker route ghi đè và nhãn message cũ đã được loại bỏ.

### Vấn đề còn lại

- Thumbnail ANSI phụ thuộc kích thước cell/font terminal nên không thể nét bằng ảnh raster trong GUI; tăng độ phân giải tiếp sẽ chiếm quá nhiều dòng/cột.

## Cập nhật: Conversation viewport

### Đã thay đổi gì

- Sửa danh sách message tràn xuống và ghi đè khung input khi hội thoại dài.
- Đặt vùng hội thoại thành flex viewport có `overflow: hidden`, luôn neo message mới nhất ở đáy.
- Thêm `PageUp` / `PageDown` để xem lịch sử theo từng nhóm 4 message và trở về cuối hội thoại.
- Thêm chỉ báo HISTORY khi người dùng đang xem phần cũ.

### File đã sửa

- `src/components/MessageList.tsx`
- `src/components/Footer.tsx`
- `src/tests/messageViewport.test.ts`
- `README.md`
- `package.json`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công, gồm viewport regression test với 10 message trong vùng cao 8 dòng.
- Regression test xác nhận message mới nhất được giữ lại, message cũ bị cắt và PageUp bật chỉ báo HISTORY.

### Vấn đề còn lại

- Lịch sử chỉ tồn tại trong bộ nhớ của phiên chạy hiện tại; chưa lưu session qua lần khởi động mới.

## Cập nhật: Mouse scrollbar và input editor

### Đã thay đổi gì

- Bật SGR mouse tracking và thêm thanh cuộn dọc ở cạnh phải conversation viewport.
- Hỗ trợ con lăn chuột, click/kéo thumb, PageUp và PageDown để xem lịch sử.
- Thumbnail dùng canvas cố định `50×50` pixel màu; ảnh được contain và căn giữa, không méo tỉ lệ.
- Ẩn con trỏ terminal vật lý ở cuối Footer và khôi phục khi thoát, loại bỏ hiện tượng hai con trỏ.
- Input có cursor index thật: chèn/xóa giữa chuỗi, Left/Right/Home/End, Up/Down theo dòng wrap và click để đặt vị trí sửa.
- Chặn mouse escape sequence lọt vào input hoặc form Custom API.

### File đã sửa

- `src/utils/mouse.ts`
- `src/utils/terminalTitle.ts`
- `src/utils/imageClipboard.ts`
- `src/components/MessageList.tsx`
- `src/components/PromptInput.tsx`
- `src/components/CustomApiSetup.tsx`
- `src/tests/terminalTitle.test.ts`
- `src/tests/messageViewport.test.ts`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công.
- Mouse/scroll tests xác nhận wheel event, thumb ở đầu/cuối track và HISTORY viewport.
- Editor tests xác nhận click mapping, di chuyển dọc và phím paste không nhận nhầm.
- Terminal lifecycle test xác nhận mouse mode + cursor hide được bật khi vào TUI và khôi phục đầy đủ khi thoát.

### Vấn đề còn lại

- Khi mouse tracking bật, chọn text native của terminal cần giữ Shift trong VS Code/Windows Terminal.

## Cập nhật: Collapsed paste và multiline input

### Đã thay đổi gì

- Dùng bracketed-paste channel của Ink để nhận nguyên block text, không trộn với từng key event.
- Text paste từ 4 dòng hoặc 300 ký tự tự thu gọn thành `PASTED BLOCK` gồm số dòng, số ký tự và preview một dòng.
- Nội dung đầy đủ vẫn được giữ nguyên để gửi model; `Ctrl+E`, click hoặc phím điều hướng sẽ mở block để chỉnh sửa.
- `Shift+Enter` chèn newline tại cursor; Enter thường mới submit TARGET.
- Footer hiển thị shortcut multiline mới.

### File đã sửa

- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công.
- Integration test gửi bracketed paste 4 dòng, xác nhận TUI render `PASTED BLOCK`, sau đó Shift+Enter + text + Enter gửi đúng nội dung multiline đầy đủ.
- Parser probe xác nhận Ink nhận Kitty `Shift+Enter` với `return=true, shift=true`; thêm fallback LF và legacy modified-enter sequence.

### Vấn đề còn lại

- Terminal không chuyển tiếp modifier Shift cho Enter sẽ cần dùng phím newline thay thế; VS Code Terminal hiện đại hỗ trợ modified Enter qua input protocol.

## Cập nhật: Immutable paste, version, copy và input viewport

### Đã thay đổi gì

- Bỏ hoàn toàn `Ctrl+E`/click mở pasted block; paste dài trở thành text attachment bất biến và luôn thu gọn.
- Bật Kitty keyboard protocol ở CLI để VS Code phân biệt `Shift+Enter`; vẫn giữ LF và legacy fallback.
- Thêm input viewport tối đa 5 dòng, tự theo cursor và nhận mouse wheel trong đúng vùng input.
- Thêm `/copy` và `Alt+C` để copy response gần nhất vào Windows Clipboard.
- Bump package từ `0.1.0` lên `0.1.1` và hiển thị `PXHVibe v0.1.1` trong Banner.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/version.ts`
- `src/cli.tsx`
- `src/app.tsx`
- `src/components/Banner.tsx`
- `src/components/PromptInput.tsx`
- `src/components/MessageList.tsx`
- `src/utils/clipboard.ts`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công trên package `0.1.1`.
- Input integration test xác nhận paste dài luôn hiện chip bất biến và nội dung đầy đủ được compose vào TARGET.
- Input viewport test xác nhận chỉ giữ 2/5 dòng mẫu quanh cursor, có hiddenAbove/hiddenBelow chính xác.
- Banner regression test xác nhận version đọc từ package và xuất hiện trong TUI.
- Kitty keyboard option được typecheck; modified Enter vẫn có ba đường parser: Kitty CSI-u, LF và legacy sequence.

### Vấn đề còn lại

- Pasted block cố ý không chỉnh sửa trực tiếp; Backspace khi input text trống sẽ bỏ block gần nhất.

## Cập nhật v0.1.2: Shift+Enter thực tế, paste summary và thumbnail 20

### Đã thay đổi gì

- Xác nhận VS Code keybinding hiện tại gửi `ESC + Enter`; Ink parse thành `return=true, meta=true`, không phải `shift=true`.
- Bổ sung chính xác biến thể `Meta+Enter` vào newline handler nên không cần sửa/ghi đè keybindings người dùng.
- Pasted text bất biến chỉ hiện `~ N lines` trong input và trong TARGET sau khi gửi; payload đầy đủ vẫn được route và gửi model.
- Footer gợi ý `Shift + bôi chọn + Ctrl+C` để copy đoạn tùy chọn trong terminal có mouse tracking.
- Giảm thumbnail canvas từ `50×50` xuống cố định `20×20` pixel màu.
- Bump version từ `0.1.1` lên `0.1.2`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/utils/imageClipboard.ts`
- `src/utils/pastedText.ts`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công trên `pxhvibe@0.1.2`.
- Integration test dùng đúng sequence VS Code đang cấu hình (`ESC + Enter`), chèn newline rồi submit đúng multiline TARGET.
- Paste display test xác nhận payload 2 dòng được hiển thị thành `~ 2 lines` nhưng compose prompt vẫn chứa nguyên văn.
- Thumbnail test xác nhận canvas cố định là `20×20`.

### Vấn đề còn lại

- `Alt+C`/`/copy` vẫn copy toàn bộ response gần nhất; Shift-select + Ctrl+C dùng để copy một đoạn tùy chọn.

## Cập nhật v0.1.3: Compact UI và OpenCode-style keymap

### Đã thay đổi gì

- Giảm thumbnail cố định từ `20×20` xuống `5×5` pixel màu.
- Sửa composer bị co chiều ngang: đặt flex basis/width rõ ràng và thay shell prompt dài bằng dấu `❯`.
- Dùng logo compact khi terminal dưới 120 cột, border xám round và Footer chỉ giữ hint chính.
- Áp dụng keymap phù hợp theo tài liệu OpenCode: `Ctrl+X` leader, `Ctrl+P`, Tab/Shift+Tab, nhiều phím newline và Readline/Emacs editing.
- Leader mapping PXHVibe: `Ctrl+X` rồi `A` agents, `M` models, `Y` copy, `Q` exit, `H` help.
- `Ctrl+C` xóa input trước; khi input trống mới thoát. `Ctrl+D` khi input trống cũng thoát.
- Bump version từ `0.1.2` lên `0.1.3`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/Banner.tsx`
- `src/components/Header.tsx`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/utils/imageClipboard.ts`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công trên `pxhvibe@0.1.3`.
- UI regression test xác nhận Header compact mới vẫn giữ `PXH PM (Auto)` và loại nhãn message cũ.
- Input tests xác nhận thumbnail `5×5`, Ctrl/Shift/Alt Enter, Readline word boundary và paste summary.
- Toàn bộ 11 nhóm build/provider/agent/router/format/title/mode/custom/command/branding/image/viewport đều qua.

### Vấn đề còn lại

- PXHVibe áp dụng keymap tương thích cho tính năng đang có, không sao chép các session/theme/editor command chưa được triển khai.

## Cập nhật v0.1.4: Native TUI keymap và khôi phục Matrix UI

### Đã thay đổi gì

- Bỏ toàn bộ keymap mô phỏng OpenCode: không còn leader `Ctrl+X`, `Ctrl+P`, Tab đổi agent hoặc nhóm Emacs shortcuts.
- Keymap TUI tối giản: Enter gửi, Shift+Enter/Ctrl+J xuống dòng, arrows/Home/End chỉnh input, PageUp/PageDown/wheel xem lịch sử, Alt+V ảnh, Ctrl+C thoát.
- Khôi phục logo Matrix lớn từ 62 cột, status bar viền xanh và composer `NEW TARGET` rõ ràng.
- Giữ dấu prompt ngắn `❯` và bản sửa editor width để input không bị xếp thành cột dọc.
- Lọc lỗi runtime chứa prompt nội bộ RULE/IDENTITY/AGENT thành thông báo một dòng, không đổ debug payload ra TUI.
- Bump version từ `0.1.3` lên `0.1.4`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/Banner.tsx`
- `src/components/Header.tsx`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.4`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Slash command list vẫn là text gọn; chưa có command palette riêng.

## Cập nhật v0.1.5: bỏ xung đột Ctrl+J trong VS Code

### Đã thay đổi gì

- Bỏ `Ctrl+J` khỏi keymap và Footer vì VS Code giữ phím này để mở panel/debug console trước khi terminal nhận được.
- Loại fallback ký tự LF (`\n`) tương đương `Ctrl+J` khỏi bộ nhận diện newline.
- Giữ `Shift+Enter` làm phím xuống dòng trong composer; Enter thường vẫn gửi TARGET.
- Bump version từ `0.1.4` lên `0.1.5`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.5`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- `Shift+Enter` phụ thuộc terminal truyền được modifier Enter; CLI vẫn bật keyboard protocol và giữ legacy modified-enter fallback.

## Cập nhật v0.1.6: sửa Ctrl+C không thoát trong VS Code

### Đã thay đổi gì

- Tắt bộ `exitOnCtrlC` mặc định của Ink để phím Ctrl+C không bị nuốt khi VS Code Terminal gửi Kitty keyboard sequence.
- Giao việc thoát cho handler của PXHVibe: ở composer Ctrl+C dọn provider/ảnh tạm rồi thoát; trong popup Ctrl+C đóng popup để lần tiếp theo thoát TUI.
- Custom API setup cũng nhận Ctrl+C như thao tác hủy popup.
- Thêm regression test xác nhận byte Ctrl+C đi tới `onExit` của composer.
- Bump version từ `0.1.5` lên `0.1.6`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/cli.tsx`
- `src/components/CustomApiSetup.tsx`
- `src/tests/imageClipboard.test.ts`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.6`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua, gồm regression test Ctrl+C.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Không có vấn đề đã biết trong phạm vi TARGET này.

## Cập nhật v0.1.8: cảnh báo đỏ khi model hết giới hạn

### Đã thay đổi gì

- Nhận diện lỗi hết giới hạn qua các mẫu phổ biến như HTTP 429, rate limit, usage limit, quota, too many requests và exhausted credits.
- Chuẩn hóa nội dung thành: “MODEL ĐÃ HẾT GIỚI HẠN · Hãy chờ quota được làm mới hoặc chọn model khác bằng /models.”
- Thêm `tone: error` cho lỗi provider và render toàn bộ dòng cảnh báo bằng màu đỏ, chữ đậm, biểu tượng `✖`; Header vẫn chuyển sang trạng thái Error màu đỏ.
- Bump version từ `0.1.7` lên `0.1.8`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/MessageList.tsx`
- `src/types/message.ts`
- `src/tests/slashCommands.test.ts`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.8`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- Regression assertions xác nhận lỗi 429/quota được nhận diện, lỗi mạng không bị nhận nhầm và system error dùng màu đỏ.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Nội dung lỗi cụ thể phụ thuộc provider; bộ nhận diện bao phủ các định dạng giới hạn phổ biến hiện tại.

## Cập nhật v0.1.7: làm mới câu chào

### Đã thay đổi gì

- Đổi câu chào mặc định thành: “PXHVibe đã sẵn sàng. Hãy mô tả tính năng, lỗi hoặc ý tưởng bạn muốn triển khai.”
- Bump version từ `0.1.6` lên `0.1.7`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.7`.
- `npm.cmd run build`: thành công.
- `npm.cmd run test:commands` và `npm.cmd run test:branding`: thành công.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Không có vấn đề đã biết trong phạm vi TARGET này.

## Cập nhật v0.1.9: cảnh báo đỏ khi model không hỗ trợ ảnh

### Đã thay đổi gì

- Nhận diện riêng lỗi model/provider không hỗ trợ image, vision hoặc multimodal input.
- Khi TARGET có ảnh, nhận diện thêm các lỗi provider chung như unsupported input/content/media/attachment và text-only.
- Chuẩn hóa nội dung thành: “MODEL KHÔNG HỖ TRỢ HÌNH ẢNH · Hãy bỏ ảnh hoặc chọn model vision khác bằng /models.”
- Thông báo dùng `tone: error`, vì vậy toàn bộ dòng và biểu tượng `✖` hiển thị màu đỏ; Header cũng giữ trạng thái Error màu đỏ.
- Ưu tiên phân loại lỗi ảnh trước lỗi quota để tránh thông báo sai.
- Bump version từ `0.1.8` lên `0.1.9`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/tests/slashCommands.test.ts`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.9`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- Regression assertions xác nhận lỗi vision rõ ràng và unsupported content kèm ảnh được nhận diện, đồng thời không nhận nhầm khi không có ảnh.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Nội dung lỗi cụ thể phụ thuộc provider; bộ nhận diện bao phủ các định dạng vision phổ biến hiện tại.

## Cập nhật v0.1.10: giữ ngữ cảnh khi đổi model

### Đã thay đổi gì

- Tách nội dung hiển thị đã thu gọn khỏi `contextContent` nguyên bản, nên pasted block vẫn hiện `~ N lines` trong TUI nhưng model nhận đủ nội dung.
- Mỗi TARGET mới nhận các lượt USER/ASSISTANT gần nhất, kể cả sau khi đổi model bằng `/models`.
- Giới hạn cầu nối hội thoại ở 24.000 ký tự gần nhất để tránh prompt tăng không giới hạn.
- Không đưa welcome message hoặc system activity/debug events vào context.
- Economy Router dùng TARGET hiện tại cùng user task gần nhất để giữ đúng specialist khi người dùng nói “tiếp tục task”.
- Bump version từ `0.1.9` lên `0.1.10`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/types/message.ts`
- `src/tests/slashCommands.test.ts`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.10`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- Regression test xác nhận pasted block dùng bản raw trong context và lượt “tiếp tục task” nhận đủ USER/ASSISTANT trước đó.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Ảnh của request cũ vẫn được xóa sau khi request kết thúc; cầu nối hiện giữ nội dung text, không gửi lại binary ảnh cũ.

## Cập nhật v0.1.11: tự kiểm tra và đề xuất model free

### Đã thay đổi gì

- Khi mở `/models`, PXHVibe tự probe song song toàn bộ model free bằng prompt không dùng tool.
- Mode picker hiển thị `checking`, `online + độ trễ` hoặc `offline`; model online phản hồi nhanh nhất được đánh dấu `★ ĐỀ XUẤT` và tự focus.
- Kết quả được cache 10 phút trong phiên để không tốn request khi mở lại `/models` liên tục.
- Nếu không model nào phản hồi, TUI hiển thị cảnh báo đỏ và gợi ý dùng Custom API; PXHVibe không tự đổi model.
- Health probe có timeout riêng 30 giây, không thay đổi timeout 120 giây của task coding.
- Cho phép inject health checker giả trong regression test để test không gọi cloud hoặc tiêu tốn quota.
- Bump version từ `0.1.10` lên `0.1.11`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/ModePicker.tsx`
- `src/providers/OpenCodeProvider.ts`
- `src/utils/modelHealth.ts`
- `src/tests/modes.test.ts`
- `src/tests/slashCommands.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.11`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- Mode tests xác nhận chọn model online nhanh nhất và cache hết hạn sau 10 phút; command tests xác nhận UI hiện `online` và `ĐỀ XUẤT` mà không gọi cloud thật.
- Live probe trước khi triển khai xác nhận 7/8 model free online; Ling 3.0 Tiny trả server error.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Health check dùng request thật tới cloud và phản ánh tình trạng tại thời điểm kiểm tra; độ trễ có thể thay đổi giữa các lần chạy.

## Cập nhật v0.1.12: giữ nguyên clipboard và đếm đúng dòng

### Đã thay đổi gì

- Sửa nguyên nhân clipboard dài một dòng vật lý luôn hiện `~ 1 lines`: bộ đếm mới tính cả newline thật và dòng wrap theo chiều rộng composer.
- Chuẩn hóa nhãn tiếng Việt thành `~X dòng` trong composer và message USER sau khi gửi.
- Giữ nguyên raw clipboard, bao gồm indentation, khoảng trắng và newline, trong `[PASTED BLOCK]` chuyển cho model; chỉ phần hiển thị TUI được thu gọn.
- Đổi nhãn `pasted blocks cũ` thành `clipboard cũ`.
- Bump version từ `0.1.11` lên `0.1.12`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/PromptInput.tsx`
- `src/utils/pastedText.ts`
- `src/tests/imageClipboard.test.ts`
- `src/tests/slashCommands.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.12`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- Regression tests xác nhận text dài 161 ký tự ở width 80 hiện `~3 dòng`, JSON giữ nguyên indentation và bracketed paste 4 dòng hiện `~4 dòng`.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Số dòng wrap phụ thuộc chiều rộng terminal tại thời điểm paste/gửi; resize terminal có thể làm số dòng hiển thị thay đổi ở lượt mới.

## Cập nhật v0.1.13: sửa timeout giả ở task dài

### Đã thay đổi gì

- Sửa root cause timeout bị tính tuyệt đối từ lúc request bắt đầu dù model vẫn stream activity/tool output.
- Chuyển sang inactivity timeout: mỗi stdout/stderr mới sẽ reset timer; task có thể chạy lâu miễn là vẫn có hoạt động.
- Tăng mặc định từ 120 giây tổng thời gian lên 300 giây không có hoạt động; `PXH_REQUEST_TIMEOUT_MS` vẫn có thể tùy chỉnh.
- Cập nhật thông báo thành “không có hoạt động trong X giây”, không còn khẳng định sai rằng model không phản hồi.
- Sửa `cancel()` để dọn timer và listener ngay, tránh timer giữ tiến trình Node sau Ctrl+C.
- Health check `/models` vẫn dùng timeout riêng 30 giây.
- Bump version từ `0.1.12` lên `0.1.13`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/providers/OpenCodeProvider.ts`
- `src/tests/openCodeProvider.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.13`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- Regression test xác nhận `touch()` lần hai hủy timer cũ, lập timer mới và chỉ callback mới làm inactivity timeout hết hạn.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Nếu runtime thực sự không phát bất kỳ stdout/stderr nào liên tục 300 giây, PXHVibe vẫn hủy request để tránh treo vô hạn.

## Cập nhật v0.1.14: nhấn ESC hai lần để hủy task

### Đã thay đổi gì

- Khi agent đang chạy, ESC lần đầu arm thao tác trong 1 giây và TUI hiện “Nhấn ESC lần nữa để hủy task.”
- ESC lần hai trong cửa sổ đó hủy request hiện tại nhưng giữ PXHVibe mở; nếu quá 1 giây thì tự disarm.
- Footer và trạng thái composer hiển thị shortcut `Esc×2 hủy`.
- Sửa Free provider để `cancel()` reject Promise bằng `AbortError`, dọn child/timer/listener và cho `handleSubmit` đi tới `finally` thay vì treo nền.
- Lỗi hủy được xử lý thành system message thường “Đã hủy task hiện tại.” và Header trở về Ready, không hiện cảnh báo đỏ.
- Custom API dùng AbortController cũng được nhận diện cùng luồng cancellation.
- Bump version từ `0.1.13` lên `0.1.14`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/providers/OpenCodeProvider.ts`
- `src/tests/imageClipboard.test.ts`
- `src/tests/slashCommands.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công trên `pxhvibe@0.1.14`.
- `npm.cmd test`: thành công; toàn bộ 11 nhóm test đều qua.
- Ink input regression test xác nhận ESC đầu chỉ arm/hiện nhắc và ESC thứ hai mới gọi cancel đúng một lần.
- Cancellation assertions xác nhận AbortError được nhận diện nhưng lỗi mạng không bị nhận nhầm.
- `git diff --check`: không phát hiện lỗi whitespace trong patch.

### Vấn đề còn lại

- Double ESC chỉ hoạt động khi composer đang ở trạng thái agent busy; ở model/agent picker, ESC vẫn đóng picker như trước.
