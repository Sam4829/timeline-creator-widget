# Project Memory

## Overview
This repository contains the **Timeline Estimator**, a dual-component project for Figma:
1. **Figma Plugin** (`plugin/`): A tool for statically generating Auto Layout tables in standard Figma design files.
2. **FigJam Widget** (`timeline-estimator-widget/`): An interactive timeline widget designed for real-time collaboration on the FigJam canvas.

## Current State
- **Repository Restructuring**: Original plugin files moved into `plugin/` directory while keeping `timeline-estimator-widget/` clean and untouched at root.
- **Implementation Plan Created**: `IMPLEMENTATION_PLAN.md` drafted for the widget's upcoming Plan tab feature & tab reordering (Templates → Roster → Structure → Plan).
- **Remote Repo**: Linked to `https://github.com/Sam4829/timeline-creator-widget.git` (main branch).

## Active Context & Next Steps
- [x] Restructure root directory into `plugin/` and `timeline-estimator-widget/`.
- [x] Brainstorm and finalize `IMPLEMENTATION_PLAN.md` for widget improvements.
- [ ] Review implementation plan open questions with user.
- [ ] Implement tab reordering: Templates → Roster → Structure → Plan.
- [ ] Implement Plan tab for duration-based date calculation (0.5+ day support, sequential date calculations).
