# PXHVibe

MVP giao diện terminal cho ứng dụng vibe coding, xây dựng bằng TypeScript, React và Ink.

## Yêu cầu

- Node.js 20 trở lên
- npm

## Cài đặt

```bat
npm install --global pxhvibe
```

Gói cài đặt bao gồm OpenCode CLI. Sau khi cài một lần, khởi động PXHVibe từ
terminal trong bất kỳ project nào bằng lệnh:

```bat
pxh
```

Trong TUI, gõ `/modes` để mở menu chọn model/mode. Dùng phím mũi tên và Enter;
không cần khởi động lại PXHVibe.

Lệnh dùng working directory của terminal đang mở. Mặc định PXHVibe dùng OpenCode
CLI với model Zen miễn phí `opencode/mimo-v2.5-free`; không cần
`OPENAI_API_KEY`.

### Chạy OpenCode Free

```bat
pxh
```

Có thể chọn model miễn phí khác đang có trong OpenCode:

```bat
pxh
```

Sau đó gõ `/modes` và chọn `DeepSeek V4 Flash (Free)`.

Hoặc đặt model mặc định cho PXHVibe:

```bat
set PXH_OPENCODE_MODEL=opencode/mimo-v2.5-free
pxh
```

### Cấu hình Native Agent

Trong Windows CMD:

```bat
set OPENAI_API_KEY=your_api_key
set PXH_MODEL=gpt-5.6-terra
pxh
```

`PXH_MODEL` là tùy chọn; mặc định là `gpt-5.6-terra`. Native Agent hiện có các tool
`list_files`, `read_file`, `search_text`, `apply_patch` và `git_diff`. Các tool
file bị giới hạn trong working directory hiện tại; MVP chưa cho model chạy shell
command.

Có thể chọn provider trực tiếp. Native Agent là tùy chọn và cần OpenAI API key:

```bat
pxh --provider=native
pxh --provider=mock
pxh --provider=opencode
```

## Chạy development

### Chạy Native Agent

```bat
set OPENAI_API_KEY=your_api_key
npm run dev -- --provider=native
```

### Chạy Mock

```bat
npm run dev -- --provider=mock
```

### Chạy OpenCode

```bat
opencode --version
npm run dev -- --provider=opencode --model=opencode/mimo-v2.5-free
```

OpenCode phải được cài đặt và kết nối với OpenCode Zen trước. Provider `opencode`
chạy agent `build` trong working directory hiện tại. Chế độ `--auto` có thể đọc,
tạo và chỉnh sửa file trong project; nên commit source trước khi giao tác vụ lớn.

## Build và chạy bản build

```sh
npm run build
npm start
```

## Phím điều khiển

- `Enter`: gửi prompt
- `Backspace` hoặc `Delete`: xóa ký tự
- `/modes`: mở menu chuyển model/mode
- `Ctrl+C`: thoát ứng dụng

## Phát hành package

Tên `pxhvibe` hiện chưa được sử dụng trên npm. Người duy trì có thể kiểm tra gói
và phát hành bằng:

```bat
npm run typecheck
npm test
npm pack --dry-run
npm publish
```
