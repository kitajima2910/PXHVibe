# STATUS

## Đã thay đổi gì

- Sửa lỗi `/models` bị gửi nhầm thành AI prompt và làm UI kẹt ở `Thinking...`.
- Chỉ giữ `/models` để chọn model; `/modes` đã bị loại bỏ và được báo là lệnh không hợp lệ.
- Thêm timeout Free request mặc định 120 giây; hết hạn sẽ dừng child process và hướng dẫn chọn model khác.
- Hỗ trợ `PXH_REQUEST_TIMEOUT_MS` để điều chỉnh timeout.
- Đổi giao diện sang thương hiệu PXHVibe: Header hiển thị `Mode`, tên model thân thiện và không hiển thị tên engine hoặc model ID nội bộ.
- Thêm Big Pickle Free và giữ các cloud coding model miễn phí hiện có trong `/models`.
- Đổi model Free mặc định từ MiMo V2.5 sang Big Pickle vì MiMo không trả dữ liệu trong kiểm tra live, trong khi Big Pickle phản hồi bình thường.
- Sửa Free mode bị kẹt `Thinking...`: đóng stdin của child process ngay sau khi spawn để runtime nhận EOF và bắt đầu xử lý positional prompt.
- Xóa Mock khỏi provider contract, menu, source và build output.
- Thêm Custom API mode với form nhập Base URL, model và API key ngay trong TUI.
- API key Custom được che khi nhập, chỉ giữ trong bộ nhớ process và không ghi vào message, log hoặc file.
- Custom API sử dụng AgentRuntime cùng workspace tools hiện có và yêu cầu endpoint tương thích OpenAI Responses API/function calling.
- Hỗ trợ cấu hình Custom qua `PXH_CUSTOM_BASE_URL`, `PXH_CUSTOM_MODEL`, `PXH_CUSTOM_API_KEY`.
- Gỡ OpenAI API khỏi menu, provider contract và CLI; Free mode vẫn là mặc định.
- Bundle runtime miễn phí trong package npm; attribution MIT được giữ trong README nhưng không đưa branding runtime vào TUI.
- Thêm clean build để tarball không chứa artifact provider cũ.

## File đã tạo hoặc chỉnh sửa

- `package.json`
- `package-lock.json`
- `README.md`
- `src/app.tsx`
- `src/cli.tsx`
- `src/modes.ts`
- `src/types/provider.ts`
- `src/components/Header.tsx`
- `src/components/ModePicker.tsx`
- `src/components/CustomApiSetup.tsx`
- `src/providers/OpenCodeProvider.ts`
- `src/providers/CustomAgentProvider.ts`
- `src/providers/createProvider.ts`
- `src/agent/OpenAIModelProvider.ts`
- `src/tests/openCodeProvider.test.ts`
- `src/tests/modes.test.ts`
- `src/tests/customApiSetup.test.ts`
- `src/tests/slashCommands.test.ts`
- `STATUS.md`
- Đã xóa `src/providers/MockProvider.ts` và `src/providers/NativeAgentProvider.ts`.

## Mode đã hỗ trợ

- Free (mặc định): Big Pickle, MiMo V2.5, DeepSeek V4 Flash, Nemotron, Laguna, Hy3 và Ling.
- Custom API: endpoint tương thích OpenAI Responses API với Base URL/model/API key riêng.

## Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công.
- Free runtime test: tìm đúng executable bundled và tên Header thân thiện.
- Native Agent test: tool loop, session, sửa file và workspace boundary thành công.
- Mode catalog test: Big Pickle đứng đầu, có Custom API, không có Mock, không lộ engine trong description.
- Custom API setup test: API key được mask và không xuất hiện trong output render.
- Slash command test: `/models` mở menu; `/modes` và `/unknown` báo lỗi; không lệnh nào gọi provider.
- Timeout parser test: mặc định 120.000 ms.
- Clean build: `dist/providers/MockProvider.js` không còn tồn tại.
- Clean build: `dist/providers/NativeAgentProvider.js` không còn tồn tại.
- `npm.cmd install --global D:\PXHVibe`: thành công; lệnh `pxh` global đã cập nhật.
- `pxh --provider=mock`: bị từ chối; danh sách provider CLI chỉ còn `free, custom`.
- `pxh.cmd --provider=native`: bị từ chối với danh sách hợp lệ `free, custom`.
- Live probe trong thư mục Temp rỗng: MiMo V2.5 không có output sau 30 giây; Big Pickle trả lời thành công trong khoảng 6,5 giây.
- Root-cause probe: cùng lệnh Big Pickle chạy trực tiếp thành công nhưng qua `OpenCodeProvider` timeout vì stdin pipe còn mở.
- Post-fix live probe qua chính `OpenCodeProvider` tại `D:\test`: trả `xin chào` thành công trong 6,07 giây.

## Vấn đề còn lại

- Package chưa được publish lên npm; cần tài khoản npm và chạy `npm publish`.
- Free cloud model có thể chậm hoặc thay đổi khả dụng theo thời điểm.
- Custom endpoint phải hỗ trợ Responses API và function calling; endpoint chỉ hỗ trợ Chat Completions chưa dùng được với agent loop hiện tại.
- Free mode vẫn phải giữ attribution MIT trong tài liệu/package; chỉ phần giao diện end-user được ẩn branding runtime.
