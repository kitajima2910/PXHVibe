## 🍎 v0.21.1 — macOS/Linux Compatibility Fix

**Sửa lỗi cài đặt trên MacBook và các hệ thống macOS/Linux**

---

### 🐛 Bug Fix

- **`opencode-ai` không cài được trên macOS**: Di chuyển từ `dependencies` sang `optionalDependencies` — PXHVibe giờ cài đặt thành công trên mọi platform
- **Error message rõ ràng hơn**: Khi Free mode không tìm thấy `opencode` binary, hướng dẫn user cách cài đặt hoặc dùng Custom API

---

### 📦 Cài đặt trên macOS/Linux

```bash
# Cài PXHVibe
npm install --global pxhvibe

# Nếu muốn dùng Free mode, cài thêm:
npm install --global opencode-ai

# Hoặc dùng Custom API (không cần opencode-ai)
pxh
# Gõ /models → chọn Custom API (OpenAI/Anthropic/Gemini)
```

---

### 📋 Chi tiết thay đổi

| File | Thay đổi |
|------|----------|
| `package.json` | `opencode-ai` → `optionalDependencies` |
| `OpenCodeProvider.ts` | Cải thiện error message + `resolveOpenCodeExecutable()` |
| `README.md` | Hướng dẫn install riêng cho macOS/Linux |

---

### ✅ Kết quả kiểm tra

- `npm run build` → exit 0 ✓
- `npm test` → 24/24 test groups pass ✓
- Release integrity check pass ✓

---

**Full Changelog**: https://github.com/kitajima2910/PXHVibe/compare/v0.21.0...v0.21.1
