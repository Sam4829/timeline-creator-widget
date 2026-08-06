# Project Memory

## Overview
This repository contains the **Timeline Estimator**, a dual-component project for Figma:
1. **Figma Plugin** (`plugin/`): A tool for statically generating Auto Layout tables in standard Figma design files.
2. **FigJam Widget** (`widget/`): An interactive timeline widget designed for real-time collaboration on the FigJam canvas.

---

## Current State (as of 2026-08-06)

### Implementation Completed
- Reordered Settings tabs to: `roster` -> `templates` -> `rows` -> `structure`.
- **Plan Feature**: Standalone flow from widget title bar. Business-day date calculation engine with cursor + accumulator logic, 0.5+ day durations, row-to-row chaining, weekend roll-forward, inline confirmation before overwriting, disabled states with tooltips.
- **Removed Cell-Based History/Revision System**: Simplified daterange cells to plain ISO strings (`"YYYY-MM-DD"` or `"YYYY-MM-DD - YYYY-MM-DD"`).
- **Shared `buildISODateRange` helper** in `ui.tsx`.
- **Remember Plan Timeline Durations**: `durations` persisted to `rowsMap` per row, restored on Plan popup reopen via `rowResult.durations ?? currentRow.durations` fallback.
- **Rows Tab in Settings**: Full row management (add, remove, drag-to-reorder) inside the Settings popup. Extracted shared `getRowLabel()` helper used by both Settings Rows tab and PlanPopup. Two-step inline delete confirmation (no `window.confirm()`). Fixed `TS17016` by importing `Fragment` from `preact`.
- **Debug logging**: `console.log('Settings closed')` added to `close-settings` handler in `main.tsx` for diagnostics.
- **Theme Toggle in Settings**: Light & Dark mode toggle in Settings (Templates tab), updating `themeName` across all canvas widget clients instantly via `useSyncedState`.
- **Copy Plan TSV Exporter**: Copy Plan button in canvas widget footer. Serializes sorted columns and rows to TSV format with RFC 4180 escaping and human-readable dates. Uses `document.execCommand('copy')` fallback for sandboxed iframe compatibility.
- **6-Color Avatar Palette**: Expanded avatar colors to 6 distinct tokens with char-code sum hashing (`name.split('').reduce(...)`) for uniform visual distribution across team assignees.
- **Footer AutoLayout Fix**: Fixed `AutoLayout` crash caused by invalid `horizontalAlignItems="space-between"` prop by using `spacing="auto"`.
- **Remote Repo**: `https://github.com/Sam4829/timeline-creator-widget.git` (main branch). Latest commit: `32c0c53`.

### Active Checklist
- [x] Restructure root directory into `plugin/` and `widget/`.
- [x] Implement settings tab reordering.
- [x] Implement standalone Plan popup and calculation engine.
- [x] Remove cell-based history/revision system.
- [x] Remember plan timeline durations across sessions.
- [x] Add Rows tab to Settings popup.
- [x] Build verification -- `npm run build` passing with zero errors.
- [x] Push all changes to remote GitHub repo.

---

## Architecture & Key Constraints

### Event Model
- `main.tsx` (Figma widget thread) <-> `ui.tsx` (iframe) communicate via `emit` / `on` from `@create-figma-plugin/utilities`.
- `on()` attaches listeners to `figma.ui.on('message')` under the hood. All listeners registered in `handleOpenSettings` are cleaned up in the `close-settings` handler.

### Widget Lifecycle -- Critical Facts
- **Figma Widgets reset JS execution context on every new canvas click.** There is no persistent background thread. `let uiOpen = false` is re-evaluated from scratch each time the user clicks the widget.
- **Native "X" close** destroys the iframe without firing `close-settings`. This does NOT cause a lockout bug because the context resets anyway on the next click.
- **Planned future improvement** (not implemented): Register `figma.on('close', () => { uiOpen = false; activeCleanup?.(); })` once at module level to also handle native X close cleanly without relying on context reset.

### UI Constraints
- **Never use `window.confirm()`** in Figma iframes -- it steals OS focus from the iframe and never returns it. Use inline `confirmPending` / `confirmRemoveRowId` state instead.
- **Preact JSX**: Use explicit `Fragment` import for `<Fragment>` syntax; `<>` shorthand causes `TS17016`.

---

## Performance Audit -- Validated Findings (2026-08-06)

| # | Finding | Location | Severity | Verdict |
|---|---------|----------|----------|---------|
| 1 | Unbound `useEffect` without `[]` | `main.tsx:84` | Low | DOWNGRADED -- Figma Widget `useEffect` without `[]` is idiomatic; runs once per user-initiated cycle |
| 2 | Sequential `useSyncedMap.set()` in reorder loops | `main.tsx:223`, `253`, `322` | Low | DOWNGRADED -- Figma batches synced map mutations within a single synchronous event turn |
| 3 | Map-to-array conversion + sort on every render | `main.tsx:120-126` | Low-Medium | CONFIRMED -- creates allocations per render; `useMemo` unavailable in Figma Widget API |
| 4 | Synchronous date calcs per keystroke in PlanPopup | `ui.tsx:605-676` | INVALID | `computePlan()` runs only on "Apply Plan" button click, not per-keystroke |
| 5 | Dynamic SVG string generation | `main.tsx:20-38` | Negligible | DOWNGRADED -- 3 module-scope calls per render; no measurable overhead |

**Conclusion**: No critical performance issues. Widget is well-structured for its scale.

---

## Files of Note
- `widget/src/main.tsx` -- Widget main thread: state, event handlers, render tree.
- `widget/src/ui.tsx` -- All iframe UIs: Settings, DatePicker, Dropdown, PlanPopup.
- `widget/src/types.ts` -- Shared types: `ColumnData`, `RowData`, `RosterMember`, etc.
- `widget/src/theme.ts` -- `ThemeTokens`, `StatusTokens`, `FIXED_STATUSES`.
- `widget/src/ui.css` -- Styles for Settings popup tabs and components.
