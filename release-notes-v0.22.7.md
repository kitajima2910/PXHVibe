## PXHVibe CLI v0.22.7

### Giao diện terminal
- Làm mới transcript output theo phong cách coding CLI gọn hơn.
- Prompt người dùng, output assistant, system status và code block dễ đọc hơn.
- MCP đã kết nối hiển thị green truecolor, in đậm và có nhãn `CONNECTED`.

### Sửa lỗi
- Scroll theo dòng render thực tế, không còn mất phần đầu của response dài.
- Hỗ trợ con trỏ terminal thật để UniKey, Telex và VNI nhập tiếng Việt ổn định.
- Giữ đúng vị trí con trỏ với Unicode NFC và combining marks.

### Kiểm thử
- Bổ sung regression test cho output layout, response dài, IME tiếng Việt và màu trạng thái MCP.
- Typecheck, build và toàn bộ test suite phải pass trước khi phát hành.
