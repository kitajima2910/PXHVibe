# STATUS

## Đã thay đổi gì

- Chuẩn bị package npm public `pxhvibe` với bin `pxh`, `prepack`, Node.js engine và metadata phát hành.
- Bundle `opencode-ai` làm runtime dependency để người dùng không phải cài OpenCode CLI riêng.
- Thêm slash command `/modes` mở menu TUI; hỗ trợ ↑/↓, Enter và Esc để chuyển mode không cần khởi động lại.
- Thêm catalog bảy model OpenCode Zen free cùng Native OpenAI và Mock mode.
- Chuyển provider mặc định của `pxh` sang wrapper OpenCode CLI dùng model Zen miễn phí `opencode/mimo-v2.5-free`.
- Thêm `--model=<provider/model>` và `PXH_OPENCODE_MODEL` để chọn model OpenCode khác.
- Sửa Windows wrapper để tìm và spawn trực tiếp `opencode.exe` với `shell: false`, không phụ thuộc npm shim `.cmd`.
- Thêm `--pure` để wrapper không nạp plugin OpenCode ngoài và chạy ổn định, cô lập hơn.
- Hoàn thành Native Agent MVP để PXHVibe có thể vibe code mà không phụ thuộc OpenCode CLI.
- Thêm `AgentRuntime` thực hiện vòng lặp model → tool → model, giới hạn tối đa 12 lượt và giữ `previous_response_id` giữa các prompt.
- Thêm adapter Responses API bằng OpenAI SDK chính thức, hỗ trợ streaming text và hủy request bằng AbortController.
- Thêm năm workspace tool: `list_files`, `read_file`, `search_text`, `apply_patch`, `git_diff`.
- Giới hạn file tool trong working directory, bỏ qua symlink khi duyệt, giới hạn kích thước/output và chặn path traversal.
- TUI hiển thị text streaming cùng trạng thái bắt đầu/hoàn tất tool.
- Thêm provider `native` và đặt làm mặc định; giữ `mock` và `opencode` để tương thích.
- Thêm command global `pxh` qua npm bin/npm link.
- Cập nhật README với cấu hình `OPENAI_API_KEY`, `PXH_MODEL` và cách chạy Native Agent.

## File đã tạo hoặc chỉnh sửa

- `package.json`
- `package-lock.json`
- `src/agent/types.ts`
- `src/agent/ModelProvider.ts`
- `src/agent/OpenAIModelProvider.ts`
- `src/agent/AgentRuntime.ts`
- `src/agent/tools/workspaceTools.ts`
- `src/providers/NativeAgentProvider.ts`
- `src/providers/OpenCodeProvider.ts`
- `src/providers/createProvider.ts`
- `src/modes.ts`
- `src/components/ModePicker.tsx`
- `src/components/Footer.tsx`
- `src/types/provider.ts`
- `src/app.tsx`
- `src/tests/nativeAgent.test.ts`
- `src/tests/openCodeProvider.test.ts`
- `README.md`
- `STATUS.md`

## Provider đã hỗ trợ

- `opencode` (mặc định): wrapper OpenCode CLI, mặc định dùng `opencode/mimo-v2.5-free`.
- `native`: gọi OpenAI Responses API trực tiếp và tự chạy coding tools của PXHVibe.
- `mock`: phản hồi giả, không gọi mạng và không sửa file.

## Kết quả kiểm tra

- Tên package `pxhvibe`: chưa tồn tại trên npm tại thời điểm kiểm tra.
- `npm pack --dry-run`: thành công; tarball có bin/runtime và kích thước khoảng 12 KB, chưa tính dependencies.
- Cài tarball global vào prefix tạm: thành công; tạo đủ `pxh`, `pxh.cmd`, `pxh.ps1` và cài 43 packages.
- Bản cài cô lập tìm đúng `node_modules/pxhvibe/node_modules/opencode-ai/bin/opencode.exe`.
- `pxh.cmd --provider=invalid` từ bản cài cô lập: chạy đúng entrypoint và exit code 1.
- `/modes` qua stdin TTY mô phỏng: menu hiện model free và chọn MiMo thành công; Header cập nhật provider ngay.
- `npm.cmd test`: thành công.
- `opencode models opencode`: thành công; máy hiện thấy 8 model Zen miễn phí.
- `npm.cmd run test:opencode`: thành công; xác nhận provider/model mặc định và tìm đúng `opencode.exe` trên Windows.
- OpenCode wrapper smoke test trong thư mục tạm rỗng: `mimo-v2.5-free` timeout sau 120 giây; `deepseek-v4-flash-free` timeout sau 60 giây; không có output hoặc lỗi xác thực. Các child process thử nghiệm đã được dừng và thư mục tạm đã được dọn.
- `npm.cmd install openai`: thành công, không phát hiện vulnerability.
- `npm.cmd run typecheck`: thành công.
- `npm.cmd run build`: thành công.
- `npm.cmd run test:native`: thành công.
- Native agent fake-model: gọi `read_file`, trả tool output cho model, streaming câu trả lời và truyền đúng `previousResponseId`.
- `apply_patch`: sửa file, tạo file trong thư mục con và chặn đường dẫn `../` ra ngoài workspace.
- Thiếu `OPENAI_API_KEY`: trả lỗi cấu hình ngắn gọn, không crash.
- Mock TUI regression: `Thinking...`, phản hồi Unicode, trở về `Ready` và Ctrl+C đều thành công.
- `git diff --check`: thành công.

## Vấn đề còn lại

- Package đã sẵn sàng về mặt kỹ thuật nhưng chưa được publish lên npm; cần tài khoản npm có quyền publish tên `pxhvibe` và chạy `npm publish`.
- OpenCode Zen free được liệt kê và wrapper khởi chạy đúng executable/model, nhưng hai smoke test live không nhận phản hồi trước timeout. Cần thử lại trực tiếp bằng `pxh` hoặc `opencode run` khi dịch vụ/model phản hồi ổn định.
- Model Zen miễn phí và khả dụng có thể thay đổi theo thời điểm; dùng `opencode models opencode` để xem danh sách hiện tại và `--model=` để đổi.
- Chưa chạy API live vì không có bước cung cấp API key an toàn trong môi trường kiểm thử; agent loop được kiểm tra bằng fake model, không gửi source ra ngoài và không phát sinh chi phí.
- Native MVP chưa có confirmation dialog; `apply_patch` có thể sửa file trong workspace khi model gọi tool. Nên commit source trước khi dùng.
- Native MVP chưa có shell tool, model picker trong TUI, diff viewer hoặc lưu session qua lần khởi động mới.
- PowerShell trên máy kiểm thử chặn npm shim `.ps1`; dùng `pxh.cmd` hoặc Windows CMD nếu chưa thay đổi Execution Policy.
