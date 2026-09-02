# PXHVibe v0.23.0

## What's Changed

### Simplified Prompt Architecture
- **Removed agents/skills/workflows** from the LLM prompt — only `hmcRules` remains
- `buildAgentPrompt(target)` now takes a single parameter (was 5)
- Prompt reduced from ~100KB+ (with bundled skills) to minimal rules-only format

### Performance Improvements
- Eliminated ~69 filesystem reads at startup (agents, skills, workflows discovery)
- Reduced LLM token usage significantly (no more skill/workflow instructions in prompt)
- Faster CLI startup and response times

### Cleanup
- Deleted `builtins.ts` and `discovery.ts` (dead code)
- Removed 50 bundled skills, 8 workflows, 10 agent markdown files
- Cleaned `resources/_shared/` (kept only `release-check.mjs`)

### Known Issues
- `outputStreaming` test has pre-existing bug: `StreamingBrandSanitizer` drops first text delta

**Full Changelog**: https://github.com/kitajima2910/PXHVibe/compare/v0.22.8...v0.23.0
