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
- `/help`: xem slash command hỗ trợ.
- `Ctrl+C`: thoát.

### Keymap TUI

- `Enter`: gửi TARGET.
- `Shift+Enter`: xuống dòng.
- `←` / `→` / `↑` / `↓`, `Home`, `End`: di chuyển con trỏ.
- `PageUp` / `PageDown` hoặc con lăn chuột: xem lịch sử.
- `Alt+V`: dán ảnh; `Ctrl+C`: dừng và thoát.
- Các chức năng khác dùng slash command: `/models`, `/agents`, `/copy`, `/help`.

Ảnh clipboard được sao chép vào file tạm, gửi cùng TARGET rồi tự động xóa. Model đang chọn
phải hỗ trợ vision; nếu model không nhận ảnh, hãy đổi model bằng `/models`.
VS Code giữ `Ctrl+V` ở lớp terminal nên PXHVibe không nhận được phím này khi clipboard là ảnh;
hãy dùng `Alt+V` hoặc `/paste` trong VS Code. `Ctrl+V` vẫn được nhận ở terminal nào chuyển tiếp phím đó.

Free request chỉ tự dừng khi không có text hoặc activity mới trong 300 giây; activity mới sẽ gia hạn timer. Có thể thay đổi
bằng `PXH_REQUEST_TIMEOUT_MS` (milliseconds, tối thiểu 1000).

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
