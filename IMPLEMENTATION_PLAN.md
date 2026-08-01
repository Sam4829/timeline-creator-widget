# Timeline Estimator Widget — Implementation Plan v3 (Final)

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
- **Row 2+**: Start date is **optional**. If empty, chains from the previous row's last daterange column end date + 1 business day. If filled, uses the user-specified date (overlaps allowed for parallel work).

### Start Date on a Weekend

The input **accepts** weekend dates, but the calculation **rolls forward** to the next business day (Mon–Fri) before applying.

Example: User enters Saturday Aug 2 → effective start = Monday Aug 4.

### Date Calculation Logic

**Business days only** (Mon–Fri, weekends skipped).

#### Cursor Model

A cursor points to the current date. It moves forward as columns consume days.

```
For each row (top to bottom):

  Determine row start date:
    - If user entered a date → use it (roll to next biz day if weekend)
    - If empty (Row 2+ only) → previous row's last daterange end + 1 biz day

  cursor = row start date

  For each daterange column (left to right):
    duration = user-specified days (default: 1, min: 0.5, step: 0.5)

    if duration < 1 (i.e. 0.5):
      start = cursor
      end = cursor
      cursor stays (no advance)      ← half-day, next col starts same day

    if duration == 1:
      start = cursor
      end = cursor
      cursor = nextBusinessDay(cursor) ← full day consumed

    if duration > 1:
      calendarDays = ceil(duration)
      start = cursor
      end = addBusinessDays(cursor, calendarDays - 1)
      cursor = nextBusinessDay(end)

    Write { start, end } as DateRangeData
```

#### Duration Examples (starting Monday Aug 4)

| Duration | Start | End | Display | Cursor After |
|----------|-------|-----|---------|--------------|
| 0.5 | Aug 4 | Aug 4 | "4 August" | Aug 4 (stays) |
| 1 | Aug 4 | Aug 4 | "4 August" | Aug 5 (Tue) |
| 1.5 | Aug 4 | Aug 5 | "4 Aug – 5 Aug" | Aug 6 (Wed) |
| 2 | Aug 4 | Aug 5 | "4 Aug – 5 Aug" | Aug 6 (Wed) |
| 3 | Aug 4 | Aug 6 | "4 Aug – 6 Aug" | Aug 7 (Thu) |
| 3 (from Thu) | Aug 7 | Aug 11 | "7 Aug – 11 Aug" | Aug 12 (Tue) |

Note: 3 days from Thursday = Thu, Fri, Mon (skips Sat/Sun). End = Mon Aug 11.

#### Row-to-Row Chaining

When Row 2+ has no start date, it always starts on the **next business day** after the previous row's last daterange column end date — regardless of whether that last column was 0.5 or 1 day.

```
Row 1 last col: 0.5 days, end = Fri Aug 8 → Row 2 starts Mon Aug 11
Row 1 last col: 1 day, end = Fri Aug 8   → Row 2 starts Mon Aug 11
```

#### Helper Functions

```ts
nextBusinessDay(date): if Fri→Mon, Sat→Mon, Sun→Mon, else date+1
addBusinessDays(date, n): advance n days skipping Sat/Sun
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

**`handleOpenPlan` function:**
- Gathers current rows and columns
- Calls `showUI({ width: 450, height: 520, title: 'Plan Timeline' }, { type: 'plan', rows, columns })`
- Registers listener for `'apply-plan'` event
- On receiving plan data: iterates each row's cell updates, writes `DateRangeData` into `rowsMap`
- Calls `updateLastEdited()` after writing

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

---

## Verification Plan

### Manual Verification
1. Open widget in Figma → confirm ⚙️ gear opens Settings with tabs: **Templates → Roster → Structure**
2. Confirm new 📅 Plan icon appears in the widget title bar
3. Apply Polaris D&E template, add 3 rows with task names
4. Click 📅 → Plan popup opens showing all 3 rows with daterange columns
5. Enter start date for Row 1 only → verify "Apply Plan" enabled
6. Leave Row 2 & 3 start dates empty → verify chaining indicator shown
7. Set various durations (0.5, 1, 2, 3) → click "Apply Plan"
8. Confirm confirmation dialog appears → confirm → dates populate in widget
9. Verify dates skip weekends (e.g., Fri → Mon)
10. Verify 0.5/1 day = single date, 2+ days = range
11. Verify 0.5-day cursor stays vs 1-day cursor advances
12. Verify existing revision history is preserved (click a date cell → check history count)
13. Enter a Saturday start date → verify calculation starts from Monday
14. Run `npm run build` in widget directory → no errors
