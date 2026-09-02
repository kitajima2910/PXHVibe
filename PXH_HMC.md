# PXH_HMC.md - Change Log

## 2026-09-03

### Thay đổi: Thêm RULES vào agentPrompt.ts

**File đã sửa:** `src/utils/agentPrompt.ts`

**Thay đổi gì:**
- Thêm constant `hmcRules` chứa 16 quy tắc vibe coding (Tiếng Việt 100%, đọc PXH_HMC.md, verify TARGET, không mở rộng phạm vi, ...)
- Thêm `${hmcRules}` vào chuỗi prompt trong `buildAgentPrompt()`, nằm giữa `codingRules` và `identityRules`

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit` exit code 0)
- Tests: Pre-existing failures (game-logic template thiếu DOM, test files trống), không liên quan đến thay đổi

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (2)

### Thay đổi: Xóa codingRules khỏi agentPrompt.ts

**File đã sửa:** `src/utils/agentPrompt.ts`

**Thay đổi gì:**
- Xóa constant `codingRules` (6 quy tắc cũ)
- Bỏ `${codingRules}` khỏi return string của `buildAgentPrompt()`
- `hmcRules` giờ là rules duy nhất trong prompt

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit` exit code 0)

**Vấn đề còn lại:** Không có.
