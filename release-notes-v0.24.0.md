# PXHVibe v0.24.0

## What's Changed

### New feature
- **Auto PXH_HMC.md**: after each coding task completes, PXHVibe now automatically creates/updates a `PXH_HMC.md` change log in the working directory (new util `src/utils/hmcLog.ts`). Previously this file was only requested as a soft prompt rule, so it frequently never appeared. Now the CLI writes the log entry itself, so a `PXH_HMC.md` is always created when a task finishes.

### Layout / UI
- **Removed the PIPELINE sidebar section**: the "PIPELINE" block in the right sidebar had no real content in simplified mode (only a single agent anyway), so it has been removed. The sidebar now only shows the **MCP** section.

### Housekeeping
- Version bumped `0.23.1` → `0.24.0` (minor — new feature + UI change).
- README.md and STATUS.md synced to `v0.24.0`.

**Full Changelog**: https://github.com/kitajima2910/PXHVibe/compare/v0.23.1...v0.24.0
