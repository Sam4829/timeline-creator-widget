# Timeline Estimator Widget

An interactive canvas widget for Figma and FigJam designed for collaborative, real-time project timeline estimation and planning.

Built with [Create Figma Plugin](https://yuanqing.github.io/create-figma-plugin/) and the [Figma Widget API](https://figma.com/widget-docs/).

---

## ⚡ Key Features

- **Automated Plan Timeline Engine**:
  - Business-day date calculation with configurable 0.5+ day durations.
  - Automatic row-to-row dependency chaining and weekend roll-forward.
  - Duration inputs and start dates are persistently stored per row and restored when reopening the Plan modal.
  - Fallback start date deduction from existing table cells.
- **Contextual Popovers**:
  - Clean modal dialogs for setting dates, status badges, and assignees.
  - Informative header displaying `{Task Name / Row #} - {Column Name}` for clear context during edits.
- **Symmetric Date Range & Single Day Prefilling**:
  - Supports ISO date ranges (`YYYY-MM-DD – YYYY-MM-DD`) and single dates.
  - Single-day values prefill both start and end pickers for rapid 1-day milestone entry.
- **Team Roster & Multi-Assignees**:
  - Manage project team members in Settings.
  - Multi-select assignees per row with dynamic initials avatars and deterministic colors.
- **Theme Support**:
  - Instant Light and Dark mode switching in Settings, synchronized across all connected users via `useSyncedState`.
- **Pre-Built Role Templates**:
  - Quick setup templates including **Design & Experience**, **Design Sprint**, **Product Design**, **Brand/Marketing**, and **Blank**.
- **Settings & Row Management**:
  - Add, delete, and reorder rows directly inside the Settings dialog with inline deletion safeguards.
- **Copy Plan Exporter**:
  - Instant one-click copy of table contents as tab-separated values (TSV) for spreadsheets (Excel, Google Sheets) and docs.

---

## 📂 Project Structure

```text
widget/
├── src/
│   ├── main.tsx          # Canvas widget component rendering, synced state, & actions
│   ├── ui.tsx            # Iframe UI modals (Plan, DatePicker, Dropdown, Settings)
│   ├── theme.ts          # Color tokens, themes (Dark/Light), status badges
│   └── types.ts          # TypeScript interfaces (RowData, PlanRowResult, Roster, etc.)
├── build/                # Compiled JavaScript bundles (main.js, ui.js)
├── Linear_Design.md      # Linear design system & styling reference guide
├── manifest.json         # Figma widget manifest configuration
├── package.json          # Dependencies & build scripts
└── README.md             # This documentation
```

---

## 🛠️ Development & Build

### Prerequisites

- [Node.js](https://nodejs.org) — v22 recommended
- [Figma Desktop App](https://figma.com/downloads/)

### Build the Widget

```bash
# Install dependencies
npm install

# Build widget output (typechecks, minifies, produces build/ and manifest.json)
npm run build

# Watch mode for rapid development
npm run watch
```

### Loading into Figma or FigJam

1. Open **Figma Desktop App** and open any Figma Design or FigJam document.
2. Open the Quick Actions search bar (`Cmd + /` or `Ctrl + /`).
3. Search for **Import widget from manifest…**.
4. Select `widget/manifest.json`.
5. Insert the widget onto the canvas and start planning!

---

## 🎨 Design Reference

The widget UI adheres to a sleek, high-precision dark/light design system. For token references, surface elevations, type scales, and styling guidelines, refer to [`Linear_Design.md`](./Linear_Design.md).
