# Timeline Estimator

A suite of tools for Figma and FigJam designed to build, manage, and collaborate on project timeline estimation tables. 

This repository contains two distinct complementary implementations:
1. **Figma Plugin (`plugin/`)** — Form-driven generator that creates native, styled Auto Layout tables in Figma Design files.
2. **FigJam & Figma Widget (`widget/`)** — Interactive canvas widget with live inline editing, date range history audit trails, status badges, and team assignee rosters.

---

## 🚀 Key Features Comparison

| Feature | Figma Plugin (`plugin/`) | Canvas Widget (`widget/`) |
| :--- | :---: | :---: |
| **Primary Environment** | Figma Design Files | Figma & FigJam Canvas |
| **Editing Style** | Form modal (Setup, Columns, Rows, Preview) | Direct on-canvas inline interaction & UI popovers |
| **Output Type** | Native Figma Auto Layout Frames & Text Nodes | Live Interactive Widget Component |
| **Date Tracking** | Native UI Date Picker | Date Range Picker + **Change History Audit Trail** |
| **Assignee Management** | Text Column | Interactive Roster & Multi-Assignee Dropdown |
| **Templates Included** | Polaris D&E, Design Sprint, Dev Timeline | Custom Column & Row configurations |
| **Theme Support** | Dark & Light Modes | Modern Dark / Light Design System |

---

## 📂 Repository Structure

```text
timeline-estimator-plugin/
├── plugin/                       # Figma Plugin package
│   ├── src/
│   │   ├── main.ts               # Figma sandbox code (table frame rendering)
│   │   ├── ui.tsx                # Multi-tab Preact modal UI
│   │   └── types.ts              # Plugin type definitions
│   ├── package.json              # Plugin dependencies & build config
│   ├── DEVELOPER_GUIDE.md        # Technical guide for plugin developers
│   └── README.md                 # Plugin specific guide
│
├── widget/                       # FigJam / Figma Widget package
│   ├── src/
│   │   ├── main.tsx              # Widget canvas component rendering & logic
│   │   ├── ui.tsx                # Date picker, dropdown, and settings iframe UI
│   │   ├── theme.ts              # Widget design system and status badges tokens
│   │   └── types.ts              # Widget data types (DateHistoryEntry, Roster, etc.)
│   ├── package.json              # Widget dependencies & build config
│   └── README.md                 # Widget specific guide
│
├── .gitignore                    # Root gitignore rules
└── README.md                     # Root project documentation (this file)
```

---

## 🛠️ Prerequisites & Setup

### Requirements
- **Node.js** — v22 recommended
- **Figma Desktop App** — Required for importing local manifests during development.

### Installation

Clone the repository and install dependencies inside the desired package folder:

```bash
# Clone the repository
git clone <repository-url>
cd timeline-estimator-plugin

# For Figma Plugin development:
cd plugin
npm install

# For Figma / FigJam Widget development:
cd ../widget
npm install
```

---

## 📦 Package 1: Figma Plugin (`plugin/`)

The plugin opens a setup window where you can build your timeline table step-by-step and insert it directly onto your Figma canvas.

### Build & Run
```bash
cd plugin

# Build the plugin output (generates build/ and manifest.json)
npm run build

# Watch mode for active development
npm run watch
```

### Loading into Figma
1. Open **Figma Desktop App**.
2. Open any Figma Design file.
3. Go to **Plugins → Development → Import plugin from manifest...**
4. Choose `plugin/manifest.json`.
5. Launch via **Plugins → Development → Timeline Estimator**.

### Workflow
1. **Setup Tab**: Set project title, toggle dark/light theme, or pick a preset template (Polaris D&E, Design Sprint, Dev Timeline).
2. **Columns Tab**: Add, rename, reorder, or delete custom columns (Date, Text, or Status types).
3. **Rows Tab**: Fill out task rows, set dates via native date picker, and assign status badges (e.g. *WIP*, *Done*, *Yet to start*, *Blocked*, *In review*).
4. **Preview & Generate**: Preview layout and click **▶ Generate in Figma**. The plugin automatically calculates canvas bounds to place the table without overlapping existing design frames.

---

## 🧩 Package 2: Timeline Estimator Widget (`widget/`)

An interactive widget that resides directly on your canvas. It supports live state syncing, custom status options, team roster assignment, and audit history for modified dates.

### Build & Run
```bash
cd widget

# Build widget output
npm run build

# Watch mode for active development
npm run watch
```

### Loading into Figma / FigJam
1. Open **Figma Desktop App** and open a FigJam or Figma file.
2. Open Quick Actions search bar (`Cmd + /` or `Ctrl + /`).
3. Search for **Import widget from manifest...**
4. Select `widget/manifest.json`.
5. Insert the widget onto your canvas.

### Core Widget Features
- **Date Range Audit History**: Track changes to start/end dates, complete with timestamps, user names, and optional change reasons.
- **Team Roster & Assignees**: Manage project team members and select single or multiple assignees per row with dynamic avatar colors.
- **Custom Status Badges**: Select and render status tags dynamically on canvas.
- **Light & Dark Theme Toggle**: Switch instantly between Light and Dark themes directly within the Settings menu.
- **Copy Plan Exporter**: Copy full timeline data to clipboard as formatted TSV for pasting directly into Excel, Google Sheets, or docs.
- **On-Canvas Controls**: Add/remove rows and columns, reorder items, and customize table settings directly from the canvas interface.

---

## 🎨 Tech Stack & Tooling

- **Framework**: [Create Figma Plugin](https://yuanqing.github.io/create-figma-plugin/)
- **UI & State**: Preact, TypeScript (`>=5.0`), Figma Widget API (`@figma/widget-typings`)
- **Compilation**: `@create-figma-plugin/build` (built on esbuild)

---

## 🚢 Publishing to Figma Community

Both packages can be published to the Figma Community store:

1. Run `npm run build` in the target package (`plugin/` or `widget/`).
2. Open Figma Desktop App → **Community** tab → **Publish plugins / widgets**.
3. Fill out store listing details (title, description, cover image `1920x960px`).
4. Submit for Figma review.

---

## 📄 License

Internal / Proprietary design tool created for team workflow efficiency.
