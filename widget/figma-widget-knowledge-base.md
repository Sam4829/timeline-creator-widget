# Figma Widget Dev — Agent Reference

Terse reference for building Figma Widgets (Widget API, not Plugin API). Grep by heading. No prose beyond what's needed to disambiguate.

## 1. Core APIs & Lifecycle
- `figma.widget.register(Component)` — registers root component that renders the widget node.
- tsconfig: `jsxFactory: figma.widget.h`, `jsxFragmentFactory: figma.widget.Fragment`.
- Runs in same sandbox as plugins.
- Two code modes: **Rendering code** (sync, declarative JSX) vs **State Updating code** (async, event handlers).
- Render must be pure — depends only on `useSyncedState`/`useSyncedMap`. Reading external canvas/node props during render is blocked.
- Mutating synced state → auto re-renders across all multiplayer clients.
- Event handlers run sync, terminate on completion. `async`/`Promise`-returning handlers delay termination until resolved or `figma.closePlugin()`.
- Process terminates on: file close, another widget opened, widget deleted, user hits stop bell.

## 2. State Management
- `useSyncedState<T>(key, initialValue)` → `[value, setter]`. Setter **overwrites** whole value.
- `useSyncedMap<T>(mapName)` → `{get(key), set(key,val), delete(key), keys(), values(), size()}`. Merges key-level mutations across clients — use for any list/multi-entry data in multiplayer.
- All stored values must be JSON-serializable.
- **Anti-pattern**: one monolithic `useSyncedState` object for multi-user data → clobbers concurrent edits. Use separate keys or `useSyncedMap`.
- Undo: `useSyncedState` counters revert *globally* across users on undo. `useSyncedMap` keyed by sessionId/userId scopes undo to local user only.
- `figma.commitUndo()` — registers Plugin API mutations into the undo stack alongside widget state changes.

## 3. UI Primitives
- Components: `<AutoLayout>`, `<Text>`, `<Input>`, `<SVG>`, `<Image>`, `<Rectangle>`, `<Ellipse>`, `<Frame>`.
- `<AutoLayout>`: `direction` (horizontal|vertical), `spacing`, `padding`, `cornerRadius`, `fill`, `stroke`, `horizontalAlignItems`, `verticalAlignItems`, `onClick`, `hoverStyle`.
- `<Text>`: `fontSize`, `fontFamily`, `fill`, `fontWeight`, `letterSpacing`, `lineHeight`, `onClick`, `hoverStyle`.
- `<Input>`:
  - `value` (bound string)
  - `onTextEditEnd: (e:{characters:string}) => void` — **fires on blur only, not per keystroke**
  - `placeholder`, `placeholderProps` (styling override for placeholder)
  - `inputFrameProps` (`fill`/`stroke`/`cornerRadius`/`padding` on wrapping frame)
  - `inputBehavior`: "wrap" | "truncate"
- `<Image>`: `src` = base64 data URI or HTTP URL; requires explicit numeric `width`/`height`.
- `<Frame>`/`<Rectangle>`/`<Ellipse>`: `width`, `height`, `fill` (hex or `{type:'image', src}`), `stroke`, `cornerRadius`, `onClick`.
- `<SVG>`: inline raw SVG string.
- **Always set unique `key` prop** on array-mapped root elements — perf warnings + broken diffing otherwise.

## 4. Styling Constraints
- Fills: solid hex string, or `{type:'image', src}`. Gradients: supported per official docs (confirmed separately — see §12).
- `cornerRadius`: uniform numeric supported; **per-corner also confirmed supported** (see §12 — official docs example above only mentions uniform, don't assume it's the ceiling).
- `stroke`: solid color string only.
- Shadows/blur: supported but expensive — **pre-rasterize as PNG via `<Image>`** for anything static.
- Blend modes: stick to `normal`/`passthrough`; anything else degrades perf.
- `hoverStyle`: only on click/edit targets; only overrides `fill`, `stroke`, `opacity`, recursively.
- Dark mode: Figma design = light+dark; FigJam = light only. Always set explicit `fill`/`stroke` — no widget theme API exists.
- Text on canvas nodes (Plugin API side) needs `figma.loadFontAsync(fontName)` before mutation.

## 5. Property Menu (`usePropertyMenu`)
- `usePropertyMenu(items, onChange)` — `onChange: (e:{propertyName, propertyValue?}) => void`.
- Renders in the widget's native floating selection toolbar (not custom-rendered chrome).
- `itemType`: `action` | `dropdown` | `color-selector` | `separator`.
- Item props: `propertyName`, `tooltip`, `itemType`, `options` (dropdown), `selectedOption`.
- Icons: 40×40px.
- **Never duplicate an on-canvas action in the property menu** — mutually exclusive.

## 6. iframe / showUI
- `figma.showUI(html, options?)` opens off-canvas modal/iframe.
- `options.position` — set relative to widget so iframe doesn't obscure the widget node.
- Iframe → widget: `parent.postMessage({pluginMessage: data}, '*')` → widget: `figma.ui.onmessage = (msg) => {}` (inside `useEffect`).
- Widget → iframe: `figma.ui.postMessage(data)` → iframe: `window.onmessage`.
- Calling `showUI()` inside a click handler needs the handler to **return a Promise** or the process terminates before the iframe responds.
- Iframe runs with `null` origin — external requests need `Access-Control-Allow-Origin: *` from the target server.
- `themeColors: true` in options → enables Figma CSS color vars inside iframe.

## 7. Persistence & Data
- `useSyncedState`/`useSyncedMap` values persist permanently in the `WidgetNode` JSON payload.
- Plain JS variables outside synced hooks reset on process termination — not persistent.
- Cross-instance access (Plugin API):
  - `WidgetNode.widgetId` — matches `figma.widgetId` from manifest
  - `figma.currentPage.findWidgetNodesByWidgetId(id)` — all instances on page
  - `WidgetNode.widgetSyncedState` — read another instance's state
  - `WidgetNode.setWidgetSyncedState(syncedState, syncedMap)` — write another instance's state
  - `WidgetNode.cloneWidget(syncedStateOverrides, syncedMapOverrides)` — duplicate w/ overrides (map key override replaces whole map)
- **Never rename synced state/map key strings** across updates — resets data on all existing instances.
- Default values in `useSyncedState` only apply when key is absent — adding a new field to the default object does **not** backfill existing widgets already on canvas.

## 8. Interactions
- `onClick: (event: WidgetClickEvent) => void` on `AutoLayout`/`Text`/`Frame`/etc.
- `event.offsetX/offsetY` — relative to target node. `event.canvasX/canvasY` — absolute canvas coords.
- `<Input onTextEditEnd>` — blur-only (see §3).
- FigJam-only stickable hooks:
  - `useStickable()` — widget attaches/moves with host (sticky note, stamp)
  - `useStickableHost(callback)` — widget becomes a host for stamps/highlights
  - **Cannot use both in the same component.** **Never use either when `editorType` includes `"figma"`.**
- Anything needing per-keystroke input, complex forms, file upload, or freeform drawing → needs `figma.showUI` iframe, not on-canvas.

## 9. Performance Best Practices
- `manifest.json`: `"documentAccess": "dynamic-page"` — avoids loading every page on file open (can save 20-30s in large files).
- Unique `key` on mapped lists (perf, not just correctness).
- Rasterize complex SVG/shadows/blurs to PNG, render via `<Image>`.
- Blend modes: `normal`/`passthrough` only.
- Leave un-clickable padding on the widget's outer container so users can select/move it without triggering `onClick`.
- Restrict `manifest.networkAccess.allowedDomains` to only what's needed.

## 10. Publishing Requirements
`manifest.json` required fields:
- `name`, `id` (unique dev app id), `api` (Plugin API ver, e.g. "1.0.0"), `widgetApi` (Widget API ver)
- `editorType`: `["figma"]` | `["figjam"]` | `["figma","figjam"]`
- `containsWidget: true`
- `main`: path to compiled bundle (e.g. `"dist/code.js"`)
- `ui`: path to iframe HTML
- `documentAccess: "dynamic-page"`
- `networkAccess`: `{allowedDomains, reasoning, devAllowedDomains}`
  - `allowedDomains`: `["none"]` | `["*"]` (needs `reasoning`) | explicit domain list
- Published widgets are pinned to the `widgetApi` version at publish time — breaking API changes don't retroactively affect live widgets.

## 11. Known Anti-patterns (quick-scan)
- ❌ Reading canvas/window state inside render — render must be pure.
- ❌ Renaming synced state/map keys post-publish.
- ❌ Assuming new default-object fields backfill existing instances.
- ❌ `onClick` on the full outer bounds with zero selection margin.
- ❌ Duplicating on-canvas actions in `usePropertyMenu`.
- ❌ One `useSyncedState` object for multi-user concurrent data.
- ❌ `useStickable`/`useStickableHost` in `editorType: ["figma"]` widgets.
- ❌ Both stickable hooks in one component.
- ❌ Expecting `onTextEditEnd` per-keystroke.
- ❌ Omitting `dynamic-page` documentAccess without a real reason to need full traversal.

## 12. Verified-against-official-docs (previously disputed)
Confirmed directly against Figma's official Widget API docs during the Design Sign-off widget build — not obvious from a first pass of the docs, worth trusting:
- **Per-corner `cornerRadius`** on AutoLayout/Frame/Rectangle IS supported (not just uniform).
- **`Input.placeholderProps`** IS supported for styling placeholder text.
- **`AutoLayout` absolute positioning** (child positioned outside normal flow) IS supported.
- **Gradient fills** ARE supported as a fill type (typed, not just solid/image) — just often unnecessary if design tokens are solid-only.

## 13. Lessons from our builds

**Design Sign-off widget** (role-based checklist/sign-off tracker):
- Migrated row data from a single `useSyncedState<SignoffRow[]>` array to `useSyncedMap` per Figma's own multiplayer-merge recommendation — array-in-state clobbers concurrent edits (§2 anti-pattern), map merges per-key.
- Moved a custom mode-switch dropdown (Binary/Multi-state) out of custom-rendered UI and into `usePropertyMenu`'s native `dropdown` item type — matches Figma's real native selection toolbar (gear/moon/color/lock/mode) instead of faking it.
- Native widget toolbar chrome (gear, moon, color dot, lock icon) is **built-in Figma chrome**, not something a widget renders itself — only custom `usePropertyMenu` items are yours to control.
- Distinct `useSyncedMap` key names per data type (don't reuse a generic key like `'rows'`) — avoids collisions across widget versions/variants.
- No Figma "theme API" for widgets — dark/light must be hardcoded per design intent (confirms §4).
- Settings iframe (`showUI`) restyled to match dark theme explicitly, since iframe doesn't inherit widget canvas styling automatically.

**Figma Timeline Estimator** (date-range planning widget, pivoted from plugin):
- Moved from Plugin → Widget specifically to get **live in-canvas editing** — plugins can't persist an editable on-canvas UI the way widgets can via synced state + AutoLayout.
- Drag-and-drop column reordering implemented with one column intentionally locked (first column) — good pattern for "anchor" columns in tabular widget UIs.
- Revision history (hover tooltip with "(revised)" suffix) built by storing prior values in synced state rather than relying on Figma's undo stack — needed persistent, visible history, not just undo/redo.
