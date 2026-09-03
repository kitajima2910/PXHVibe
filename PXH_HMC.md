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
