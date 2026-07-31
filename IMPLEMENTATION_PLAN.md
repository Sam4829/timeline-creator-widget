# Timeline Estimator Widget — Implementation Plan v2

## Summary of Changes

Two features:
1. **Reorder settings tabs** → Templates → Roster → Structure
2. **New "Plan" feature** — a separate popup (not inside Settings) for auto-calculating date ranges from start dates + durations

---

## 1. Tab Reorder (Settings Popup)

**Current**: Structure → Templates → Roster  
**New**: Templates → Roster → Structure

Default active tab changes from `'structure'` to `'templates'`.

Files touched: `ui.tsx` only — tab state default + JSX render order.

---

## 2. Plan Feature — Separate Flow

### Why separate from Settings?

User must add rows first (via the widget table) before planning dates. The Plan popup operates on existing row/column data — it's a distinct workflow from configuring templates, roster, or structure.

### Entry Point

A new **📅 Plan icon** in the widget title bar, next to the existing ⚙️ gear icon. Clicking it opens a dedicated popup via `showUI()`.

### Plan Popup UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Plan Timeline                                              [x] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Row: "Onboarding flow"                                         │
│  Start Date: [2025-08-01    📅]                                 │
│                                                                 │
│  ┌──────────────────────┬───────────┐                           │
│  │ Column               │ Days      │                           │
│  ├──────────────────────┼───────────┤                           │
│  │ Screenshot mapping   │ [1    ]   │  ← default 1, editable   │
│  │ Master screen anal.  │ [1    ]   │                           │
│  │ VD start date        │ [2    ]   │                           │
│  │ Draft 1 review       │ [0.5  ]   │                           │
│  │ Feedback updates     │ [1    ]   │                           │
│  │ ...                  │ ...       │                           │
│  └──────────────────────┴───────────┘                           │
│                                                                 │
│  ─────────────────────────────────────                          │
│                                                                 │
│  Row: "Dashboard"                                               │
│  Start Date: [          📅]   ← empty = chains from prev row   │
│  ...                                                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ⚠ This will overwrite existing dates. Continue?        │    │
│  │  [Apply Plan]                       [Cancel]            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

- Only **daterange** columns are listed as duration inputs
- Text, status, and assignee columns are skipped
- Default duration = **1 day** (pre-filled)
- Minimum value = **0.5 days**, step = 0.5
- Start Date for first row: **required** (user must pick one)
- Start Date for subsequent rows: **optional** — if empty, chains from previous row's last daterange column end date + 1 business day

### Date Calculation Logic

**Business days only** (Mon–Fri, weekends skipped).

```
For each row (top to bottom):

  If row has no start date AND it's the first row → skip entirely
  If row has no start date AND previous row exists →
    start = previous_row_last_daterange_column_end + 1 business day

  cursor = row start date

  For each daterange column (left to right):
    duration = user-specified days (default: 1)

    if duration == 0.5:
      start = cursor, end = cursor  (single date)
      cursor = next business day after cursor

    if duration == 1:
      start = cursor, end = cursor  (single date)
      cursor = next business day after cursor

    if duration > 1:
      days_to_add = ceil(duration) - 1
      start = cursor
      end = cursor + days_to_add business days
      cursor = next business day after end

    Write { start, end } as DateRangeData into row.cells[colId]
```

**Key rules:**
- `0.5 days` → single date (same as 1 day visually, but semantically half-day)
- `1 day` → single date
- `1.5 days` → 2 business days (ceil)
- `2 days` → start + 1 business day
- `3 days` → start + 2 business days
- Cursor always advances to the **next business day after the end date** for the next column
- Row-to-row chaining: next row starts on the business day after the previous row's last daterange column ended

### Confirmation

Before writing any data, show an **inline confirmation banner** (not `window.confirm()`):
> "⚠ This will overwrite existing date values. Existing revision history will be preserved."  
> [Apply Plan] [Cancel]

### Data Write Behavior

For each cell being written:
- If cell has no existing data → create fresh `DateRangeData` with one history entry (`mode: 'update'`)
- If cell already has data → push a new history entry with `changedBy: currentUser`, `reason: 'Auto-planned'`, then set `current` to the new value

---

## Proposed File Changes

---

### [MODIFY] [ui.tsx](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/ui.tsx)

**Tab reorder:**
- Change default tab state from `'structure'` to `'templates'`
- Reorder tab buttons: Templates → Roster → Structure
- Remove Plan from settings entirely

**New `PlanPopup` component:**
- Receives rows and daterange columns as props
- Renders each row with a start date input and duration inputs per daterange column
- Duration inputs default to `1`, min `0.5`, step `0.5`
- Date calculation runs entirely in the iframe (simple date math, no perf concern for typical row counts)
- On "Apply Plan", computes all `DateRangeData` objects and emits `'apply-plan'` event with the full payload
- Inline confirmation before applying

---

### [MODIFY] [main.tsx](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/main.tsx)

**New Plan icon in title bar:**
- Add a 📅 calendar SVG icon next to the ⚙️ gear icon
- Wire `onClick` to `handleOpenPlan`

**`handleOpenPlan` function:**
- Gathers current rows, columns, roster (for user name)
- Calls `showUI({ width: 450, height: 520, title: 'Plan Timeline' }, { type: 'plan', rows, columns })`
- Registers listener for `'apply-plan'` event
- On receiving plan data: iterates each row's cell updates, writes `DateRangeData` into `rowsMap`
- Calls `updateLastEdited()` after writing

**Pass rows to settings UI:**
- Also send `rows` data in `handleOpenSettings` (needed so Plan can reference row names)

---

### [MODIFY] [types.ts](file:///d:/Sagnik/Documents/Claude/Projects/timeline-estimator-plugin/timeline-estimator-widget/src/types.ts)

Add:
```ts
export interface PlanCellResult {
  colId: string;
  dateRange: DateRangeData;
}

export interface PlanRowResult {
  rowId: string;
  cells: PlanCellResult[];
}
```

Add `'plan'` to the `UIMode` union:
```ts
export type UIMode = 'settings' | 'date-picker' | 'dropdown' | 'add-name' | 'plan';
```

---

## What's NOT in Scope

- Weekend toggle (enable/disable weekend skipping) — future feature
- Holidays calendar — future feature
- Auto-recalculation when rows change — manual "Apply Plan" only
- Undo after applying plan — revision history serves this purpose

---

## Verification Plan

### Manual Verification
1. Open widget in Figma → confirm ⚙️ gear opens Settings with tabs: **Templates → Roster → Structure**
2. Confirm new 📅 Plan icon appears in the widget title bar
3. Apply Polaris D&E template, add 3 rows with task names
4. Click 📅 → Plan popup opens showing all 3 rows with daterange columns
5. Set start date for row 1 → verify row 2 and 3 start dates auto-chain when left empty
6. Set various durations (0.5, 1, 2, 3) → click "Apply Plan"
7. Confirm confirmation dialog appears → confirm → dates populate in widget
8. Verify dates skip weekends (e.g., Fri → Mon)
9. Verify 0.5/1 day = single date, 2+ days = range
10. Verify existing revision history is preserved (click a date cell → check history count)
11. Run `npm run build` in widget directory → no errors
