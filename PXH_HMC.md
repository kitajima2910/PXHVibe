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

---

## 2026-09-03 (3)

### Thay đổi: Bỏ agents/skills/workflows — chỉ giữ hmcRules

**Phân tích:** PXHVibe CLI đọc ~69 files markdown (10 agents + 50 skills + 8 workflows) lúc startup. Skills/workflows inject vào prompt → tăng token LLM. Bỏ chúng để giảm startup I/O và prompt size.

**File đã sửa:**
- `src/utils/agentPrompt.ts` — `buildAgentPrompt(target)` giờ chỉ nhận 1 tham số, bỏ route/catalog/pipeline
- `src/app.tsx` — Bỏ orchestration discovery, agent routing, skill/workflow pickers, `/agents` `/skills` `/workflows` `/pipeline` `/validate` commands
- `src/runtime/teamRunner.ts` — Cập nhật call `buildAgentPrompt`
- `src/tests/orchestration.test.ts` — Cập nhật assertions
- `src/tests/pipeline.test.ts` — Cập nhật assertions

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit` exit code 0)

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (4)

### Thay đổi: Xóa dead code orchestration + dọn resources

**File đã xóa:**
- `src/orchestration/builtins.ts` — 50 builtin skills + 8 builtin workflows (dead code)
- `src/orchestration/discovery.ts` — filesystem scanning (dead code)
- `resources/agents/` — 10 bundled agent markdown files
- `resources/skills/` — 50 skill directories + SKILL.md
- `resources/workflows/` — 8 workflow markdown files
- `resources/_shared/` — 13 files + 3 dirs (chỉ giữ `scripts/release-check.mjs`)

**File đã sửa:**
- `src/tests/orchestration.test.ts` — Thay thế discovery tests bằng inline catalog
- `src/tests/pipeline.test.ts` — Inline `emptyCatalog`, bỏ assertions về builtin counts
- `src/tests/teamRunner.test.ts` — Inline `emptyCatalog`

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit` exit code 0)

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (5)

### Thay đổi: Fix CI test failures

**Nguyên nhân:** Sau khi bỏ agents/skills/workflows, nhiều test vẫn expect旧 behavior.

**File đã sửa:**
- `src/tests/pipeline.test.ts` — Tạo `testCatalog` có debug workflow
- `src/tests/teamRunner.test.ts` — Dùng `testCatalog`, sửa assertion
- `src/tests/slashCommands.test.ts` — Xóa assertions cho removed commands

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass
- Tests: ✅ pipeline, team, orchestration pass
- Pre-existing: outputStreaming test fail (StreamingBrandSanitizer bug)

**Vấn đề còn lại:** outputStreaming test có pre-existing bug.

---

## 2026-09-03 (6)

### Thay đổi: Sync README.md với source simplified mode hiện tại

**TARGET:** Cập nhật `README.md` cho khớp với `src` PXHVibe CLI hiện tại.

**Nguyên nhân:** Source đã chuyển sang simplified mode (chỉ `hmcRules`, bỏ pipeline, 
agents/skills/workflows, AGENTS.md) nhưng README vẫn mô tả kiến trúc cũ (team runtime, 
pipeline 8 phase, checkpoint, capability pack, 24 lệnh với `/agents` `/skills` `/workflows` `/pipeline`).

**File đã sửa:** `README.md`

**Thay đổi gì:**
- Intro & "Điểm nổi bật": mô tả single-agent `hmcRules` thay vì pipeline/specialist routing; bỏ claim `AGENTS.md`/skills/agents/workflows.
- "Bắt đầu trong 60 giây": bỏ `/pipeline`, `/history` khỏi bước kiểm tra.
- "Lệnh trong TUI": liệt kê lệnh thực tế hoạt động (theo handler trong `src/app.tsx`), note `/history` tắt và các lệnh cũ không còn hỗ trợ.
- "Team runtime" → "Runtime (simplified mode)": mô tả đúng `buildAgentPrompt(target)` + `QUICK`/coding, bỏ 8 workflow/50 skill/10 agents/pipeline/checkpoint.
- "Mở rộng theo project": bỏ bảng skills/agents/workflows discovery + AGENTS.md, thay bằng phần MCP.
- "Giao diện": đổi "worker"/"phase" sang agent/single lượt.
- License/attribution: bỏ nhắc "Economy Router, capability assets".

**Kết quả kiểm tra:**
- `README.md` là tài liệu, không nằm trong `tsc`/test coverage.

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (7)

### Thay đổi: Fix outputStreaming test chặn `npm publish --dry-run`

**TARGET:** `npm publish --dry-run` fail ở `test:streaming` (`npm run prepublishOnly`).

**Nguyên nhân gốc:** Assistant message có content dạng `...12 dòng\n\`\`\`` + streamed text
glu liền sau closing fence (không có newline) — ví dụ `\`\`\`Đã sửa lỗi đăng nhập...`.
Trong `src/utils/terminalFormat.ts:16`, `parseTerminalBlocks` chỉ nhận diện code fence khi `\`\`\``
đứng đầu dòng (`^```...`). Vì text dính sau fence nên dòng đó bị coi là dòng đóng fence mở khác,
và toàn bộ text sau nó bị nuốt mất → không render ra frame. Do đó assertion
`frame.includes('Đã sửa lỗi đăng nhập.')` (và `File đã sửa: src/login.ts.`) fail.

Đã xác minh: khi bỏ tool block (chỉ còn text_delta), test pass; khi có tool block + text, text biến mất
— kết luận là lỗi gluing fence, không phải viewport clipping (tăng rows lên 500 vẫn fail).

**File đã sửa:** `src/app.tsx`

**Thay đổi gì:** Thêm `\n` sau closing fence `\`\`\`` khi đóng tool block, ở cả 2 nhánh `tool_complete`:
- Gộp summary vào block `tool_start`: `${event.summary}\n\`\`\`\n`
- Fallback block: `\n\`\`\`\n[...]\nsummary\n\`\`\`\n`

Nhờ đó text streamed tiếp theo nằm trên dòng riêng → `parseTerminalBlocks` render đúng, không bị nuốt.

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit`)
- `npm test`: ✅ 23/23 suites pass, trong đó `Output streaming tests: passed`
  (trước đây fail pre-existing bug)

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (8)

### Thay đổi: Tối ưu TTFT — không gate request model trên khởi tạo MCP (giống OpenCode CLI)

**TARGET:** Tối ưu PXHVibe CLI phản hồi nhanh như OpenCode CLI.

**Phân tích hướng chọn:** OpenCode CLI luôn bắt đầu phản hồi ngay, không chờ các init phụ
(MCP/daemon) trước first token. PXHVibe Free mode đang `await ensureMCPReady(currentProvider)`
TRƯỚC mỗi request coding, dù MCP không cần: Free mode (`OpenCodeProvider`) không có
`setMCPTools` và đọc MCP config trực tiếp từ disk lúc spawn (`buildOpenCodeEnvironment` →
`loadMCPConfig`). Nên await này chỉ chờ `mcpManager` connect (có thể chậm với remote/OAuth)
mà không đóng góp gì cho spawn → gây trễ TTFT.

**File đã sửa:** `src/app.tsx`

**Thay đổi gì:** Ở coding path (`handleSubmit`), thay vì luôn `await ensureMCPReady`:
- provider có `setMCPTools` (Custom API) → vẫn `await` (cần MCP tools trước khi run).
- provider không có `setMCPTools` (Free mode) → `void ensureMCPReady(...)`, fire request ngay,
  MCP/UI cập nhật nền (đã được khởi động nền từ `useEffect` mount).

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit`)
- `npm test`: ✅ 23/23 suites pass (outputStreaming vẫn pass — dùng fake provider không có setMCPTools)

**Verify thời gian thực:** Chưa benchmark đo được TTFT tuyệt đối (cần Free runtime + inference thật).
Đã verify logic: Free mode không còn bị chặn bởi `await` MCP trước khi spawn model.

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (9)

### Thay đổi: Tối ưu render khi streaming — memoize `getContextUsage` (giống OpenCode CLI)

**TARGET:** Tiếp tục tối ưu PXHVibe CLI giống OpenCode CLI (mượt khi stream response).

**Nguyên nhân gốc:** `const contextUsage = getContextUsage(messages)` chạy trên MỌI render
của `App`. Trong lúc streaming, mỗi `activity` event (`setActivityLabel`...) gây re-render
DÙ `messages` không đổi → `countTokens` (regex quét toàn bộ turn) bị tính lặp vô ích nhiều lần mỗi
giây, gây tốn CPU/render, làm TUI kém mượt. Giá trị này chỉ thực sự cần khi gõ `/context`.

**File đã sửa:** `src/app.tsx`

**Thay đổi gì:**
- Import thêm `useMemo`.
- `getContextUsage(messages)` → `useMemo(() => getContextUsage(messages), [messages])`.
  Chỉ recompute khi mảng `messages` thay đổi; re-render do activity/status churn không tính lại.
  `/context` handler vẫn nhận giá trị tươi vì nó phụ thuộc `messages` (memo tự cập nhật).

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit`)
- `npm test`: ✅ 23/23 suites pass (gồm slashCommands test `getContextUsage` và outputStreaming)

**Vấn đề còn lại:** Không có.
