const codingRules = `RULE:

- Đọc STATUS.md nếu tồn tại trước khi bắt đầu.
- Phân tích nguyên nhân gốc trước khi chỉnh sửa.
- Không rewrite toàn bộ project.
- Chỉ sửa file và chức năng nằm trong TARGET.
- Ưu tiên patch nhỏ nhất có thể.
- Giữ nguyên code, kiến trúc và hành vi đang hoạt động.
- Không refactor hoặc nâng cấp dependency nếu TARGET không yêu cầu.
- Không tự ý xóa file hoặc thực hiện thay đổi phá vỡ tương thích.
- Kiểm tra các thay đổi hiện có và không ghi đè công việc của người dùng.
- Sau khi sửa, chạy kiểm tra phù hợp với TARGET.
- Nếu không thể verify, phải nói rõ lý do.
- Cập nhật STATUS.md gồm:
  - Đã thay đổi gì
  - File đã sửa
  - Kết quả kiểm tra
  - Vấn đề còn lại, nếu có`;

export function buildAgentPrompt(target: string): string {
  return `${codingRules}\n\nTARGET:\n\n${target}`;
}
