# PXHVibe CLI

**Terminal coding team chạy ngay trong project của bạn.**

[![npm version](https://img.shields.io/npm/v/pxhvibe.svg)](https://www.npmjs.com/package/pxhvibe)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

PXHVibe là coding agent viết bằng TypeScript, React và Ink. Một TARGET được router thành
pipeline nhiều phase, giao cho các specialist phù hợp, lưu checkpoint và hiển thị tiến độ trực
tiếp trong terminal. Bạn có thể dùng Free mode đi kèm hoặc kết nối Custom API hỗ trợ OpenAI,
Anthropic và Google Gemini, đồng thời mở rộng khả năng bằng MCP, skills, agents và workflows của project.

Bản phát hành hiện tại: **v0.22.7**.

## Điểm nổi bật

- **Cài một lệnh:** chạy bằng binary `pxh` trong working directory hiện tại.
- **Hai provider:** Free mode tích hợp sẵn và Custom API hỗ trợ OpenAI, Anthropic (Claude) và Google Gemini.
- **Team runtime thật:** 10 specialist, 8 workflow, 50 skill và pipeline có retry/checkpoint.
- **MCP native:** local stdio và remote Streamable HTTP; hoạt động với cả Free và Custom API.
- **Project-aware:** tự đọc `AGENTS.md`, skill, agent và workflow riêng của repository.
- **Quick answer:** câu hỏi kiến thức/trò chuyện dùng một request trực tiếp, không chạy vibe pipeline.
- **TUI thực dụng:** streaming, activity monitor, task rail + MCP, diff kiểu GitHub, ảnh clipboard và scrollbar kéo bằng chuột.

## Cài đặt nhanh

Yêu cầu Node.js 22 trở lên.

### Windows

```bash
npm install --global pxhvibe
cd path/to/your-project
pxh
```

### macOS / Linux

```bash
npm install --global pxhvibe

# Nếu muốn sử dụng Free mode, cài thêm opencode-ai:
npm install --global opencode-ai

cd path/to/your-project
pxh
```

**Lưu ý cho macOS/Linux:**
- `opencode-ai` là optional dependency, có thể không tự động cài đặt trên một số hệ thống
- Nếu gặp lỗi "Không tìm thấy PXHVibe Free runtime", chạy: `npm install -g opencode-ai`
- Hoặc sử dụng Custom API (OpenAI/Anthropic/Gemini) với `/models` - không cần `opencode-ai`

### Chạy không cần cài global

```bash
npx pxhvibe
```

PXHVibe có thể tạo và chỉnh sửa file. Nên commit hoặc backup source trước khi giao một TARGET lớn.

## Bắt đầu trong 60 giây

1. Chạy `pxh` tại thư mục project.
2. Gõ `/models` để chọn Free mode hoặc Custom API.
3. Mô tả kết quả mong muốn, ví dụ: `sửa lỗi đăng nhập và thêm regression test`.
4. Theo dõi agent, phase, activity và checkpoint trong task rail.
5. Xem diff tự động sau pipeline; dùng `/diff`, `/pipeline`, `/history` hoặc `/context` để kiểm tra thêm.

Câu hỏi như `React là gì?`, `giải thích hàm này` hoặc trò chuyện ngoài coding tự động dùng chế độ
`QUICK`: một request, không chạy tool/pipeline/checkpoint. Yêu cầu có hành động lên project như sửa,
build, test, review, cập nhật version, commit hoặc deploy vẫn dùng vibe-coding pipeline đầy đủ.

Các tùy chọn CLI không mở TUI:

```bash
pxh --version
pxh --help
```

## Provider

| Mode | Thiết lập | Phù hợp khi |
| --- | --- | --- |
| Free | Chọn một trong 8 model Free tại `/models` | Muốn bắt đầu nhanh với OpenCode runtime (Windows thường dùng optional dependency; macOS/Linux có thể cần cài `opencode-ai`) |
| Custom API | Base URL, model ID, API key và provider | OpenAI-compatible Chat Completions, Anthropic Messages hoặc Google Gemini |

**Lưu ý:** Trên macOS/Linux, nếu Free mode báo lỗi "Không tìm thấy PXHVibe Free runtime", chạy:
```bash
npm install -g opencode-ai
```
Hoặc sử dụng Custom API với `/models` - không cần `opencode-ai`.

### Custom API

Chọn `Custom API` trong `/models`, chọn provider (OpenAI/Anthropic/Gemini) rồi nhập Base URL,
model ID và API key. Key được che khi nhập, chỉ giữ trong memory của process và không được ghi
vào message, log hoặc file. Endpoint cần hỗ trợ Chat Completions (OpenAI-compatible), Messages API
(Anthropic) hoặc Generative Language API (Gemini) để workspace/MCP tools hoạt động.

Có thể cấu hình trước bằng environment:

```bash
PXH_CUSTOM_BASE_URL=https://example.com/v1 \
PXH_CUSTOM_MODEL=your-model \
PXH_CUSTOM_API_KEY=your-secret-key \
PXH_CUSTOM_PROVIDER=openai \
pxh --provider=custom
```

PowerShell:

```powershell
$env:PXH_CUSTOM_BASE_URL = "https://example.com/v1"
$env:PXH_CUSTOM_MODEL = "your-model"
$env:PXH_CUSTOM_API_KEY = "your-secret-key"
$env:PXH_CUSTOM_PROVIDER = "openai"
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
    "neon": {
      "type": "remote",
      "url": "https://mcp.neon.tech/mcp"
    }
  }
}
```

### Kết nối MCP Server

**Local MCP Server (stdio):**

```json
{
  "servers": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."],
      "environment": {
        "CUSTOM_VAR": "value"
      },
      "cwd": "./subdir",
      "timeout": 30000
    }
  }
}
```

**Remote MCP Server với API Key:**

```json
{
  "servers": {
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

**Remote MCP Server với OAuth (tự động mở browser):**

PXHVibe hỗ trợ OAuth flow tự động cho remote MCP servers. Khi server yêu cầu authentication, browser sẽ tự động mở để bạn authorize:

```json
{
  "servers": {
    "neon": {
      "type": "remote",
      "url": "https://mcp.neon.tech/mcp"
    }
  }
}
```

Khi chạy PXHVibe lần đầu, browser sẽ mở trang authorization của Neon. Sau khi authorize, tokens được lưu vào `~/.pxhvibe/oauth-tokens.json` và tự động refresh khi hết hạn.

### Cấu hình MCP

Local server hỗ trợ:
- `command`: Mảng command và arguments
- `environment`: Biến môi trường cho server process
- `cwd`: Working directory cho server
- `timeout`: Timeout cho operations (ms)

Remote server hỗ trợ:
- `url`: URL của MCP server
- `headers`: HTTP headers (dùng `{env:TEN_BIEN}` để lấy secret từ environment)
- `timeout`: Timeout cho operations (ms)

Mọi server có thể đặt `disabled: true` để tắt.

### Lệnh MCP trong TUI

- `/mcp`: xem trạng thái và số tool đã discover
- `/mcp refresh`: nạp lại cấu hình và reconnect
- `/mcp doctor`: handshake và kiểm tra sức khỏe tất cả server

### Bảo mật MCP

> **Chỉ chạy MCP config từ project bạn tin cậy.** Local MCP server là process thật chạy với quyền của tài khoản hiện tại. Remote server có thể truy cập API của bạn.

Custom API chuyển MCP tools thành function tools trong native agent runtime. Free mode bridge cùng cấu hình sang OpenCode. OAuth tokens được lưu an toàn trong `~/.pxhvibe/` và tự động refresh.

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
| `Shift+Enter`, `Ctrl+Enter` hoặc `Ctrl+J` | Xuống dòng |
| `Esc` hai lần trong 1 giây | Dừng lượt hiện tại, giữ các thay đổi đã ghi |
| `←` `→`, `Home`, `End` | Di chuyển con trỏ |
| `↑` / `↓` | Di chuyển theo dòng; tại đầu/cuối composer sẽ duyệt lịch sử TARGET |
| `PageUp` / `PageDown`, mouse wheel | Cuộn lịch sử hội thoại |
| Click hoặc kéo scrollbar | Nhảy và kéo trong lịch sử hội thoại |
| `Alt+V` hoặc `/paste` | Đính kèm ảnh clipboard, tối đa 4 ảnh |
| `/copy` | Copy response gần nhất trên Windows |
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
khi mở lại PXHVibe; session bị người dùng chủ động hủy chỉ tiếp tục khi dùng `/resume`. Khi còn
checkpoint chưa hoàn tất, nhập `tiếp tục` hoặc `continue` cũng resume từ phase đang dở và thêm một
phase review cuối để kiểm tra toàn bộ kết quả tích hợp.

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

## Giao diện, context và độ bền phiên

Lệnh `/context` hiển thị phần trăm, token ước tính, số ký tự đang hoạt động và trạng thái auto-compact
theo cửa sổ hội thoại 24.000 ký tự. Khi đầy, PXHVibe giữ TARGET gốc cùng các lượt gần nhất. Prompt
phase có budget riêng để bảo vệ model khỏi context quá dài; prompt Free mode được pipe qua stdin nên
không chạm giới hạn command line Windows.

Task rail giữ trạng thái phase sau khi pipeline hoàn tất và hiển thị MCP bên cạnh. History có scrollbar
rộng, hỗ trợ wheel, click/drag và PageUp/PageDown. Unified diff sau lượt chạy dùng bố cục GitHub Dark
với tên file, thống kê thêm/xóa, hunk và số dòng cũ/mới. Activity monitor cảnh báo khi worker im lặng
lâu và provider watchdog kết thúc request bị treo thay vì chờ vô hạn.

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
