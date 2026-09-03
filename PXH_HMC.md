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

---

## 2026-09-03 (10)

### Thay đổi: Update version `0.23.0` → `0.23.1` và sync README.md

**TARGET:** Update version cho src PXHVibe CLI và sync README.md với src hiện tại.

**Quyết định version:** Các thay đổi sau `v0.23.0` gồm (7) fix output streaming test, (8) tối ưu TTFT
Free mode (non-blocking MCP), (9) tối ưu render streaming (memoize `getContextUsage`) — đều là
bugfix + tối ưu nội bộ hiệu năng, KHÔNG phá vỡ API/behavior người dùng → bump **patch** theo semver
thành **`0.23.1`**.

**File đã sửa:**
- `package.json` — `"version": "0.23.0"` → `"0.23.1"`.
- `README.md` — dòng "Bản phát hành hiện tại: **v0.23.0**" → **v0.23.1**.

**Sync README với src:** Nội dung README đã khớp src simplified mode (đã sync ở mục (6)); các thay
đổi (7)(8)(9) là nội bộ hiệu năng, không đổi behavior người dùng nên README chỉ cần cập nhật version,
không cần sửa nội dung mô tả.

**Kết quả kiểm tra:**
- Build: ✅ (`npm run build`, version in build log `pxhvibe@0.23.1`)
- `appVersion` từ `src/version.ts`: ✅ `0.23.1` (CLI `--version`/`/version`/`/about` sẽ hiện 0.23.1)
- `npm test`: ✅ 23/23 suites pass
- Không có test nào hardcode `0.23.0`.

**Ghi chú:** `src/utils/agentPrompt.ts` có thay đổi chưa commit của người dùng (đổi "STATUS.md" →
"PXH_HMC.md") — KHÔNG đụng tới (giữ nguyên thay đổi người dùng, ngoài TARGET).

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (11)

### Thay đổi: Fix `npm publish --dry-run` fail — STATUS version stale

**TARGET:** `npm publish --dry-run` sau turn (10) vẫn fail ở `release-check`:
`[FAIL] STATUS version is stale`.

**Nguyên nhân gốc:** `resources/_shared/scripts/release-check.mjs` line 18 yêu cầu: nếu `STATUS.md`
tồn tại thì phải chứa `v${version}` (tức `v0.23.1`). Khi bump version 0.23.0 → 0.23.1 (mục 10),
`STATUS.md` chưa được cập nhật nên chỉ còn chứa `v0.23.0` → release-check fail, làm publish chặn lại.

**File đã sửa:** `STATUS.md`

**Thay đổi gì:** Thêm mục `## RELEASE - v0.23.1` ngay sau tiêu đề `# STATUS`, ghi nhận patch bump
0.23.0→0.23.1, fix test:streaming, tối ưu TTFT Free mode, tối ưu render streaming, sync README — khiến
`STATUS.md` chứa `v0.23.1` để release-check pass. Không đụng các mục log cũ.

**Kết quả kiểm tra:**
- `node resources/_shared/scripts/release-check.mjs`: ✅ `[OK] Release integrity v0.23.1`
- `npm publish --dry-run`: ✅ prepublishOnly (typecheck + 23 tests + release-check) pass, đóng gói ok
  (unpacked 284.2 kB), không còn FAIL.

**Vấn đề còn lại:** Không có.

---

## 2026-09-03 (12)

### Thay đổi: Fix CI fail `test:image` — assert escape sequence Ink fragile + thiếu `debug:true`

**TARGET:** GitHub Actions `verify (windows-latest)` fail ở `test:image`:
`imageClipboard.test.js` — `AssertionError: The input did not match /\\x1b\\[1A\\x1b\\[5G\\x1b\\[?25h/`.
Actual input chỉ là `'\\x1B[?2004h'`.

**Nguyên nhân gốc (rút lại lần chẩn đoán trước):** Ban đầu nhầm là race/timing và thêm `waitForMatch`
poll 3s — nhưng CI VẪN fail với actual `'\\x1B[?2004h'` sau khi poll hết. Chẩn đoán đúng:

1. **Assertion sai đối tượng:** `assert.match(editorFrame, /\\x1b\\[1A\\x1b\\[5G\\x1b\\[?25h/)` assert chuỗi
   **escape reposition nội bộ của Ink** (di chuyển cursor). Chuỗi này KHÔNG ổn định giữa môi trường:
   chỉ xuất hiện khi Ink render theo đường không-deterministic (không `debug:true`), nên không nên
   assert cứng.
2. **Editor block thiếu `debug: true`:** 2 block PromptInput khác trong cùng test (`commandEditor`,
   `busyEditor`) đều có `debug: true` và pass CI; riêng `editor` block thiếu. Không có `debug:true`,
   Ink đi vào đường render phụ thuộc môi trường TTY → trên CI runner (khác local) `editorFrame` chỉ
   nhận được `\x1b[?2004h` (Ink bật bracketed paste qua `usePaste`) chứ không có frame text.

**File đã sửa:** `src/tests/imageClipboard.test.ts` (chỉ test, KHÔNG đổi production).

**Thay đổi gì:**
- Thêm `debug: true` vào options render của `editor` block — nhất quán với `commandEditor`/`busyEditor`
  (line 175/218), giúp Ink render text deterministic trực tiếp vào stdout.
- Đổi assertion từ escape reposition fragile sang **assert text ổn định**: chờ + kiểm tra
  `stripAnsi(editorFrame)` chứa `Nhập TARGET` (PromptInput render box nhập đúng). Giữ helper
  `waitForMatch` poll 3s cho tính bất đồng bộ.

**Kết quả kiểm tra:**
- Build + `test:image` chạy 6 lần liên tiếp: ✅ pass cả 6 (ổn định).
- Typecheck: ✅ (`tsc --noEmit`)
- `npm test`: ✅ 23/23 suites pass (gồm Image clipboard tests passed).

**Vấn đề còn lại:** Chưa tái hiện đúng môi trường CI runner (Node 22.23.2; máy local chạy
Node 24.18.0). Nhưng `debug:true` khiến Ink render deterministic và assert dựa trên text (không phụ
thuộc escape nội bộ Ink/version) nên khả năng cao pass CI. Nếu CI vẫn fail, kiểm tra lại chuỗi đầu ra
cụ thể của runner.

---

## 2026-09-03 (13)

### Chẩn đoán: `npm publish` E404 — token npm hết hạn (không phải lỗi code)

**TARGET:** `npm publish` (thật, không dry-run) fail:
```
npm error 404 Not Found - PUT https://registry.npmjs.org/pxhvibe - Not found
npm error 404 The requested resource 'pxhvibe@0.23.1' could not be found or you do not have permission
```

**Nguyên nhân gốc (chẩn đoán, KHÔNG phải lỗi code/không patch):**
- `npm whoami` → `401 Unauthorized`: chưa xác thực được với registry.
- Registry đúng (`https://registry.npmjs.org/`); package `pxhvibe` CÓ tồn tại, version mới nhất
  `0.22.8`, maintainer `pxh291095 <pxh2910@gmail.com>` (chính người dùng) — tên KHÔNG bị chiếm.
- `~/.npmrc` có `//registry.npmjs.org/:_authToken=...` nhưng token này đã **hết hạn/không hợp lệ**
  (npm whoami 401). Khi publish, npm PUT nhưng không xác nhận quyền → registry che giấu bằng E404
  ("not have permission").

**Vì sao v0.22.8 publish được còn v0.23.1 không:** token dùng lúc ấy còn hạn, hiện đã hết hạn.

**Kết luận:** Vấn đề xác thực tài khoản npm, không phải code — không có file nào cần sửa.

**Hướng xử lý (người dùng thao tác tài khoản; tôi không tự chạy đăng nhập tương tác):**
1. `npm login` — username `pxh291095` / password / OTP; sau đó `npm whoami` phải trả về username.
2. Hoặc tạo **Access Token mới** trên npmjs.com → `npm config set //registry.npmjs.org/:_authToken=<TOKEN>`.
3. Xác nhận `npm whoami` = `pxh291095`, rồi `npm publish` lại.

**Verify:** Chưa verify được publish vì cần xác thực tài khoản người dùng — nêu rõ lý do.

**Vấn đề còn lại:** Token cũ trong `~/.npmrc` cần thay mới; sau đăng nhập/đổi token phải chạy lại
`npm publish` để xác nhận.

---

## 2026-09-03 (14)

### Thay đổi: Update README GitHub + release + docs npm cho bản đã release v0.23.1

**TARGET:** Update README.md trên GitHub, thêm release, và docs npm cho bản đã release (0.23.1).

**Trạng thái trước khi làm (xác minh thực tế):**
- npm đã publish `0.23.1` thành công (sau mục 13, user đã đăng nhập/đổi token): `npm view pxhvibe` = 0.23.1.
- Git: branch `main` đã push hết; README.md trên GitHub đã ghi `v0.23.1` (từ mục 10, commit be8990d).
- Chưa có tag/release `v0.23.1` (git tags chỉ đến v0.23.0).

**Đã thực hiện:**
1. Tạo `release-notes-v0.23.1.md` (theo format cũ release-notes-v0.23.0.md) ghi các thay đổi 0.23.1
   (perf TTFT non-blocking MCP, memoize getContextUsage, fix streaming fence \n, fix CI imageClipboard,
   sync version/STATUS/README) + link compare v0.23.0...v0.23.1.
2. Commit `docs: add v0.23.1 release notes` (`a1a7864`) → push `origin main`.
3. Tạo **annotated tag `v0.23.1`** → push `origin v0.23.1`.

**Về README và docs npm:**
- README.md trên GitHub đã khớp src (`v0.23.1`, simplified mode) và đã push — không cần sửa thêm.
- Docs npm: `README.md` nằm trong `files` của package → bản 0.23.1 trên npmjs đã kèm README này.

**Block — chưa tạo GitHub Release v0.23.1:** Máy không có `gh` CLI và không có `GITHUB_TOKEN`/`GH_TOKEN`
env; `git credential fill` không trả được token GitHub API (auth 401). Nên không thể tự tạo Release qua
API. Vì tag `v0.23.1` đã push, user tạo release trên web (GitHub → Tags → v0.23.1 → "Create release",
dán nội dung release-notes-v0.23.1.md) hoặc cung cấp token/gh để tạo qua API.

**Verify:** README GitHub ✅ (v0.23.1 push), tag v0.23.1 ✅ push, npm docs ✅ (0.23.1 đã publish kèm
README). GitHub Release: CHƯA verify được do thiếu công cụ/token — nêu rõ lý do.

**Vấn đề còn lại:** Tạo GitHub Release cần thao tác người dùng (web) hoặc token/gh.

### Cập nhật sau — ĐÃ tạo GitHub Release v0.23.1

Sau khi user đăng nhập GitHub qua Credential Manager (web), `git credential fill` trả token hợp lệ
(`kitajima2910`). Đã tạo **GitHub Release v0.23.1** qua REST API (Node fetch để JSON chính xác, tránh
lỗi escape của PowerShell `ConvertTo-Json`):
- URL: https://github.com/kitajima2910/PXHVibe/releases/tag/v0.23.1
- `tag_name` = v0.23.1, `name` = "PXHVibe v0.23.1", `body` = nội dung release-notes-v0.23.1.md (1355 chars).
- Verify API: released at `2026-09-03T07:48:39Z` ✅.
- Token dùng tạm qua biến môi trường trong process, không ghi vào file/repo, đã xoá khỏi env sau khi
  dùng. Không ghi token vào bất kỳ file nào.

**TARGET (14) hoàn tất:** README.md GitHub ✅ (v0.23.1), GitHub Release v0.23.1 ✅, docs npm ✅
(0.23.1 đã publish, README kèm trong package).

---

## 2026-09-03 (15)

### Thay đổi: Xóa phần PIPELINE khỏi layout + tự động tạo PXH_HMC.md sau mỗi task

**TARGET (2 phần từ người dùng):**
1. Phần PIPELINE trên layout không có nội dung → xoá đi.
2. Khi chạy PXHVibe CLI với "Tạo giúp tôi game bắn xe tank 2D HTML5", không thấy PXH_HMC.md được tạo khi xong task.

**Nguyên nhân gốc (phần 2):** PXHVibe KHÔNG tự tạo/cập nhật PXH_HMC.md. File này chỉ được nhắc trong
prompt (`hmcRules` trong `src/utils/agentPrompt.ts`) như chỉ dẫn mềm cho LLM; không có code nào ghi
file. Model chạy qua `opencode run --pure --agent build` không tuân thủ ⇒ không có file xuất hiện.

**File đã sửa:**
- `src/components/TodoStrip.tsx` — Bỏ toàn bộ section PIPELINE (header, progress bar, task list), chỉ giữ MCP. Xóa helpers không còn dùng (`TodoStatus`, `TodoItem`, `phaseTodoLabel`, `compactTodoDetail`, `todoSymbol`, `todoColor`, `renderProgressBar`) và `tasks` prop.
- `src/app.tsx` — Xóa state `stickyTasks` và mọi `setStickyTasks` (chỉ nuôi section PIPELINE); bỏ `TodoItem` import; đổi `<TodoStrip tasks={...}>` → `<TodoStrip mcpServers={...}>`; thêm `import {logTaskToHmc}` và gọi `logTaskToHmc(workingDirectory, contextualTarget)` khi task hoàn thành (sau `setStatus('Ready')`).
- `src/utils/hmcLog.ts` — (mới) `logTaskToHmc(cwd, target)`: tạo `PXH_HMC.md` trong working directory của user nếu chưa có (kèm header `# PXH_HMC.md - Change Log`) rồi append entry `## <date> / ### Task hoàn thành` với thời gian và TARGET; nếu file đã có thì append cuối file.
- `src/tests/todoStrip.test.ts` — Bỏ assertion PIPELINE/task list, chỉ test MCP + các helper còn lại.
- `src/tests/hmcLog.test.ts` — (mới) test tạo file mới + append file đã có (dùng temp dir).
- `package.json` — thêm script `test:hmc` và thêm vào chuỗi `test`.

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit`)
- `npm test`: ✅ 24/24 suites pass (gồm `test:todo`, `test:hmc` mới).

**Verify behavior:** Chưa verify bằng cách chạy thực tế với Free runtime + inference thật (chỉ verify
logic). `logTaskToHmc` được gọi ngay sau khi agent trả về thành công; nó ghi file đồng bộ (appendFileSync)
nên file PXH_HMC.md sẽ có mặt trong working directory khi task xong. Hướng còn lại: nếu model vẫn tự tạo
PXH_HMC.md theo prompt, hàm này sẽ append thêm entry — không ghi đè thay đổi của user.

**Vấn đề còn lại:** Không.

---

## 2026-09-03 (16)

### Thay đổi: Release v0.24.0 — bump version + sync + commit/push + GitHub Release

**TARGET:** Update version PXHVibe CLI, sync với CLI, commit + push lên github, tạo release mới trên github.

**Quyết định version:** Các thay đổi từ task (15) gồm tính năng mới (tự động tạo PXH_HMC.md) và thay đổi
UI (bỏ section PIPELINE) → theo semver là **minor** bump từ `0.23.1` → **`0.24.0`**.

**File đã sửa:**
- `package.json` — `"version": "0.23.1"` → `"0.24.0"`.
- `README.md` — "Bản phát hành hiện tại: v0.23.1" → v0.24.0.
- `STATUS.md` — thêm mục `## RELEASE - v0.24.0` (chứa `v0.24.0` để release-check pass), giữ nguyên mục v0.23.1.
- `release-notes-v0.24.0.md` — (mới) ghi tính năng auto PXH_HMC.md + bỏ PIPELINE sidebar.

**Kết quả kiểm tra:**
- Typecheck: ✅ Pass (`tsc --noEmit`)
- `node resources/_shared/scripts/release-check.mjs`: ✅ `[OK] Release integrity v0.24.0`
- `npm test`: ✅ 24/24 suites pass (build log `pxhvibe@0.24.0`)
- `node dist/cli.js --version`: ✅ `PXHVibe v0.24.0`

**Vấn đề còn lại:** Không.
