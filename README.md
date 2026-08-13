# PXHVibe

MVP giao diện terminal cho ứng dụng vibe coding, xây dựng bằng TypeScript, React và Ink.

## Yêu cầu

- Node.js 20 trở lên
- npm

## Cài đặt

```sh
npm install
```

## Chạy development

### Chạy Mock

```bat
npm run dev -- --provider=mock
```

### Chạy OpenCode

```bat
opencode --version
npm run dev -- --provider=opencode
```

OpenCode phải được cài đặt và đăng nhập trước. Provider `opencode` chạy agent
`build` trong working directory hiện tại. Chế độ `--auto` có thể đọc, tạo và
chỉnh sửa file trong project; nên commit source trước khi giao tác vụ lớn.

## Build và chạy bản build

```sh
npm run build
npm start
```

## Phím điều khiển

- `Enter`: gửi prompt
- `Backspace` hoặc `Delete`: xóa ký tự
- `Ctrl+C`: thoát ứng dụng
