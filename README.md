# PXHVibe

Terminal coding agent bằng TypeScript, React và Ink.

## Cài đặt

Yêu cầu Node.js 22 trở lên và npm.

```bat
npm install --global pxhvibe
pxh
```

PXHVibe chạy trong working directory hiện tại. Nên commit source trước khi giao
tác vụ lớn vì Free mode có thể đọc, tạo và chỉnh sửa file.

## Chọn mode

Trong TUI, gõ:

```text
/models
```

Dùng `↑`/`↓`, Enter để chọn và Esc để đóng. Các mode gồm:

- Big Pickle Free và các cloud coding model miễn phí khác.
- Custom API tương thích OpenAI Responses API.

Tên model/runtime nội bộ không được hiển thị trong Header hoặc menu; giao diện chỉ
hiển thị tên mode PXHVibe thân thiện.

## Custom API

Chọn `Custom API` trong `/models`, sau đó nhập:

1. Base URL, ví dụ `https://example.com/v1`.
2. Model ID của endpoint.
3. API key.

API key được che khi nhập, chỉ giữ trong bộ nhớ của process và không được ghi vào
message, log hoặc file. Endpoint phải hỗ trợ OpenAI Responses API và function
calling để coding tools hoạt động.

Có thể cấu hình trước bằng biến môi trường:

```bat
set PXH_CUSTOM_BASE_URL=https://example.com/v1
set PXH_CUSTOM_MODEL=your-model
set PXH_CUSTOM_API_KEY=your-secret-key
pxh --provider=custom
```

## Phím điều khiển

- `Enter`: gửi prompt.
- `Backspace` hoặc `Delete`: xóa ký tự.
- `Alt+V` hoặc `/paste`: đính kèm ảnh đang có trong clipboard Windows và hiện thumbnail màu trong TUI.
- Lăn con lăn chuột hoặc kéo thanh cuộn bên phải: xem lịch sử theo trục dọc.
- `PageUp` / `PageDown`: xem lịch sử cũ hoặc trở về hội thoại mới nhất bằng bàn phím.
- `←` / `→` / `Home` / `End`: di chuyển con trỏ soạn thảo; `↑` / `↓` di chuyển theo dòng wrap.
- Click vào text trong `NEW TARGET`: đặt con trỏ tại vị trí muốn sửa.
- `Shift+Enter`: chèn dòng mới; `Enter`: gửi TARGET.
- Clipboard dài hiện thành `~X dòng` theo cả newline và dòng wrap của composer; định dạng đầy đủ vẫn được giữ nguyên khi chuyển cho model.
- `Alt+C` hoặc `/copy`: copy response gần nhất vào Windows Clipboard.
- Giữ `Shift`, bôi chọn nội dung trong terminal rồi nhấn `Ctrl+C` để copy đoạn tùy chọn.
- Input text chỉ hiển thị tối đa 5 dòng; dùng `↑`/`↓` hoặc mouse wheel trong input để cuộn.
- Khi ô nhập trống, `Backspace` hoặc `Delete`: bỏ ảnh đính kèm cuối cùng (tối đa 4 ảnh mỗi TARGET).
- `/models`: tự kiểm tra model free, hiển thị online/offline và đề xuất model phản hồi nhanh nhất.
- `/agents`: chọn specialist hoặc Economy Router tự động.
- `/skills`: xem skill đang được PXHVibe khám phá và tự kích hoạt theo TARGET.
- `/workflows`: xem workflow có thể được router tự chọn.
- `/help`: xem slash command hỗ trợ.
- `Ctrl+C`: thoát.

### Keymap TUI

- `Enter`: gửi TARGET.
- `Shift+Enter`: xuống dòng.
- `Esc` hai lần trong 1 giây: hủy task đang chạy nhưng giữ TUI mở.
- `←` / `→` / `↑` / `↓`, `Home`, `End`: di chuyển con trỏ.
- `PageUp` / `PageDown` hoặc con lăn chuột: xem lịch sử.
- `Alt+V`: dán ảnh; `Ctrl+C`: dừng và thoát.
- Các chức năng khác dùng slash command: `/models`, `/agents`, `/skills`, `/workflows`, `/copy`, `/help`.

Ảnh clipboard được sao chép vào file tạm, gửi cùng TARGET rồi tự động xóa. Model đang chọn
phải hỗ trợ vision; nếu model không nhận ảnh, hãy đổi model bằng `/models`.
VS Code giữ `Ctrl+V` ở lớp terminal nên PXHVibe không nhận được phím này khi clipboard là ảnh;
hãy dùng `Alt+V` hoặc `/paste` trong VS Code. `Ctrl+V` vẫn được nhận ở terminal nào chuyển tiếp phím đó.

Free request chỉ tự dừng khi không có text hoặc activity mới trong 300 giây; activity mới sẽ gia hạn timer. Có thể thay đổi
bằng `PXH_REQUEST_TIMEOUT_MS` (milliseconds, tối thiểu 1000).

## Skills, agents và workflows

PXHVibe v0.6.0 tự đọc `AGENTS.md` theo phạm vi project và khám phá cấu hình tại các vị trí sau:

- Skills: `.pxhvibe/skills/*/SKILL.md`, `.agents/skills/*/SKILL.md`, `.opencode/skills/*/SKILL.md` hoặc `skills/*/SKILL.md`.
- Agents: `.pxhvibe/agents/*.md`, `.agents/agents/*.md`, `.opencode/agents/*.md` hoặc `agents/*.md`.
- Workflows: các file `*.workflow.md` trong những thư mục `workflows` tương ứng.

`SKILL.md` dùng YAML frontmatter tối thiểu với `name`, `description` và tùy chọn `triggers`.
Workflow có thể thêm `agent`, `skills` và `triggers`. Economy Router tự chọn một workflow, tối đa ba
skill phù hợp và agent ưu tiên, sau đó đưa nguyên chỉ dẫn vào prompt BUILD. PXHVibe cũng có sẵn các
capability pack để dùng ngay khi project chưa khai báo cấu hình riêng.

### Capability pack v0.6.0

- 10 agents: PM Auto, Expert, Bug Hunter, Architect, QA, Reviewer, DevOps, UI/UX, Guide và Historian.
- Runtime 4 tầng: Interface → Orchestration → Workers → Infrastructure.
- 8 workflows: AI, Company, Debug, Game, Meeting, Release, Tool và Web.
- 50 skills thuộc AI, game, process, tool, UI/UX và web.
- 6 runtime contracts: Request, Task, Result, Response, Event và State.
- Mỗi TARGET tạo pipeline phase có agent phụ trách; ví dụ lỗi dùng `analyze → fix → test → review → persist`.
- Auto-router ưu tiên tín hiệu miền mạnh: gameplay/player/enemy chọn Game dù spec có HTML5, web UI hoặc frontend.
- Prompt trước chỉ ảnh hưởng routing khi TARGET mới bắt đầu bằng `tiếp tục`, `làm tiếp` hoặc từ tương đương.

Các lệnh kiểm tra:

- `/status`: xem số lượng capability đang tích hợp.
- `/pipeline`: xem phase/agent của TARGET gần nhất.
- `/validate`: kiểm tra tính toàn vẹn của capability pack.

### Full capability assets

PXHVibe bundle trực tiếp bộ Markdown và template MIT trong npm package:

- `resources/agents/*.md`: 10 agent role đầy đủ.
- `resources/skills/*/SKILL.md`: 50 skill đầy đủ cùng templates/helper của từng skill.
- `resources/workflows/*.workflow.md`: 8 workflow đầy đủ.
- `resources/_shared/`: core rules, design system, phase config và shared scripts/templates.

Discovery load bộ bundled trước, sau đó project có thể bổ sung hoặc override bằng `.pxhvibe/`,
`.agents/`, `.opencode/` hoặc thư mục gốc. Router chỉ nạp workflow, tối đa ba skill và các agent
handoff liên quan tới TARGET; referenced template được lazy-load để tránh tràn context. Source path
tuyệt đối của từng asset được đưa vào prompt để worker có thể truy xuất file thật.

### Native team execution runtime

Mỗi TARGET được chạy thành nhiều phase thật thay vì chỉ mô phỏng pipeline trong giao diện. Ví dụ workflow Debug chạy lần lượt PM phân tích, Bug Hunter sửa lỗi, QA kiểm tra, Reviewer review và Historian lưu kết quả. Mỗi phase là một request riêng, nhận đầy đủ Markdown của agent, skill/workflow phù hợp và handoff từ phase trước.

- Enforcement gate kiểm tra thứ tự phase và evidence đầu ra.
- Sáu contract Event, Result, Response, Config, Tools và Agent được validate trong runtime.
- Lỗi tạm thời được retry tối đa hai lần; quota, image capability và thao tác hủy không bị retry mù.
- Checkpoint được ghi atomically tại `.pxhvibe/runtime-state.json`; dùng `/resume` để tiếp tục từ phase lỗi hoặc `/retry` để chạy lại TARGET gần nhất.
- Có 23 lệnh native: `/help`, `/models`, `/agents`, `/skills`, `/workflows`, `/status`, `/pipeline`, `/validate`, `/paste`, `/copy`, `/cancel`, `/retry`, `/new`, `/resume`, `/session`, `/context`, `/detect`, `/doctor`, `/diff`, `/history`, `/version`, `/about`, `/clear`.
- CLI hỗ trợ `pxh --version` và `pxh --help` mà không khởi động TUI.

Nên thêm `.pxhvibe/` vào `.gitignore` nếu không muốn commit checkpoint phiên làm việc.

### Context tự quản lý

Header hiển thị `CTX n%` theo cửa sổ hội thoại 24.000 ký tự của PXHVibe (token chỉ là ước lượng vì provider miễn phí không trả usage chuẩn). Khi đầy, PXHVibe tự giữ TARGET gốc cùng các lượt gần nhất và hiện `CTX 100% ↻`; prompt phase cũng được chặn ở ngân sách an toàn để tránh lỗi context quá dài.

Lỗi tạm thời được tự tiếp tục tối đa ba lượt. Nếu TUI hoặc terminal đóng giữa pipeline, lần chạy `pxh` tiếp theo tự đọc checkpoint và tiếp tục session `fail/running` mà không cần gõ `/resume`. Session do người dùng chủ động hủy không tự chạy lại; `/resume` vẫn được giữ làm phương án thủ công.

## Development

```bat
npm install
npm run typecheck
npm test
npm run dev
```

### Tên tab trong VS Code

PXHVibe gửi terminal title `PXHVibe` qua ANSI OSC. VS Code mặc định lại hiển thị tên
foreground process (`node`). Để tab dùng title do PXHVibe gửi, thêm vào VS Code
User Settings JSON:

```json
"terminal.integrated.tabs.title": "${sequence}"
```

## Phát hành

```bat
npm pack --dry-run
npm publish
```

## Attribution

PXHVibe bundles the MIT-licensed `opencode-ai` runtime for its Free mode. This
attribution is retained for license transparency; runtime branding is not exposed
as part of the end-user TUI.

PXHVibe's local Economy Router and specialist-role design are inspired by the
MIT-licensed [pxhopencode](https://github.com/kitajima2910/pxhopencode) project;
the implementation in this package is native to PXHVibe.

The bundled capability Markdown/templates are vendored from pxhopencode commit
`0d712cf1b2dd59eaf40d225b6254f251762e2941`. The original MIT license and detailed
attribution are retained in `resources/LICENSE.pxhopencode` and `resources/ATTRIBUTION.md`.
