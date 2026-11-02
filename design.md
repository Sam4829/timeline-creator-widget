# Timeline Estimator — Unified Design System Specification (`design.md`)
> Precision Canvas Instrument & Synchronized Modal Dialog Design System

**Primary Source of Truth:** Canvas Widget (`widget/src/theme.ts` & `widget/src/main.tsx`)  
**Secondary Pattern Source:** Linear Precision UI Interactions (`Linear_Design.md` adapted to Canvas tokens)  
**Default Theme:** Dark Mode (Figma Canvas Dark `#1E1E1E` / `#2C2C2C` with Slate `#141B24` parity)

---

## 1. System Philosophy & Architecture

The **Timeline Estimator Design System** unifies the **FigJam Canvas Widget** (declarative Figma scene-graph nodes) with the **Modal Dialog System** (HTML/CSS sandboxed iframes).

1. **Canvas First:** The color palette, border weights, corner radii, and typography are anchored directly in the live canvas widget implementation (`theme.ts` and `main.tsx`).
2. **Linear Precision Patterns for Modals:** Where the canvas widget does not define dialog components (form inputs, segmented tab bars, date steppers, reorderable drag rows, two-step inline delete confirmations), we adopt Linear's precision interaction architecture, but **re-skin it 100% using the canvas widget's native tokens and typography**.
3. **Typography Parity:** Strict adherence to Figma's native **`Inter, sans-serif`** font family and the canvas widget's exact font scale and weight hierarchy.

---

## 2. Foundational Tokens (Canvas Widget Authority)

### 2.1 Surface & Structural Colors (`ThemeTokens.dark` & `ThemeTokens.slate`)

| Token Name | Hex Value | CSS Variable | Canvas Widget Role | Modal UI Role |
|:---|:---|:---|:---|:---|
| **Canvas Background** | `#1E1E1E` | `--surface-bg` | Main widget card fill (`fill={theme.bg}`) | Modal body canvas, outer iframe base |
| **Header Surface** | `#1E1E1E` | `--surface-header` | Title bar container (`fill={theme.headerBg}`) | Modal title bar (`42px` header) |
| **Elevated Surface (Sub)** | `#2C2C2C` | `--surface-sub` | Row alternate fill, button hover fill (`theme.subBg`) | Card panels, input fills, tab bar track |
| **Hairline Border** | `#383838` | `--border-hairline` | 1px horizontal dividers, card stroke (`theme.border`) | Modal dividers, input borders, card outlines |
| **Text Primary (Header)** | `#FFFFFF` | `--text-header` | Widget title, column headers (`theme.headerFg`) | Modal titles, section labels, active tabs |
| **Text Primary (Body/Cell)** | `#E8E8E8` | `--text-body` | Cell text, button labels (`theme.cellFg` — 11.5:1 AAA) | Modal input text, row names, table cells |
| **Text Muted (Sub/Meta)** | `#BEBEBE` | `--text-sub` | Row indexes, "Last edited", placeholders (`theme.subFg` — 8.6:1 AAA) | Inactive tabs, helper hints, empty state subtext |
| **Primary Accent (Slate Blue)** | `#60A5FA` | `--accent-primary` | Slate theme accent (`theme.accent` — 8.9:1 AAA) | Primary CTA buttons (`Apply Plan`, `Done`), focus rings |
| **Deep Brand Blue** | `#0A6DC2` | `--accent-brand` | Assignee avatar blue token | Filled button base, active indicators |

---

### 2.2 Status Badges (WCAG AAA Contrast Standard from `theme.ts`)

All status tokens are designed as **dark chromatic background washes** paired with **high-contrast pastel text**:

| Status | Background Fill | Foreground Text | Contrast | CSS Token Variable |
|:---|:---|:---|:---|:---|
| **Done** | `#0D3326` | `#4ADE80` | 8.4:1 AAA | `--status-done-bg`, `--status-done-fg` |
| **WIP** | `#2D1B41` | `#DFC4FF` | 9.2:1 AAA | `--status-wip-bg`, `--status-wip-fg` |
| **In Review** | `#0F2040` | `#93C5FD` | 8.1:1 AAA | `--status-review-bg`, `--status-review-fg` |
| **Yet to start** | `#2C2C2C` | `#F7D15F` | 8.5:1 AAA | `--status-pending-bg`, `--status-pending-fg` |
| **Blocked / Danger** | `#3B0D0D` | `#FCA5A5` | 8.7:1 AAA | `--status-danger-bg`, `--status-danger-fg` |

> **Modal Adaptation:**  
> The Blocked token (`#3B0D0D` / `#FCA5A5`) directly powers **modal warning toasts, required error indicators, and inline delete confirmations** (`Delete row? Yes / Cancel`).

---

### 2.3 Team Assignee Avatar Palette (`main.tsx:767`)

Avatars use a 6-color palette distributed uniformly via character-code sum hashing:
`hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 6`

| Index | Color Name | Hex Token | CSS Variable |
|:---:|:---|:---|:---|
| **0** | Orchid Purple | `#8A38F5` | `--avatar-0` |
| **1** | Pine Green | `#198F51` | `--avatar-1` |
| **2** | Azure Blue | `#0A6DC2` | `--avatar-2` |
| **3** | Terracotta Red | `#D05141` | `--avatar-3` |
| **4** | Amber Ochre | `#D4860A` | `--avatar-4` |
| **5** | Deep Teal | `#1A7A8A` | `--avatar-5` |

* **Avatar Typography:** `fontSize: 9px`, `fontWeight: 700` (`bold`), text color `#FFFFFF`.
* **Avatar Geometry:** `width: 16px`, `height: 16px` (canvas) / `20px` (modal), `cornerRadius: 999px` (circle), `stroke: 1px` with background knockout.

---

## 3. Typography Specification (Canvas Widget Authority)

The typography is built on Figma’s native UI font stack:

```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-family-mono: 'JetBrains Mono', 'Berkeley Mono', ui-monospace, SFMono-Regular, monospace;
```

### Type Scale & Hierarchy

| Role | Size | Weight | Line Height | Color Token | Usage in System |
|:---|:---:|:---:|:---:|:---|:---|
| **Widget Title** | `24px` | `700` (Bold) | `1.2` | `#FFFFFF` (`theme.headerFg`) | Canvas title bar, modal section heroes |
| **Section / Card Header** | `13px` | `600` (Semi-bold) | `1.3` | `#FFFFFF` | Modal window header, task card titles |
| **Column Header** | `11px` | `700` (Bold) | `1.4` | `#FFFFFF` (opacity `0.9`) | Canvas column header, modal table headers |
| **Primary Cell / Label** | `11px` | `700` (Bold) / `600` | `1.4` | `#E8E8E8` (`theme.cellFg`) | Task titles, input text, row titles |
| **Body / Dropdown Item** | `11px` | `400` (Regular) | `1.5` | `#E8E8E8` (`theme.cellFg`) | Dropdown menu options, descriptions |
| **Button Text** | `11px` | `500` (Medium) | `1.0` | `#E8E8E8` or `#FFFFFF` | Canvas buttons (`Make plan`, `Add row`), modal buttons |
| **Subtext / Meta** | `11px` | `400` (Regular) | `1.3` | `#BEBEBE` (`theme.subFg`) | "Last edited", empty states, auto-chaining hint |
| **Status Badge Text** | `11px` | `700` (Bold) | `1.0` | Status FG token | Status pills on canvas and modal dropdowns |
| **Avatar Monogram** | `9px` | `700` (Bold) | `1.0` | `#FFFFFF` | Circular assignee initial badges |
| **Monospace Values** | `11px` | `500` (Medium) | `1.4` | `#E8E8E8` / `#60A5FA` | ISO dates (`2026-10-01`), durations (`1.5 d`) |

---

## 4. Geometry & Elevation (Canvas Widget Authority)

The corner radius vocabulary is clean and strictly bounded:

```css
--radius-card: 12px;     /* Canvas outer card, modal window, plan card containers */
--radius-pill: 12px;     /* Status badges (canvas & modal) */
--radius-button: 5px;   /* All buttons (Make plan, Settings, Add row, Modal buttons) */
--radius-input: 5px;    /* Text inputs, date inputs, dropdown selects */
--radius-circle: 999px;  /* Avatar tokens */
```

### Elevation & Borders
* **No Ambient Drop Shadows:** Surfaces are delineated by **`1px solid #383838`** hairlines, matching the canvas widget's `strokeWidth={1}`.
* **Modal Window Frame:** Casts an outer OS window shadow (`0 20px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px #383838`) to lift the iframe above the FigJam board.

---

## 5. Modal Extensions (Linear Patterns Adapted to Canvas Tokens)

This section fills in the blanks for UI patterns present in the modals that have no direct representation on the canvas:

### 5.1 Modal Window Frame
* **Dimensions:**
  * Settings Modal: `width: 400px`, `height: 500px`
  * Plan Timeline Modal: `width: 466px`, `height: 540px`
* **Header Bar:**
  * Height: `42px`, background `#1E1E1E`, border-bottom `1px solid #383838`.
  * Left: Figma code badge `</>` (`width: 20px`, `height: 20px`, background `#2C2C2C`, border `1px solid #383838`, text `#BEBEBE`) + Title (`Inter 13px Bold #FFFFFF`).
  * Right: Close button `✕` (`24×24px`, color `#BEBEBE`, hover `#FFFFFF`, hover bg `rgba(255, 255, 255, 0.08)`).

---

### 5.2 Segmented Tab Navigation (Settings Modal)
Adapted from Linear's segmented control, re-themed to canvas tokens:
* **Track:** Background `#2C2C2C` (`--surface-sub`), border `1px solid #383838`, radius `5px`, padding `3px`, gap `2px`.
* **Inactive Tab:** Transparent background, text `#BEBEBE`, font `Inter 11px Medium`, hover background `rgba(255, 255, 255, 0.05)`, hover text `#FFFFFF`.
* **Active Tab:** Background `#383838` (or `#1E1E1E`), border `1px solid rgba(255, 255, 255, 0.1)`, text `#FFFFFF`, font `Inter 11px Bold`, shadow `0 1px 2px rgba(0, 0, 0, 0.4)`.

---

### 5.3 Form Inputs & Selects
* **Text Input:**
  * Background: `#2C2C2C` (`theme.subBg`)
  * Border: `1px solid #383838` (`theme.border`)
  * Text: `11px Inter Bold/Regular #E8E8E8`
  * Radius: `5px` (`--radius-input`)
  * Padding: `6px 10px`
  * Focus state: Border brightens to `#60A5FA` (`theme.accent` / Slate Blue) with `0 0 0 1px #60A5FA` ring.
  * Placeholder: `#BEBEBE` at `0.6` opacity.
* **Date Input:**
  * Same container style as text input, with monospace font (`--font-family-mono`) and dark calendar picker indicator.

---

### 5.4 Primary & Ghost Buttons

#### A. Primary Action Button (`Apply Plan`, `Done`)
Fills the gap for high-contrast primary actions using the widget's Slate Blue accent:
* Background: `#0A6DC2` (Brand Blue) or `#60A5FA` with dark text.
* Standard Dark Theme: Background `#0A6DC2`, text `#FFFFFF`, font `Inter 11px Bold`, radius `5px`, padding `9px 16px`.
* Hover state: Background `#117FD6`, subtle glow `0 0 12px rgba(10, 109, 194, 0.4)`.
* Disabled state: Background `#2C2C2C`, text `#BEBEBE` (opacity `0.4`), border `1px solid #383838`, cursor `not-allowed`.

#### B. Creation & Ghost Action Buttons (`+ Add member`, `+ Add row`, `+ Add column`, `Make plan`, `Settings`)
All secondary creation triggers (`+ Add member` in Roster, `+ Add row` in Rows, `+ Add column` in Columns) and title bar actions are strictly harmonized to the exact same ghost button specification:
* **Icon:** Minimalist `+` vector glyph (`10×10px`, stroke `1.3px`).
* **Background:** `transparent` (or `#1E1E1E`).
* **Border:** `1px dashed #383838` (or `1px solid #383838`), matching canvas widget stroke.
* **Radius:** `5px` (`cornerRadius={5}`).
* **Padding:** `6px 12px` (compact inline).
* **Typography:** `Inter 11px Medium #E8E8E8` (`theme.cellFg`).
* **Hover State:** Background `#2C2C2C` (`hoverStyle={{ fill: theme.subBg }}`), border-color `#4A4A4A`, text `#FFFFFF`.

---

### 5.5 Plan Timeline Modal Components
* **Task Card Container:**
  * Background: `#1E1E1E` (canvas) with border `1px solid #383838`, radius `8px`–`12px`, padding `12px 14px`.
* **Chaining Indicator:**
  * Linear-style auto-chaining hint: `↳ Chains from prev row if left blank` rendered in `10px Inter Italic` with `#BEBEBE` color.
* **Duration Counter Table:**
  * Background: `#2C2C2C` (`theme.subBg`) with border `1px solid #383838`.
  * **Far-Right Alignment:** Header `th:last-child` and cell `td:last-child` are strictly aligned to the **far right** (`text-align: right; width: 140px; padding-right: 12px;`).
  * **Stepper Container:** `display: inline-flex; margin-left: auto;` with `−` / `+` micro-buttons and `11px Mono` number value (`1.0 d`), anchored against the right card edge.

---

### 5.6 Row Management & Drag-to-Reorder (Rows Tab)
* **Grip Handle:** 6-dot drag icon (`⋮⋮`) in `#BEBEBE` (`theme.subFg`), cursor `grab` / `grabbing`.
* **Row Item:** Height `36px`, border-bottom `1px solid #383838`, hover fill `#2C2C2C`.
* **Two-Step Inline Delete (No `window.confirm()`):**
  * Step 1: Click `Remove` (soft text in `#FCA5A5`).
  * Step 2: In-place transition to `Delete? Yes / Cancel` using the Blocked/Danger token:
    * `Yes` $\rightarrow$ `#FCA5A5` (bold, click commits removal).
    * `Cancel` $\rightarrow$ `#BEBEBE` (click aborts).

---

### 5.7 Template Preset Cards (Templates Tab)
Linear's rich preset cards re-skinned with canvas widget tokens:
* Card container: Background `#2C2C2C`, border `1px solid #383838`, radius `5px`, padding `10px 12px`.
* Hover state: Background `#383838`, border `rgba(255, 255, 255, 0.15)`.
* Confirmation Banner: Background `#3B0D0D`, border `1px solid #FCA5A5`, text `#FCA5A5`.

---

## 6. Implementation Reference: CSS Variables (`ui.css`)

Drop-in CSS variables for modal stylesheets:

```css
:root {
  /* Surfaces — Exact match to ThemeTokens.dark */
  --surface-bg: #1E1E1E;
  --surface-header: #1E1E1E;
  --surface-sub: #2C2C2C;
  --border-hairline: #383838;

  /* Typography Colors — AAA WCAG */
  --text-header: #FFFFFF;
  --text-body: #E8E8E8;
  --text-sub: #BEBEBE;

  /* Primary Accent — Matching Widget Slate / Azure */
  --accent-primary: #0A6DC2;
  --accent-primary-hover: #117FD6;
  --accent-primary-fg: #FFFFFF;
  --accent-focus-ring: #60A5FA;

  /* Status Colors — Exact match to StatusTokens */
  --status-done-bg: #0D3326;
  --status-done-fg: #4ADE80;
  --status-wip-bg: #2D1B41;
  --status-wip-fg: #DFC4FF;
  --status-review-bg: #0F2040;
  --status-review-fg: #93C5FD;
  --status-pending-bg: #2C2C2C;
  --status-pending-fg: #F7D15F;
  --status-blocked-bg: #3B0D0D;
  --status-blocked-fg: #FCA5A5;

  /* Assignee Avatar Colors — Exact match to main.tsx */
  --avatar-0: #8A38F5;
  --avatar-1: #198F51;
  --avatar-2: #0A6DC2;
  --avatar-3: #D05141;
  --avatar-4: #D4860A;
  --avatar-5: #1A7A8A;

  /* Fonts & Weights */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Berkeley Mono', ui-monospace, SFMono-Regular, monospace;

  /* Radii Vocabulary */
  --radius-card: 12px;
  --radius-pill: 12px;
  --radius-button: 5px;
  --radius-input: 5px;
  --radius-circle: 999px;
}
```

---

## 7. Do’s and Don’ts Summary

### Do:
- **Do** use `#1E1E1E` and `#2C2C2C` as the background substrate for all modals to match the canvas widget.
- **Do** use `cornerRadius: 5px` for all buttons and inputs to match `Make plan` and `Settings`.
- **Do** use `Inter` at size `11px` with weight `700` (`bold`) for headers/primary labels and `400` for metadata.
- **Do** use the 6 avatar colors (`#8A38F5`, `#198F51`, `#0A6DC2`, `#D05141`, `#D4860A`, `#1A7A8A`) for assignee chips.
- **Do** use the Blocked token (`#3B0D0D` / `#FCA5A5`) for warnings and inline deletion prompts.

### Don’t:
- **Don’t** use near-black pitch `#08090a` if aligning directly with the canvas widget's dark theme (keep `#08090a` only if the widget canvas is also updated).
- **Don’t** use `window.confirm()` in any modal — it breaks OS focus in Figma desktop.
- **Don’t** use bright non-token neon colors (like arbitrary neon yellows or greens); adhere strictly to `StatusTokens` and the avatar palette.
- **Don’t** use large `16px+` corner radiuses on buttons or cards.
