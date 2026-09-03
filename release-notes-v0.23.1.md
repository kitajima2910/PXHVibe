# PXHVibe v0.23.1

## What's Changed

### Performance (startup & streaming)
- **Faster time-to-first-response in Free mode**: removed the blocking `await` on MCP initialization before spawning the model — the CLI no longer waits for MCP readiness before the first token is produced (introduced a `void ensureMCPReady(...)` for providers without `setMCPTools`).
- **Smoother rendering while streaming**: memoized `getContextUsage(messages)` so token-count computation no longer re-runs on every activity/status re-render during a stream, reducing per-frame CPU work.

### Bug fixes
- **Output streaming test**: added `\n` after the closing fence in the tool block so the tool result renders cleanly.
- **CI `test:image` stability on `windows-latest`**: replaced a fixed sleep with a bounded poll and switched the editor assertions from an Ink-internal escape sequence to stable text (`debug: true` kept consistent with the other editor blocks). Resolves flakes on slow CI runners.
- **`npm publish`** now passes `release-check` (STATUS.md kept in sync with the current version).

### Housekeeping
- Version bumped `0.22.8` → `0.23.0` was the previous release; this patch bumps `0.23.0` → `0.23.1`.
- README.md, STATUS.md and release metadata synced to `v0.23.1`.

**Full Changelog**: https://github.com/kitajima2910/PXHVibe/compare/v0.23.0...v0.23.1
