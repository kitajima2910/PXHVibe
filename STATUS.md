# STATUS

## Đã thay đổi gì

- Khởi tạo bộ khung MVP cho PXHVibe bằng TypeScript, React, Ink, npm và ESM.
- Tạo bốn vùng giao diện: Header, Message area, Input area và Footer.
- Thêm xử lý gửi prompt hợp lệ, xóa input sau khi gửi và thoát bằng Ctrl+C.
- Thêm `.gitignore` để loại trừ dependencies và output build khỏi Git.

## File đã sửa

- `package.json`
- `tsconfig.json`
- `README.md`
- `src/app.tsx`
- `src/cli.tsx`
- `src/components/Header.tsx`
- `src/components/MessageList.tsx`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/types/message.ts`
- `STATUS.md`
- `.gitignore`

## Kết quả kiểm tra

- `npm install`: thành công, không phát hiện vulnerability.
- `npm run typecheck`: thành công.
- `npm run build`: thành công.
- Runtime TUI với stdin TTY mô phỏng: render đủ bốn vùng, gửi prompt bằng Enter, hiển thị tin nhắn với role `You`, xóa input và thoát sạch bằng Ctrl+C.

## Vấn đề còn lại

- Shell kiểm thử tự động không cấp raw TTY, nên không thể chạy tương tác trực tiếp bằng `npm run dev` trong chính shell đó; luồng tương tác đã được xác minh bằng stdin TTY mô phỏng.
