# STATUS

## Đã thay đổi gì

- Hoàn thành Step 2 với lớp AI provider độc lập khỏi component giao diện.
- Thêm Mock provider phản hồi bất đồng bộ sau 400 ms.
- Thêm OpenCode provider dùng `spawn()` với argument array, `shell: false`, working directory hiện tại, thu thập stdout/stderr và loại bỏ ANSI.
- Thêm lựa chọn `--provider=mock|opencode`, mặc định là `mock`, cùng thông báo ngắn gọn cho provider không hợp lệ.
- Nối provider vào TUI: giữ lịch sử, hiển thị `Thinking...`, khóa input khi bận, thêm assistant/system message và cho phép thử lại sau lỗi.
- Ctrl+C dừng child process đang chạy trước khi unmount Ink.
- Cập nhật README với cách chạy hai provider và cảnh báo chế độ OpenCode `--auto`.

## File đã tạo hoặc chỉnh sửa

- `src/providers/AIProvider.ts`
- `src/providers/MockProvider.ts`
- `src/providers/OpenCodeProvider.ts`
- `src/providers/createProvider.ts`
- `src/types/provider.ts`
- `src/utils/stripAnsi.ts`
- `src/app.tsx`
- `src/cli.tsx`
- `src/components/Header.tsx`
- `src/components/PromptInput.tsx`
- `README.md`
- `STATUS.md`

## Provider đã hỗ trợ

- `mock` (mặc định): không chạy command và không sửa file.
- `opencode`: chạy `opencode run --agent build --auto <prompt>` trong working directory hiện tại.

## Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd run build`: thành công.
- Mock provider qua stdin TTY mô phỏng: header hiển thị `Mock`; prompt `xin chào` trả về `Mock response: xin chào`; trạng thái chuyển `Thinking...` rồi về `Ready`; Ctrl+C thoát sạch.
- Provider không hợp lệ: thoát với mã 1, hiển thị hai giá trị hợp lệ và không có stack trace.
- `opencode --version`: thành công ngoài sandbox, phiên bản `1.18.15`.
- Nhánh không tìm thấy executable của OpenCode provider: trả đúng lỗi tiếng Việt yêu cầu, không có stack trace.

## Vấn đề còn lại

- Không chạy prompt OpenCode end-to-end vì môi trường không cho phép gửi nội dung hoặc metadata project tới dịch vụ ngoài khi chưa có phê duyệt rõ ràng.
- Bản OpenCode trên máy được cài qua npm shim `.cmd`; `spawn('opencode', ..., {shell: false})` không tự phân giải shim này trên Windows. Provider tuân thủ yêu cầu executable `opencode` và cần `opencode.exe` có trên PATH để chạy trong cấu hình hiện tại.
- Shell kiểm thử tự động không cấp raw TTY; kiểm thử tương tác Mock dùng stdin TTY mô phỏng.
