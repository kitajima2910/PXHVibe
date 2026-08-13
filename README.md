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
- `/models`: chọn model/mode.
- `/agents`: chọn specialist hoặc Economy Router tự động.
- `/help`: xem slash command hỗ trợ.
- `Ctrl+C`: thoát.

Free request tự dừng sau 120 giây nếu cloud model không phản hồi. Có thể thay đổi
bằng `PXH_REQUEST_TIMEOUT_MS` (milliseconds, tối thiểu 1000).

## Development

```bat
npm install
npm run typecheck
npm test
npm run dev
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
