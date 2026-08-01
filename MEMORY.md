# Project Memory

## Overview
This repository contains the **Timeline Estimator**, a dual-component project for Figma:
1. **Figma Plugin** (`plugin/`): A tool for statically generating Auto Layout tables in standard Figma design files.
2. **FigJam Widget** (`timeline-estimator-widget/`): An interactive timeline widget designed for real-time collaboration on the FigJam canvas.

## Current State
- **Repository Restructuring**: Original plugin files moved into `plugin/` directory while keeping `timeline-estimator-widget/` clean and untouched at root.
- **Implementation Completed**:
  - Reordered settings tabs: `Templates` → `Roster` → `Structure`.
  - Implemented 📅 **Plan Feature** as a standalone flow accessible from the widget title bar.
  - Business-day date calculation engine with cursor + accumulator logic supporting 0.5+ day durations, row-to-row chaining, weekend roll-forward, inline confirmation before overwriting, and disabled icon states with tooltips when no rows/date-columns exist.
  - **Removed Cell-Based History/Revision System**: Simplified daterange cell values to plain ISO strings (`"YYYY-MM-DD"` or `"YYYY-MM-DD – YYYY-MM-DD"`). Removed `DateRangeData` and `DateHistoryEntry` interfaces. Simplified DatePicker popup (removed Revise vs Update toggle and reason textarea). Removed `(revised)` labels and history badges/tooltips.
  - **Consolidated Date String Formatting**: Shared `buildISODateRange` helper in `ui.tsx` ensures zero format drift between DatePicker and Plan Popup.
  - Build verified (`npm run build` passed with zero errors).
- **Remote Repo**: Linked to `https://github.com/Sam4829/timeline-creator-widget.git` (main branch).

## Active Context & Next Steps
- [x] Restructure root directory into `plugin/` and `timeline-estimator-widget/`.
- [x] Finalize `IMPLEMENTATION_PLAN.md` (v5).
- [x] Implement settings tab reordering (Templates → Roster → Structure).
- [x] Implement standalone Plan popup and calculation engine in widget (`types.ts`, `ui.tsx`, `main.tsx`).
- [x] Remove cell-based history/revision system and consolidate date string formatting.
- [x] Verify build and typechecking.
- [ ] Push latest implementation changes to remote GitHub repo.
