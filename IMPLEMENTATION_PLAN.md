# Timeline Estimator Widget — Implementation Plan v4 (Final)

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

- **Disabled** (with tooltip) when no rows exist: "Add rows to start planning"
- **Disabled** (with tooltip) when no daterange columns exist: "Add a date column to your template first"

### Plan Popup UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Plan Timeline                                              [x] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Row: "Onboarding flow"                                         │
│  Start Date: [2025-08-01    📅]   ← MANDATORY for first row    │
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
│  Start Date: [          📅]   ← optional, chains from prev row │
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
- **Row 1**: Start date is **mandatory**. "Apply Plan" is disabled without it.
- **Row 2+**: Start date is **optional**. If empty, chains from the previous row's `row_end_for_chaining`. If filled, uses the user-specified date (overlaps allowed for parallel work).
- **Plan data is ephemeral** — not persisted. Each time the popup opens, inputs start fresh.
- **Popup closes** after "Apply Plan" (matches existing widget patterns).

### Start Date on a Weekend

The input **accepts** weekend dates, but the calculation **rolls forward** to the next business day (Mon–Fri) before applying.

Example: User enters Saturday Aug 2 → effective start = Monday Aug 4.

### Date Calculation Logic

**Business days only** (Mon–Fri, weekends skipped).

#### Cursor + Accumulator Model

Two pieces of state per row:
- **cursor**: the current date position
- **accumulator**: tracks fractional day usage (0 or 0.5). Resets at start of each row.

```
Per-row state: accumulator = 0

For each row (top to bottom):

  Determine row start date:
    - If user entered a date → use it (roll to next biz day if weekend)
    - If empty (Row 2+ only) → previous row's row_end_for_chaining

  cursor = row start date

  For each daterange column (left to right):
    duration = user-specified days (default: 1, min: 0.5, step: 0.5)

    ── HALF-DAY (duration < 1, i.e. 0.5) ──

    if duration < 1:
      slot_date = cursor if accumulator == 0 else nextBusinessDay(cursor)
      start = slot_date
      end = slot_date
      accumulator += 0.5

      if accumulator >= 1.0:
        cursor = nextBusinessDay(slot_date)
        accumulator = 0
      else:
        cursor = slot_date        ← still mid-day

    ── FULL DAY OR MORE (duration >= 1) ──

    if duration >= 1:
      total_span = ceil(accumulator + duration)
      start = cursor
      end = addBusinessDays(cursor, total_span - 1)  ← (0 means same day)
      accumulator = 0             ← absorbs leftover, resets clean
      cursor = nextBusinessDay(end)

    Write { start, end } as DateRangeData

  ── END OF ROW ──

  if accumulator == 0.5:
    row_end_for_chaining = nextBusinessDay(cursor)  ← round up leftover
  else:
    row_end_for_chaining = cursor                   ← clean boundary
```

#### Why `ceil(accumulator + duration)` for ≥1 day columns

When a ≥1 day column follows a 0.5 leftover, it **absorbs** the partial day and extends its span. This prevents the column from being shortchanged:

| accumulator | duration | `ceil(acc + dur)` | Span (biz days) |
|-------------|----------|-------------------|-----------------|
| 0 | 1 | 1 | Single date |
| 0 | 2 | 2 | 2-day range |
| **0.5** | **1** | **2** | **2-day range** (absorbs leftover) |
| 0.5 | 2 | 3 | 3-day range |
| 0 | 1.5 | 2 | 2-day range |

#### Full Trace: Polaris D&E, Row 1, Start = Monday Aug 4

| # | Column | Days | acc | Start | End | acc after | cursor |
|---|--------|------|-----|-------|-----|-----------|--------|
| 1 | Screenshot mapping | 0.5 | 0 | Aug 4 (Mon) | Aug 4 | 0.5 | Aug 4 |
| 2 | Master screen analysis | 0.5 | 0.5 | Aug 5 (Tue) | Aug 5 | 0 | Aug 6 |
| 3 | VD start date | 2 | 0 | Aug 6 (Wed) | Aug 7 | 0 | Aug 8 |
| 4 | Draft 1 review | 0.5 | 0 | Aug 8 (Fri) | Aug 8 | 0.5 | Aug 8 |
| 5 | Feedback updates | 1 | 0.5 | Aug 8 (Fri) | **Aug 11 (Mon)** | 0 | Aug 12 |
| 6 | Final review | 1 | 0 | Aug 12 (Tue) | Aug 12 | 0 | Aug 13 |
| 7 | Component creation | 2 | 0 | Aug 13 (Wed) | Aug 14 | 0 | Aug 15 |
| 8 | Responsive check | 1 | 0 | Aug 15 (Fri) | Aug 15 | 0 | Aug 18 |
| 9 | Release file update | 0.5 | 0 | Aug 18 (Mon) | Aug 18 | 0.5 | Aug 18 |
| 10 | Tech handover | 0.5 | 0.5 | Aug 19 (Tue) | Aug 19 | 0 | Aug 20 |

End of row: acc=0, cursor=Aug 20. **Row 2 chains from Aug 20 (Wed).**

Key: Col 5 (1 day, acc=0.5) → `ceil(0.5+1)=2` → spans Fri–Mon. No cascading — col 6 starts clean.

#### Row-to-Row Chaining

When Row 2+ has no start date, it starts at `row_end_for_chaining` from the previous row:
- If previous row ended with acc=0 → `cursor` (already a clean next-day boundary)
- If previous row ended with acc=0.5 → `nextBusinessDay(cursor)` (rounds up the leftover half-day)

```
Row 1 ends acc=0,   cursor=Aug 20 → Row 2 starts Aug 20 (Wed)
Row 1 ends acc=0.5, cursor=Aug 18 → Row 2 starts nextBizDay(Aug 18) = Aug 19
```

#### Helper Functions

```ts
nextBusinessDay(date): if Fri→Mon, Sat→Mon, Sun→Mon, else date+1
addBusinessDays(date, n): advance n business days forward, skipping Sat/Sun
```

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

### [MODIFY] ui.tsx

**Tab reorder:**
- Change default tab state from `'structure'` to `'templates'`
- Reorder tab buttons: Templates → Roster → Structure

**New `PlanPopup` component:**
- Receives rows and daterange columns as props
- Renders each row with a start date input and duration inputs per daterange column
- Duration inputs default to `1`, min `0.5`, step `0.5`
- Date calculation runs entirely in the iframe (simple date math, no perf concern)
- On "Apply Plan", computes all `DateRangeData` objects and emits `'apply-plan'` event
- Inline confirmation before applying
- Row 1 start date required, Row 2+ optional with chaining indicator

---

### [MODIFY] main.tsx

**New Plan icon in title bar:**
- Add a 📅 calendar SVG icon next to the ⚙️ gear icon
- Wire `onClick` to `handleOpenPlan`
- Disable icon (with tooltip) when no rows or no daterange columns exist

**`handleOpenPlan` function:**
- Gathers current rows and columns
- Calls `showUI({ width: 450, height: 520, title: 'Plan Timeline' }, { type: 'plan', rows, columns })`
- Registers listener for `'apply-plan'` event
- On receiving plan data: iterates each row's cell updates, writes `DateRangeData` into `rowsMap`
- Calls `updateLastEdited()` after writing
- Closes popup after applying

---

### [MODIFY] types.ts

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
- Per-row skip checkbox in Plan popup — all rows are planned in v1
- Persisting plan inputs (durations/start dates) — ephemeral in v1

---

## Verification Plan

### Manual Verification
1. Open widget in Figma → confirm ⚙️ gear opens Settings with tabs: **Templates → Roster → Structure**
2. Confirm new 📅 Plan icon appears in the widget title bar
3. Verify Plan icon is **disabled** when no rows or no daterange columns exist
4. Apply Polaris D&E template, add 3 rows with task names
5. Click 📅 → Plan popup opens showing all 3 rows with daterange columns
6. Enter start date for Row 1 only → verify "Apply Plan" enabled
7. Leave Row 2 & 3 start dates empty → verify chaining indicator shown
8. Set various durations (0.5, 1, 2, 3) → click "Apply Plan"
9. Confirm confirmation dialog appears → confirm → dates populate in widget → popup closes
10. Verify dates skip weekends (e.g., Fri → Mon)
11. Verify 0.5 day = single date, 1 day = single date, 2+ days = range
12. Verify 0.5 followed by 1 day: the 1-day column absorbs leftover and spans 2 business days
13. Verify two consecutive 0.5 columns land on consecutive business days (not same day)
14. Verify existing revision history is preserved (click a date cell → check history count)
15. Enter a Saturday start date → verify calculation starts from Monday
16. Run `npm run build` in widget directory → no errors
