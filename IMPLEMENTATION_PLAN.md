# Timeline Estimator Widget — Plan Tab & Tab Reorder Implementation Plan

## Current State

The widget is a **Figma Widget** (not a plugin) that lives on the canvas as an interactive table. Clicking the ⚙️ gear icon opens a settings popup (iframe UI) with 3 tabs:

**Current tab order**: Structure → Templates → Roster

**How dates work today**: Each `daterange` column cell is set by clicking it → opening a date picker popup → manually entering start & end dates. Dates are stored as `DateRangeData` with revision history.

---

## What We're Changing

### 1. Reorder Settings Tabs

**New tab order**: `Templates` → `Roster` → `Structure`

---

### 2. Add "Plan" Tab — Auto-Calculate Date Ranges

A new 4th tab in the settings popup where users define **start date + duration per row** and the widget **auto-calculates all daterange columns**.

#### How it works

```
Templates → Roster → Structure → Plan
```

##### Input UI (per row)
For each row in the widget, the Plan tab shows:

| Row Name | Start Date | Col 1 (days) | Col 2 (days) | Col 3 (days) | ... |
|----------|------------|---------------|---------------|---------------|-----|
| Task 1   | 📅 picker  | 1             | 0.5           | 2             | ... |
| Task 2   | 📅 picker  | 3             | 1             | 0.5           | ... |

- **Start Date**: A date input per row — the date this row's first column begins.
- **Days per column**: A number input for each `daterange` column in the template. Minimum value: `0.5`. Default: empty.
- Only `daterange` type columns appear as day-input columns. Text/status/assignee columns are skipped.

##### Calculation Logic

For a given row, dates flow **left-to-right sequentially** across daterange columns:

```
Column 1 start = Row Start Date
Column 1 end   = Column 1 start + (days - 1)     [if days >= 1]
                  OR Column 1 start               [if days = 0.5, single date]
Column 2 start = Column 1 end + 1 business day
Column 2 end   = Column 2 start + (days - 1)      ...and so on
```

**Rules:**
- `0.5 days` → single date (start = end, displayed as just one date, e.g. "15 July")
- `1 day` → single date (start = end)
- `1.5 days` → start date + 1 day range (rounds up, so 2-day range)  
- `2 days` → start date to start+1 (2 calendar days)
- Each subsequent column picks up from the **next day** after the previous column ended
- **Weekend skipping**: OFF by default (all calendar days counted)

##### What happens on "Apply Plan"

When the user clicks **"Apply Plan"**, for each row:
1. Calculate all date ranges per the logic above
2. Write the computed values into the widget's `rowsMap` for each daterange cell as a `DateRangeData` object
3. The mode is `'update'` (not `'revise'`) — it's a fresh set, not a revision
4. If a cell already has data and history, applying the plan will **overwrite it as a new update** (history is preserved, a new entry is pushed)

---

## Proposed Changes

### UI Layer — `timeline-estimator-widget/src/ui.tsx`

1. **Reorder tabs** — Change default tab from `'structure'` to `'templates'`. Reorder the tab buttons in the JSX to: Templates → Roster → Structure → Plan.

2. **Add `'plan'` to tab state** — Extend the tab union type:
   ```ts
   useState<'roster' | 'structure' | 'templates' | 'plan'>('templates')
   ```

3. **Add Plan tab UI** — A new panel that:
   - Lists each row (by its text column value / "Row N" fallback)
   - Has a date input for each row's start date
   - Has a number input (step=0.5, min=0.5) for each daterange column
   - Has an "Apply Plan" button at the bottom
   - Sends an `'apply-plan'` event with the computed date data

---

### Widget Layer — `timeline-estimator-widget/src/main.tsx`

1. **Pass rows data to the settings UI** — Currently `handleOpenSettings` only sends `columns` and `roster`. We need to also send `rows` so the Plan tab can render row names and current dates.

2. **Handle `'apply-plan'` event** — New listener inside `handleOpenSettings` that receives computed date values and writes them into `rowsMap` cells as `DateRangeData`.

---

### Types — `timeline-estimator-widget/src/types.ts`

Add the Plan data type:
```ts
export interface PlanEntry {
  rowId: string;
  startDate: string; // ISO date string
  durations: { [columnId: string]: number }; // days per daterange column
}
```

---

## Open Questions

1. **Q1: Weekend/holiday skipping?**
   I'm assuming we count all calendar days (no weekend skipping). If you want Mon–Fri only, the calculation needs a business-day counter. Which do you prefer?

2. **Q2: Should "Apply Plan" warn before overwriting existing dates?**
   If rows already have manually-set dates with revision history, applying the plan will push a new entry. Should we show a confirmation dialog, or just apply silently?

3. **Q3: Where does the calculation happen — UI iframe or widget main?**
   I'm planning to do the date math in the **UI iframe** (`ui.tsx`) and send the fully computed `DateRangeData` objects back. This keeps `main.tsx` simple. Alternative: send raw durations to `main.tsx` and compute there. Preference?

4. **Q4: What if a row has no start date or a column has no duration?**
   My assumption: skip that cell (leave it unchanged). If the start date is missing, skip the entire row. If a specific column's duration is empty, skip that column and the next column starts from where the last filled one ended. Correct?

---

## Verification Plan

### Manual Verification
1. Open the widget in Figma, click ⚙️ — confirm tabs appear as **Templates → Roster → Structure → Plan**
2. Apply a template (e.g. Polaris D&E), add rows
3. Go to Plan tab — enter start dates and durations for 2–3 rows
4. Click "Apply Plan" — confirm dates appear correctly in the widget table
5. Verify: 0.5 days shows as single date, 2+ days shows as range
6. Verify: sequential columns chain correctly (Col 2 starts day after Col 1 ends)
7. Build with `npm run build` in the widget directory — confirm no errors
