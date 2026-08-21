## PXHVibe CLI v0.22.8

### Sửa lỗi
- Sửa con trỏ terminal bị lệch lên dòng `NEW TARGET` thay vì nằm tại vị trí đang gõ.
- Đồng bộ cursor position trong đúng pha render của Ink.
- Bù tọa độ live region có border và tự đo lại khi input wrap hoặc layout thay đổi.
- Giữ hỗ trợ UniKey, Telex, VNI và Unicode combining marks.

### Kiểm thử
- Thêm regression test cho tọa độ con trỏ và ANSI cursor sequence.
- Xác nhận con trỏ sau `xin chào các bạn` chuyển từ `ESC[2A` sang `ESC[1A`.
