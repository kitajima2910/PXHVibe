# PXHVibe CLI

**Terminal coding team chạy ngay trong project của bạn.**

[![npm version](https://img.shields.io/npm/v/pxhvibe.svg)](https://www.npmjs.com/package/pxhvibe)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

PXHVibe là coding agent viết bằng TypeScript, React và Ink. Một TARGET được xử lý trực tiếp bởi
single agent trong terminal, với bộ rule `hmcRules` (Tiếng Việt, patch tối thiểu, verify TARGET, ...).
Bạn có thể dùng Free mode đi kèm hoặc kết nối Custom API hỗ trợ OpenAI, Anthropic và Google Gemini,
đồng thời mở rộng khả năng bằng MCP của project.

Bản phát hành hiện tại: **v0.23.1**.

## Điểm nổi bật

- **Cài một lệnh:** chạy bằng binary `pxh` trong working directory hiện tại.
- **Hai provider:** Free mode tích hợp sẵn và Custom API hỗ trợ OpenAI, Anthropic (Claude) và Google Gemini.
- **Single agent đơn giản:** một request dùng `hmcRules` để sửa đúng TARGET, ghi diff kiểu git sau lượt chạy.
- **MCP native:** local stdio và remote Streamable HTTP; hoạt động với cả Free và Custom API.
- **Quick answer:** câu hỏi kiến thức/trò chuyện dùng một request trực tiếp, không vào chế độ coding.
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
4. Theo dõi activity và kết quả streaming trong task rail.
5. Xem diff tự động sau lượt chạy; dùng `/diff`, `/context` hoặc `/status` để kiểm tra thêm.

Câu hỏi như `React là gì?`, `giải thích hàm này` hoặc trò chuyện ngoài coding tự động dùng chế độ
`QUICK`: một request, không chạy tool. Yêu cầu có hành động lên project như sửa,
build, test, review, cập nhật version, commit hoặc deploy vẫn vào chế độ coding đầy đủ.

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

PXHVibe hiện ở simplified mode (`hmcRules` only). Các lệnh hoạt động:

| Nhóm | Lệnh |
| --- | --- |
| Chọn model | `/models` |
| Phiên | `/new`, `/resume`, `/retry`, `/clear` |
| Project | `/status`, `/mcp`, `/context`, `/detect`, `/doctor`, `/diff` |
| Tiện ích | `/paste`, `/copy`, `/cancel`, `/history`, `/version`, `/about`, `/help` |

Biến thể MCP nâng cao gồm `/mcp refresh` và `/mcp doctor`.

> **Lưu ý:** `/history` hiện đã tắt và chỉ trả về thông báo. Các lệnh cũ như `/agents`, `/skills`,
> `/workflows`, `/pipeline`, `/validate`, `/session` không còn được hỗ trợ ở simplified mode.

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

## Runtime (simplified mode)

PXHVibe hiện chạy single-agent dựa trên `hmcRules`: một request `buildAgentPrompt(target)`
bao gồm RULE, IDENTITY, COMPATIBILITY, OUTPUT FORMAT và TARGET. Không có pipeline nhiều phase,
specialist routing, agent/skill/workflow bundle hay economy router. TARGET được xử lý trực tiếp bởi
một lượt agent; tool MCP được expose qua native/agent runtime khi có cấu hình.

Hai chế độ:
- `QUICK`: câu hỏi kiến thức/trò chuyện — một request, không dùng tool, không sửa file.
- Coding: yêu cầu thao tác lên project — một request agent đầy đủ, có thể đọc/sửa file và dùng MCP.

Busy/activity được hiển thị ở task rail; sau lượt chạy PXHVibe tự lấy `git diff` và render kiểu GitHub.
Session checkpoint lưu tại `.pxhvibe/runtime-state.json`.

## Mở rộng theo project

Ở simplified mode, việc mở rộng gắn với **MCP** của project. Tạo `.pxhvibe/mcp.json` để
thêm local hoặc remote MCP servers (xem phần MCP ở trên). Không còn đọc bundle
agents/skills/workflows cũng như `AGENTS.md`; TARGET được xử lý trực tiếp theo `hmcRules`.

Nếu không muốn commit cấu hình MCP hoặc checkpoint session, thêm `.pxhvibe/` vào `.gitignore`.

## Giao diện, context và độ bền phiên

Lệnh `/context` hiển thị phần trăm, token ước tính, số ký tự đang hoạt động và trạng thái auto-compact
theo cửa sổ hội thoại 24.000 ký tự. Khi đầy, PXHVibe giữ TARGET gốc cùng các lượt gần nhất. Prompt
có budget riêng để bảo vệ model khỏi context quá dài; prompt Free mode được pipe qua stdin nên
không chạm giới hạn command line Windows.

Task rail hiển thị status agent và MCP bên cạnh, giữ trạng thái sau lượt chạy. History hội thoại có
scrollbar rộng, hỗ trợ wheel, click/drag và PageUp/PageDown. Unified diff sau lượt chạy dùng bố cục
GitHub Dark với tên file, thống kê thêm/xóa, hunk và số dòng cũ/mới. Activity monitor cảnh báo khi
agent im lặng lâu và provider watchdog kết thúc request bị treo thay vì chờ vô hạn.

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

Free mode bundle runtime `opencode-ai`. Một số thiết kế và asset được lấy cảm hứng hoặc vendored từ
dự án MIT [pxhopencode](https://github.com/kitajima2910/pxhopencode). License và attribution chi tiết
được giữ tại [`resources/LICENSE.pxhopencode`](resources/LICENSE.pxhopencode) và
[`resources/ATTRIBUTION.md`](resources/ATTRIBUTION.md).

---

Repository: [github.com/kitajima2910/PXHVibe](https://github.com/kitajima2910/PXHVibe) ·
npm: [npmjs.com/package/pxhvibe](https://www.npmjs.com/package/pxhvibe)
