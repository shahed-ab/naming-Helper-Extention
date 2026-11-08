# Change Log

All notable changes to the "Naming Helper" extension will be documented in this file.

## [0.1.0] - 2026-11-08

### Added
- **Milestone 1**: Initial project scaffold with strict TypeScript compiler AST parser, blocklist, single-letter rules, and non-intrusive Hint diagnostics.
- **Milestone 2**: Value-based inference engine (`fromValue.ts`) covering all initializer patterns (arrays, objects, fetch, json, Date, getElementById, querySelector, filter, map, find, boolean comparisons, counters, and Map/Set).
- **Milestone 3**: Safe renaming provider integration using `executeDocumentRenameProvider` and `workspace.applyEdit`, scope collision checking to prevent variable shadowing, and workspace-level "Don't suggest for this name" action.
- **Milestone 4**: Usage-based inference engine (`fromUsage.ts`), educational beginner-friendly hover tooltips, and the visual Naming Rules Guide command.
- **Milestone 5**: Live Status Bar Naming Score (`Naming: 87%`), interactive QuickPick report jumping directly to weak declarations, configurable debounce timers, and exclusion globs.
- **Milestone 6**: Privacy-preserving opt-in AI suggestion command with encrypted `SecretStorage` for API keys, one-time explicit consent dialog, and function-scoped snippet isolation.
- **Milestone 7**: Production packaging, icon assets, comprehensive test suite with 51 passing unit tests, and complete documentation.

