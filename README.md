# PXHVibe CLI

**Terminal coding team chạy ngay trong project của bạn.**

[![npm version](https://img.shields.io/npm/v/pxhvibe.svg)](https://www.npmjs.com/package/pxhvibe)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

PXHVibe là coding agent viết bằng TypeScript, React và Ink. Một TARGET được router thành
pipeline nhiều phase, giao cho các specialist phù hợp, lưu checkpoint và hiển thị tiến độ trực
tiếp trong terminal. Bạn có thể dùng Free mode đi kèm hoặc kết nối API tương thích OpenAI
Responses, đồng thời mở rộng khả năng bằng MCP, skills, agents và workflows của project.

Bản phát hành hiện tại: **v0.17.0**.

## Điểm nổi bật

- **Cài một lệnh:** chạy bằng binary `pxh` trong working directory hiện tại.
- **Hai provider:** Free mode tích hợp sẵn và Custom API tương thích OpenAI Responses.
- **Team runtime thật:** 10 specialist, 8 workflow, 50 skill và pipeline có retry/checkpoint.
- **MCP native:** local stdio và remote Streamable HTTP; hoạt động với cả Free và Custom API.
- **Project-aware:** tự đọc `AGENTS.md`, skill, agent và workflow riêng của repository.
- **TUI thực dụng:** streaming, activity log, task rail, context meter, ảnh clipboard và mouse scroll.

## Cài đặt nhanh

Yêu cầu Node.js 22 trở lên.

```bash
npm install --global pxhvibe
cd path/to/your-project
pxh
```

Hoặc chạy không cần cài global:

```bash
npx pxhvibe
```

PXHVibe có thể tạo và chỉnh sửa file. Nên commit hoặc backup source trước khi giao một TARGET lớn.

## Bắt đầu trong 60 giây

1. Chạy `pxh` tại thư mục project.
2. Gõ `/models` để chọn Free mode hoặc Custom API.
3. Mô tả kết quả mong muốn, ví dụ: `sửa lỗi đăng nhập và thêm regression test`.
4. Theo dõi agent, phase, tool call và checkpoint trong TUI.
5. Dùng `/diff`, `/pipeline` hoặc `/history` để kiểm tra kết quả.

Các tùy chọn CLI không mở TUI:

```bash
pxh --version
pxh --help
```

## Provider

| Mode | Thiết lập | Phù hợp khi |
| --- | --- | --- |
| Free | Chọn model trong `/models` | Muốn bắt đầu nhanh với runtime được bundle sẵn |
| Custom API | Base URL, model ID và API key | Có endpoint tương thích OpenAI Responses API |

### Custom API

Chọn `Custom API` trong `/models` rồi nhập Base URL, model ID và API key. Key được che khi
nhập, chỉ giữ trong memory của process và không được ghi vào message, log hoặc file. Endpoint cần
hỗ trợ Responses API và function calling để workspace/MCP tools hoạt động.

Có thể cấu hình trước bằng environment:

```bash
PXH_CUSTOM_BASE_URL=https://example.com/v1 \
PXH_CUSTOM_MODEL=your-model \
PXH_CUSTOM_API_KEY=your-secret-key \
pxh --provider=custom
```

PowerShell:

```powershell
$env:PXH_CUSTOM_BASE_URL = "https://example.com/v1"
$env:PXH_CUSTOM_MODEL = "your-model"
$env:PXH_CUSTOM_API_KEY = "your-secret-key"
pxh --provider=custom
```

## MCP

Tạo `.pxhvibe/mcp.json` trong project:

```json
{
  "servers": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "remote-api": {
      "type": "remote",
      "url": "https://example.com/mcp",
      "headers": {
        "Authorization": "Bearer {env:MCP_TOKEN}"
      },
      "timeout": 30000
    }
  }
}
```

Local server hỗ trợ `command`, `environment`, `cwd`, `timeout`; remote server hỗ trợ `url`,
`headers`, `timeout`. Mọi server có thể đặt `disabled: true`. Dùng `{env:TEN_BIEN}` để lấy secret
từ environment thay vì lưu token trong repository.

- `/mcp`: xem trạng thái và số tool đã discover.
- `/mcp refresh`: nạp lại cấu hình.
- `/mcp doctor`: handshake và kiểm tra tất cả server.

Custom API chuyển MCP tools thành function tools trong native agent runtime. Free mode bridge cùng
cấu hình sang OpenCode. Remote header/token đã được hỗ trợ; PXHVibe chưa tự mở browser/callback cho
OAuth tương tác.

> Chỉ chạy MCP config từ project bạn tin cậy. Local MCP server là process thật chạy với quyền của
> tài khoản hiện tại.

## Lệnh trong TUI

PXHVibe có 24 slash command, chia thành bốn nhóm:

| Nhóm | Lệnh |
| --- | --- |
| AI | `/models`, `/agents`, `/skills`, `/workflows` |
| Phiên | `/new`, `/resume`, `/retry`, `/session`, `/history`, `/clear` |
| Project | `/status`, `/mcp`, `/pipeline`, `/validate`, `/context`, `/detect`, `/doctor`, `/diff` |
| Tiện ích | `/paste`, `/copy`, `/cancel`, `/version`, `/about`, `/help` |

Các biến thể MCP nâng cao là `/mcp refresh` và `/mcp doctor`.

## Phím điều khiển

| Phím | Tác vụ |
| --- | --- |
| `Enter` | Gửi TARGET |
| `Shift+Enter` | Xuống dòng |
| `Esc` hai lần trong 1 giây | Dừng lượt hiện tại, giữ các thay đổi đã ghi |
| `←` `→` `↑` `↓`, `Home`, `End` | Di chuyển con trỏ |
| `PageUp` / `PageDown`, mouse wheel | Cuộn history |
| `Alt+V` hoặc `/paste` | Đính kèm ảnh clipboard, tối đa 4 ảnh |
| `Alt+C` hoặc `/copy` | Copy response gần nhất trên Windows |
| `Ctrl+C` | Thoát |

Input hiển thị tối đa 5 dòng nhưng vẫn giữ nguyên nội dung đầy đủ. Pasted block dài được thu gọn
thành `~X dòng` trong composer. Ảnh clipboard được sao chép vào file tạm, gửi cùng TARGET rồi tự
xóa; model đang chọn phải hỗ trợ vision.

Free request có inactivity timeout mặc định 300 giây và được gia hạn khi có text/activity mới.
Đổi timeout bằng `PXH_REQUEST_TIMEOUT_MS` (milliseconds, tối thiểu 1000).

## Team runtime

Economy Router chọn workflow, tối đa ba skill và specialist phù hợp cho TARGET. Mỗi phase là một
request riêng, nhận rules, role, skill/workflow và handoff từ phase trước.

Ví dụ Debug pipeline:

```text
analyze → fix → test → review → persist
```

Capability pack được bundle trong npm package:

- 10 agents: PM Auto, Expert, Bug Hunter, Architect, QA, Reviewer, DevOps, UI/UX, Guide, Historian.
- 8 workflows: AI, Company, Debug, Game, Meeting, Release, Tool, Web.
- 50 skills cho AI, game, process, tooling, UI/UX và web.
- 6 runtime contracts và kiến trúc 4 tầng: Interface → Orchestration → Workers → Infrastructure.

Checkpoint được ghi atomically tại `.pxhvibe/runtime-state.json`. Session `fail/running` tự resume
khi mở lại PXHVibe; session bị người dùng chủ động hủy chỉ tiếp tục khi dùng `/resume`.

## Mở rộng theo project

PXHVibe đọc `AGENTS.md` theo phạm vi và khám phá asset tại:

| Loại | Vị trí hỗ trợ |
| --- | --- |
| Skills | `.pxhvibe/skills/*/SKILL.md`, `.agents/skills/*/SKILL.md`, `.opencode/skills/*/SKILL.md`, `skills/*/SKILL.md` |
| Agents | `.pxhvibe/agents/*.md`, `.agents/agents/*.md`, `.opencode/agents/*.md`, `agents/*.md` |
| Workflows | `*.workflow.md` trong các thư mục `workflows` tương ứng |

`SKILL.md` dùng YAML frontmatter với `name`, `description` và tùy chọn `triggers`. Workflow có thể
khai báo `agent`, `skills` và `triggers`. Asset project được merge sau bundled catalog nên có thể bổ
sung hoặc override capability mặc định.

Nếu không muốn commit checkpoint, MCP config hoặc capability riêng, thêm `.pxhvibe/` vào
`.gitignore`.

## Context và độ bền phiên

Header hiển thị `CTX n%` theo cửa sổ hội thoại 24.000 ký tự. Khi đầy, PXHVibe giữ TARGET gốc cùng
các lượt gần nhất và đánh dấu `CTX 100% ↻`. Prompt phase có budget riêng để bảo vệ model khỏi
context quá dài; prompt Free mode được pipe qua stdin nên không chạm giới hạn command line Windows.

Task rail giữ trạng thái phase sau khi pipeline hoàn tất. Activity monitor cảnh báo khi worker im
lặng lâu và provider watchdog kết thúc request bị treo thay vì chờ vô hạn.

## Development

```bash
git clone https://github.com/kitajima2910/PXHVibe.git
cd PXHVibe
npm install
npm run typecheck
npm test
npm run dev
```

Kiểm tra package trước khi phát hành:

```bash
npm run release:check
```

## License và attribution

PXHVibe được phát hành theo [MIT License](LICENSE).

Free mode bundle runtime `opencode-ai`. Economy Router, specialist-role design và capability assets
được lấy cảm hứng hoặc vendored từ dự án MIT
[pxhopencode](https://github.com/kitajima2910/pxhopencode). License và attribution chi tiết được giữ
tại [`resources/LICENSE.pxhopencode`](resources/LICENSE.pxhopencode) và
[`resources/ATTRIBUTION.md`](resources/ATTRIBUTION.md).

---

Repository: [github.com/kitajima2910/PXHVibe](https://github.com/kitajima2910/PXHVibe) ·
npm: [npmjs.com/package/pxhvibe](https://www.npmjs.com/package/pxhvibe)
