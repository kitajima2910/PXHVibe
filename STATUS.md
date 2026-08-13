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
- Free mode dùng JSON event stream để TUI hiển thị quá trình thật: phân tích, tool đang chạy/hoàn tất và nội dung trả lời ngay khi runtime phát ra.
- Tự động bọc mọi prompt gửi từ TUI bằng coding RULE; nội dung người dùng được đặt nguyên vẹn trong `TARGET` cho cả Free và Custom API.
- Thiết kế lại TUI theo phong cách Matrix hacker: logo ASCII PXHVibe responsive, palette xanh, cyber borders, terminal prompt và dòng tác giả `Error404-Labs.Info.VN - Phạm Xuân Hoài`.
- Đơn giản hóa agent: bỏ `/plan` và `/build`; mọi specialist trong `/agents` luôn chạy BUILD và có thể triển khai TARGET.
- Tham khảo kiến trúc MIT của `kitajima2910/pxhopencode` để thêm Economy Router chạy local, `/agents` và 7 specialist roles native; không bundle runtime/skills pack của repo tham khảo.
- Format lại input/output TUI: message card riêng cho TARGET/OUTPUT, event compact, timestamp, command panel và renderer Markdown terminal cho heading/list/quote/inline code/code fence.
- Tinh gọn visual hierarchy theo phản hồi ảnh thực tế: bỏ text/shortcut trùng, status bar một dòng, border nhẹ hơn và khoảng cách card gọn hơn.
- Thêm boot animation ngắn, spinner khi agent chạy và đặt terminal/tab title thành `PXHVibe` bằng process title + ANSI OSC.
- Chạy TUI trong alternate screen full-height: ẩn prompt shell cũ như `D:\test>pxh` khi app hoạt động, đặt conversation co giãn và input ở đáy; khôi phục shell khi thoát.
- Ghi rõ cấu hình VS Code `${sequence}` cần thiết để tab dùng OSC title thay vì foreground process `node`.
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
- `src/components/Banner.tsx`
- `src/components/AgentPicker.tsx`
- `src/components/FormattedText.tsx`
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
- `src/utils/agentPrompt.ts`
- `src/agents.ts`
- `src/tests/agents.test.ts`
- `src/utils/terminalFormat.ts`
- `src/utils/terminalTitle.ts`
- `src/tests/terminalFormat.test.ts`
- `src/tests/terminalTitle.test.ts`
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
- JSON event probe: nhận đủ `step_start`, `tool_use`, `text`, `step_finish`; parser regression test bao phủ activity/tool/text.
- Live provider stream probe: phát 5 event theo thứ tự activity → tool start → tool complete → activity → text và tạo file Temp thành công.
- Prompt integration test: provider nhận đủ RULE và TARGET, trong khi slash command vẫn không bị gửi lên model.
- TUI render test: banner hiển thị đúng tên Error404-Labs.Info.VN và Phạm Xuân Hoài.
- Agent-mode tests: runtime luôn dùng agent `build` với auto tool và prompt luôn chứa `AGENT MODE: BUILD`.
- Economy Router tests: route đúng bug, UI/UX, QA, Expert và tôn trọng specialist được khóa thủ công.
- Terminal formatter tests: nhận đúng heading, blank, bullet, numbered list, quote và fenced code kèm language.
- Terminal title test: ANSI OSC được sanitize và phát đúng tiêu đề `PXHVibe`.
- Alternate-screen test: phát đúng enter/clear/home và restore sequences, restore idempotent.

## Vấn đề còn lại

- Package chưa được publish lên npm; cần tài khoản npm và chạy `npm publish`.
- Free cloud model có thể chậm hoặc thay đổi khả dụng theo thời điểm.
- Custom endpoint phải hỗ trợ Responses API và function calling; endpoint chỉ hỗ trợ Chat Completions chưa dùng được với agent loop hiện tại.
- Free mode vẫn phải giữ attribution MIT trong tài liệu/package; chỉ phần giao diện end-user được ẩn branding runtime.

## Cập nhật: Output branding firewall

### Đã thay đổi gì

- Thêm identity rule để agent luôn tự giới thiệu là PXHVibe và không nêu engine, runtime, provider hoặc model ID nội bộ.
- Thêm output firewall cho câu trả lời, activity, tool event và lỗi trước khi hiển thị trong TUI.
- Hỗ trợ lọc an toàn cả khi tên nội bộ bị chia giữa nhiều streaming chunk.
- Giữ nguyên attribution MIT trong README/package; chỉ che chi tiết triển khai khỏi output end-user.

### File đã sửa

- `src/app.tsx`
- `src/utils/agentPrompt.ts`
- `src/utils/outputBranding.ts`
- `src/tests/outputBranding.test.ts`
- `package.json`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công, gồm regression test cho output thường, URL/path nội bộ và streaming chunk bị chia nhỏ.

### Vấn đề còn lại

- Tên dependency/runtime vẫn tồn tại trong source, package lock và attribution theo yêu cầu kỹ thuật/pháp lý; không còn được render trong câu trả lời TUI.

## Cập nhật: Clipboard image và thumbnail TUI

### Đã thay đổi gì

- Thêm `Ctrl+V` và `/paste` để đọc ảnh hoặc file ảnh từ clipboard Windows.
- Hiển thị thumbnail true-color bằng ký tự half-block trong khung nhập và message TARGET đã gửi.
- Hỗ trợ tối đa 4 ảnh; khi input trống có thể dùng Backspace/Delete để bỏ ảnh cuối.
- Free mode gửi ảnh bằng file attachment; Custom API gửi ảnh bằng `input_image` của Responses API.
- Ảnh clipboard được lưu trong thư mục tạm riêng và tự động xóa sau request hoặc khi người dùng bỏ ảnh/thoát.

### File đã sửa

- `src/types/attachment.ts`
- `src/types/provider.ts`
- `src/types/message.ts`
- `src/utils/imageClipboard.ts`
- `src/components/ImageThumbnail.tsx`
- `src/components/PromptInput.tsx`
- `src/components/MessageList.tsx`
- `src/components/Footer.tsx`
- `src/app.tsx`
- `src/providers/OpenCodeProvider.ts`
- `src/providers/CustomAgentProvider.ts`
- `src/agent/types.ts`
- `src/agent/ModelProvider.ts`
- `src/agent/AgentRuntime.ts`
- `src/agent/OpenAIModelProvider.ts`
- `src/tests/imageClipboard.test.ts`
- `src/tests/openCodeProvider.test.ts`
- `README.md`
- `package.json`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công; gồm attachment arguments, clipboard payload và render thumbnail.
- Clipboard probe không thay đổi clipboard: cơ chế báo đúng lỗi thân thiện khi clipboard hiện không chứa ảnh.

### Vấn đề còn lại

- `Ctrl+V` có thể bị VS Code/terminal giữ lại; `/paste` là đường dự phòng ổn định.
- Khả năng phân tích ảnh phụ thuộc model vision đang chọn; PXHVibe không thể biến model text-only thành model vision.

## Cập nhật: Thumbnail rõ hơn và phím dán VS Code

### Đã thay đổi gì

- Tăng giới hạn thumbnail từ `24×12` lên `44×28` pixel màu, tương đương tối đa 44 cột × 14 dòng terminal.
- Bật pixel offset và compositing chất lượng cao khi thu nhỏ ảnh.
- Thêm `Alt+V` để PXHVibe nhận trực tiếp trong VS Code; vẫn giữ `/paste` và khả năng nhận `Ctrl+V` ở terminal có chuyển tiếp phím.
- Footer và tài liệu không còn hướng dẫn `Ctrl+V` như phím chính trong VS Code.

### File đã sửa

- `src/utils/imageClipboard.ts`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công; test mới xác nhận `Alt+V`, `Ctrl+V` khi được chuyển tiếp và không nhận nhầm phím khác.

### Vấn đề còn lại

- VS Code giữ `Ctrl+V` trước khi dữ liệu đến process terminal; không thể sửa từ bên trong PXHVibe. `Alt+V` và `/paste` là hai đường hoạt động trong VS Code.

## Cập nhật: Message timeline, thumbnail và Auto agent

### Đã thay đổi gì

- Tăng mẫu thumbnail lên tối đa `64×44` pixel màu và dùng High Quality Bilinear để giảm độ nhòe khi thu nhỏ avatar/UI.
- Đổi message card viền kín và nhãn dài thành timeline viền trái nhẹ với badge ngắn `YOU` / `PXH`.
- Rút gọn system event từ `◆ EVENT` lặp lại thành ký hiệu `↳`.
- Sửa Header bị đổi từ `PXH PM (Auto)` sang worker: Economy Router vẫn route specialist cho prompt nhưng Header luôn phản ánh agent người dùng đã chọn.

### File đã sửa

- `src/utils/imageClipboard.ts`
- `src/components/MessageList.tsx`
- `src/app.tsx`
- `src/tests/slashCommands.test.ts`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công; regression test xác nhận Header Auto không bị worker route ghi đè và nhãn message cũ đã được loại bỏ.

### Vấn đề còn lại

- Thumbnail ANSI phụ thuộc kích thước cell/font terminal nên không thể nét bằng ảnh raster trong GUI; tăng độ phân giải tiếp sẽ chiếm quá nhiều dòng/cột.

## Cập nhật: Conversation viewport

### Đã thay đổi gì

- Sửa danh sách message tràn xuống và ghi đè khung input khi hội thoại dài.
- Đặt vùng hội thoại thành flex viewport có `overflow: hidden`, luôn neo message mới nhất ở đáy.
- Thêm `PageUp` / `PageDown` để xem lịch sử theo từng nhóm 4 message và trở về cuối hội thoại.
- Thêm chỉ báo HISTORY khi người dùng đang xem phần cũ.

### File đã sửa

- `src/components/MessageList.tsx`
- `src/components/Footer.tsx`
- `src/tests/messageViewport.test.ts`
- `README.md`
- `package.json`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công, gồm viewport regression test với 10 message trong vùng cao 8 dòng.
- Regression test xác nhận message mới nhất được giữ lại, message cũ bị cắt và PageUp bật chỉ báo HISTORY.

### Vấn đề còn lại

- Lịch sử chỉ tồn tại trong bộ nhớ của phiên chạy hiện tại; chưa lưu session qua lần khởi động mới.

## Cập nhật: Mouse scrollbar và input editor

### Đã thay đổi gì

- Bật SGR mouse tracking và thêm thanh cuộn dọc ở cạnh phải conversation viewport.
- Hỗ trợ con lăn chuột, click/kéo thumb, PageUp và PageDown để xem lịch sử.
- Thumbnail dùng canvas cố định `50×50` pixel màu; ảnh được contain và căn giữa, không méo tỉ lệ.
- Ẩn con trỏ terminal vật lý ở cuối Footer và khôi phục khi thoát, loại bỏ hiện tượng hai con trỏ.
- Input có cursor index thật: chèn/xóa giữa chuỗi, Left/Right/Home/End, Up/Down theo dòng wrap và click để đặt vị trí sửa.
- Chặn mouse escape sequence lọt vào input hoặc form Custom API.

### File đã sửa

- `src/utils/mouse.ts`
- `src/utils/terminalTitle.ts`
- `src/utils/imageClipboard.ts`
- `src/components/MessageList.tsx`
- `src/components/PromptInput.tsx`
- `src/components/CustomApiSetup.tsx`
- `src/tests/terminalTitle.test.ts`
- `src/tests/messageViewport.test.ts`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công.
- Mouse/scroll tests xác nhận wheel event, thumb ở đầu/cuối track và HISTORY viewport.
- Editor tests xác nhận click mapping, di chuyển dọc và phím paste không nhận nhầm.
- Terminal lifecycle test xác nhận mouse mode + cursor hide được bật khi vào TUI và khôi phục đầy đủ khi thoát.

### Vấn đề còn lại

- Khi mouse tracking bật, chọn text native của terminal cần giữ Shift trong VS Code/Windows Terminal.

## Cập nhật: Collapsed paste và multiline input

### Đã thay đổi gì

- Dùng bracketed-paste channel của Ink để nhận nguyên block text, không trộn với từng key event.
- Text paste từ 4 dòng hoặc 300 ký tự tự thu gọn thành `PASTED BLOCK` gồm số dòng, số ký tự và preview một dòng.
- Nội dung đầy đủ vẫn được giữ nguyên để gửi model; `Ctrl+E`, click hoặc phím điều hướng sẽ mở block để chỉnh sửa.
- `Shift+Enter` chèn newline tại cursor; Enter thường mới submit TARGET.
- Footer hiển thị shortcut multiline mới.

### File đã sửa

- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công.
- Integration test gửi bracketed paste 4 dòng, xác nhận TUI render `PASTED BLOCK`, sau đó Shift+Enter + text + Enter gửi đúng nội dung multiline đầy đủ.
- Parser probe xác nhận Ink nhận Kitty `Shift+Enter` với `return=true, shift=true`; thêm fallback LF và legacy modified-enter sequence.

### Vấn đề còn lại

- Terminal không chuyển tiếp modifier Shift cho Enter sẽ cần dùng phím newline thay thế; VS Code Terminal hiện đại hỗ trợ modified Enter qua input protocol.

## Cập nhật: Immutable paste, version, copy và input viewport

### Đã thay đổi gì

- Bỏ hoàn toàn `Ctrl+E`/click mở pasted block; paste dài trở thành text attachment bất biến và luôn thu gọn.
- Bật Kitty keyboard protocol ở CLI để VS Code phân biệt `Shift+Enter`; vẫn giữ LF và legacy fallback.
- Thêm input viewport tối đa 5 dòng, tự theo cursor và nhận mouse wheel trong đúng vùng input.
- Thêm `/copy` và `Alt+C` để copy response gần nhất vào Windows Clipboard.
- Bump package từ `0.1.0` lên `0.1.1` và hiển thị `PXHVibe v0.1.1` trong Banner.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/version.ts`
- `src/cli.tsx`
- `src/app.tsx`
- `src/components/Banner.tsx`
- `src/components/PromptInput.tsx`
- `src/components/MessageList.tsx`
- `src/utils/clipboard.ts`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công trên package `0.1.1`.
- Input integration test xác nhận paste dài luôn hiện chip bất biến và nội dung đầy đủ được compose vào TARGET.
- Input viewport test xác nhận chỉ giữ 2/5 dòng mẫu quanh cursor, có hiddenAbove/hiddenBelow chính xác.
- Banner regression test xác nhận version đọc từ package và xuất hiện trong TUI.
- Kitty keyboard option được typecheck; modified Enter vẫn có ba đường parser: Kitty CSI-u, LF và legacy sequence.

### Vấn đề còn lại

- Pasted block cố ý không chỉnh sửa trực tiếp; Backspace khi input text trống sẽ bỏ block gần nhất.

## Cập nhật v0.1.2: Shift+Enter thực tế, paste summary và thumbnail 20

### Đã thay đổi gì

- Xác nhận VS Code keybinding hiện tại gửi `ESC + Enter`; Ink parse thành `return=true, meta=true`, không phải `shift=true`.
- Bổ sung chính xác biến thể `Meta+Enter` vào newline handler nên không cần sửa/ghi đè keybindings người dùng.
- Pasted text bất biến chỉ hiện `~ N lines` trong input và trong TARGET sau khi gửi; payload đầy đủ vẫn được route và gửi model.
- Footer gợi ý `Shift + bôi chọn + Ctrl+C` để copy đoạn tùy chọn trong terminal có mouse tracking.
- Giảm thumbnail canvas từ `50×50` xuống cố định `20×20` pixel màu.
- Bump version từ `0.1.1` lên `0.1.2`.

### File đã sửa

- `package.json`
- `package-lock.json`
- `src/app.tsx`
- `src/components/PromptInput.tsx`
- `src/components/Footer.tsx`
- `src/utils/imageClipboard.ts`
- `src/utils/pastedText.ts`
- `src/tests/imageClipboard.test.ts`
- `README.md`
- `STATUS.md`

### Kết quả kiểm tra

- `npm.cmd run typecheck`: thành công.
- `npm.cmd test`: thành công trên `pxhvibe@0.1.2`.
- Integration test dùng đúng sequence VS Code đang cấu hình (`ESC + Enter`), chèn newline rồi submit đúng multiline TARGET.
- Paste display test xác nhận payload 2 dòng được hiển thị thành `~ 2 lines` nhưng compose prompt vẫn chứa nguyên văn.
- Thumbnail test xác nhận canvas cố định là `20×20`.

### Vấn đề còn lại

- `Alt+C`/`/copy` vẫn copy toàn bộ response gần nhất; Shift-select + Ctrl+C dùng để copy một đoạn tùy chọn.
