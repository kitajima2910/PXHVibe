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
