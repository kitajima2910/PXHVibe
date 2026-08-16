## 🚀 PXHVibe v0.20.0

**Terminal Coding Team với MCP OAuth tự động và trải nghiệm người dùng được cải tiến**

---

### ✨ Tính năng mới

#### 🔐 MCP OAuth Protocol
- **Tự động authorize** với remote MCP servers (Neon, etc.)
- Browser tự động mở khi cần authentication
- Tokens được lưu an toàn trong `~/.pxhvibe/` và tự động refresh
- Không cần API key thủ công cho các servers hỗ trợ OAuth

**Cấu hình đơn giản:**
```json
{
  "servers": {
    "neon": {
      "type": "remote",
      "url": "https://mcp.neon.tech/mcp"
    }
  }
}
```

#### ⬆️ Input History Navigation
- Nhấn **↑ Up arrow** để recall input trước đó
- Nhấn **↓ Down arrow** để navigate qua history
- Tự động lưu input khi submit (tránh duplicate)
- Hoạt động như bash/zsh/fish

#### 🔔 Terminal Bell Notification
- Phát sound khi pipeline hoàn tất
- Biết ngay khi nào có thể quay lại kiểm tra kết quả

---

### 🎨 Cải tiến UI/UX

- **Tông màu PINK (magenta)** - Giao diện modern và nổi bật
- **ASCII art banner** - "PXHVibe" với gradient đẹp mắt
- **Timeline style messages** - Gọn gàng, dễ đọc
- **Terminal title** - Hiển thị "PXHVibe" thay vì "node"/"cmd"
- **OAuth page đẹp** - Font Montserrat, gradient background, UTF-8 chuẩn
- **Elapsed time** - Hiển thị thời gian xử lý trong activity label

---

### 📦 MCP Connection Guide

#### Local MCP Server
```json
{
  "servers": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  }
}
```

#### Remote MCP với API Key
```json
{
  "servers": {
    "remote-api": {
      "type": "remote",
      "url": "https://example.com/mcp",
      "headers": {
        "Authorization": "Bearer {env:MCP_TOKEN}"
      }
    }
  }
}
```

#### Remote MCP với OAuth (Tự động)
```json
{
  "servers": {
    "neon": {
      "type": "remote",
      "url": "https://mcp.neon.tech/mcp"
    }
  }
}
```

---

### 🛠️ Installation

```bash
npm install -g pxhvibe@0.20.0
pxh
```

Hoặc upgrade:
```bash
npm update -g pxhvibe
```

---

### 📊 Testing

- ✅ 24/24 test groups pass
- ✅ MCP OAuth flow verified với Neon MCP (35 tools)
- ✅ Filesystem MCP (14 tools)
- ✅ Release integrity check pass

---

### 🔄 Upgrade từ v0.19.0

Không có breaking changes. Chỉ cần:
```bash
npm update -g pxhvibe
```

---

### 📝 Changelog

**Added:**
- MCP OAuth protocol support
- Input history navigation (Up/Down arrow)
- Terminal bell notification
- Montserrat font cho OAuth pages

**Changed:**
- UI theme chuyển sang tông PINK (magenta)
- Messages hiển thị theo timeline style
- Terminal title set thành "PXHVibe"

**Fixed:**
- UTF-8 encoding trong OAuth callback page
- Context bar không cần thiết trong Header

---

### 🙏 Credits

- MCP OAuth implementation dựa trên `@modelcontextprotocol/sdk`
- Font Montserrat từ Google Fonts
- ASCII art inspired by modern TUI designs

---

**Full Changelog**: https://github.com/kitajima2910/PXHVibe/compare/v0.19.0...v0.20.0
