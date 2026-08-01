# Timeline Estimator Widget — Implementation Plan v5 (Final)

## Summary of Scope

1. **Remove Cell-Based Revision/History System**
   - Replace complex `{ current, history: [...] }` `DateRangeData` wrapper with plain date range strings (e.g. `"2025-08-04 – 2025-08-05"`).
   - Simplify DatePicker popup (remove Update vs Revise toggle, remove reason field).
   - Remove `(revised)` label on task text cells, remove 🔴 revision badge on date cells, remove history tooltip.

2. **Consolidate Date String Construction (`buildISODateRange`)**
   - Eliminate format drift risk between manual DatePicker and auto Plan feature by routing all date range string building through a shared helper in `ui.tsx`.

---

## Pre-Removal Prerequisite: Consolidate Date String Construction

The single-date vs date-range string construction logic currently exists inline in two places:
- `DatePicker.handleSubmit` ([ui.tsx](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/ui.tsx))
- `PlanPopup.computePlan()` ([ui.tsx](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/ui.tsx))

### Shared Helper (`src/ui.tsx`)

Add near the existing UI date helpers (`toISODate`, `nextBusinessDay`, `addBusinessDays`):

```typescript
function buildISODateRange(startDate: string, endDate: string): string {
  if (startDate && endDate && startDate !== endDate) {
    return `${startDate} \u2013 ${endDate}`;
  }
  if (startDate) return startDate;
  if (endDate) return endDate;
  return '';
}
```

**Branch Behavior:**
- Range (`start != end`): `"YYYY-MM-DD – YYYY-MM-DD"`
- Single Date (`start == end`): `"YYYY-MM-DD"` (falls through to `return startDate`)
- Start Only: `"YYYY-MM-DD"` (DatePicker single-side pick)
- End Only: `"YYYY-MM-DD"` (DatePicker single-side pick)

---

## Detailed File-by-File Execution Plan

### 1. [types.ts](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/types.ts)
- **Delete** `DateHistoryEntry` interface.
- **Delete** `DateRangeData` interface.
- **Simplify** `CellValue`: `string | string[] | null`.
- **Simplify** `PlanCellResult`: `{ colId: string; value: string }`.
- **Simplify** `DatePickerData`: Remove `historyCount` field.

### 2. [ui.tsx](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/ui.tsx)
- **Add** `buildISODateRange` helper function.
- **Simplify `DatePicker`**:
  - Remove `historyCount` prop, `isFirstSet`, `isRevise`, and `reason` states.
  - Remove Update/Revise toggle UI and Reason textarea.
  - Simplify `handleSubmit`: `const value = buildISODateRange(startDate, endDate)`, emit `{ rowId, colId, value }`.
  - Simplify `submitDisabled`: `!startDate && !endDate`.
  - Submit button text: Always `"Set Date"`.
- **Simplify `PlanPopup.computePlan()`** (Atomic Change on lines 593–603):
  - Convert `startDate`/`endDate` JS `Date` objects to ISO strings via `toISODate()`.
  - Build value string via `buildISODateRange(startISO, endISO)`.
  - Push `{ colId: col.id, value }` directly (no `dateRange` object).
- **Update Plan Confirmation Banner**: Text becomes `"This will overwrite existing date values."`

### 3. [main.tsx](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/main.tsx)
- **Imports**: Remove `DateRangeData` and `DateHistoryEntry`.
- **Delete `getInfoIcon`**: Unused once revision badge is removed.
- **Simplify `handleCellClick` (daterange)**:
  - Cast `cellValue` as `string | null`.
  - `submit-date` listener directly assigns string: `newRows.cells[cId] = value`.
  - Send `{ rowId, colId: col.id, currentValue: cellValue || '' }` to `showUI`.
- **Simplify `handleOpenPlan` (`apply-plan` listener)**:
  - Directly write `newCells[cellResult.colId] = cellResult.value`.
- **Simplify `renderCell` (text)**:
  - Delete `isRevised` detection loop and `(revised)` label text.
  - Input width always `"fill-parent"`.
- **Simplify `renderCell` (daterange)**:
  - Cast `cellValue` as `string | null`.
  - Remove `historyCount`, tooltip construction, and info SVG badge.
  - Render text using `formatFriendlyDate(data)`.

---

## Verification & Testing Plan

### Automated Build Check
- Run `npm run build` in `timeline-estimator-widget/` — must pass typechecking and compilation with zero errors.

### Manual Verification Matrix
1. **DatePicker**:
   - Set start + end date → shows formatted date range (`"4 August – 7 August"`).
   - Set start date only → shows single date (`"4 August"`).
   - Edit existing date cell → populates date inputs cleanly.
2. **Plan Popup**:
   - Apply plan → populates all dates as plain strings.
   - Re-apply plan → overwrites dates cleanly without residual history state.
3. **Format Consistency**:
   - Verify DatePicker output and Plan output for identical dates produce identical string formats.
4. **Widget Render**:
   - Daterange cells render formatted date text (no badges, no revision tooltips).
   - Task text cells render full width without `(revised)` label.
   - Status, Assignee, and Template settings continue functioning normally.
