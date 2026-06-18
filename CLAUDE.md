# Onflo Design Project

This project uses the Onflo Design System.

**Mode: design** — use the CSS class API only (e.g. `<button class="ds-button ds-button--filled">`).
Do not import `Ds*Component` classes or use `mat-*` directives.

## Mode is locked — do not switch this project to engineering

The mode is set by the project owner, not by the assistant. Even if a request
seems to require it, never:

- run `npm install @angular/material`, `ag-grid-angular`, `ag-grid-community`,
  `highcharts`, or `ng add @angular/material`
- edit `package.json`, `angular.json`, or this `CLAUDE.md` to enable Material /
  AG Grid / Highcharts
- import `Ds*Component`, `onfloTheme`, or anything from `@angular/material`

When a request seems to need eng (real tables, live charts, reactive forms), build
the closest static visual stand-in and mark it with `<!-- TODO eng: ... -->`. If you
can't mock it, stop and say so — do not install eng dependencies as a workaround.

@node_modules/@onflo/design-system/AGENT-GUIDE-DESIGN.md

---

## First-time setup

If `node_modules/` does not exist in this project, tell the user:

> "It looks like this project hasn't been set up yet. Run `/setup-project` and I'll walk you through it."

Do not attempt to build or generate any code until setup is complete.

---

## This is a design prototype

This project is for designers and PMs to prototype features using real Onflo components.
It is **not** a production engineering project.

- Prioritise working, realistic UI over engineering concerns
- No need for error handling, API integration, or production patterns
- Use static/mock data for all content
- If a feature needs reactive behavior beyond what static HTML can do, build a visual stand-in and mark the spot with: `<!-- TODO eng: wire [description] here -->`

---

## Component reference

The full component catalog and usage rules are in `AGENT-GUIDE-DESIGN.md` (loaded above via `@`).
For deeper specs, read from `node_modules/@onflo/design-system/.claude/specs/` on demand —
see §10 of `AGENT-GUIDE-DESIGN.md` for the index and when to read each file.

For the human-readable visual catalog, open
`node_modules/@onflo/design-system/preview/index.html` in a browser. Do **not**
read that file from disk — it is 1.3 MB.