# Workflows — Onflo Automations Prototype

> ### ▶ Live prototype: **https://rbenedict-debug.github.io/Workflows/**
> Opens straight to the Workflows screen — nothing to install, just open it in a browser.

An interactive design prototype of the **Workflows** feature inside Onflo's **Automations**
settings — the screens where teams build rules that automatically triage and act on incoming
records like tickets, assets, and users (*"when a record matches these conditions, do these
actions"*).

It's built with the real [Onflo Design System](https://github.com/rbenedict-debug/Design-System),
so it looks and behaves like the production product — for stakeholder review and design
feedback ahead of engineering handoff.

---

## What's inside

| Screen | What it shows |
|---|---|
| **Workflows** | The list of automation workflows for a category + trigger — searchable, drag-to-reorder, with per-card actions (enable/disable, duplicate, move, delete) and a "test run" simulation. |
| **Create / Edit workflow** | The builder: name, description, conditions (grouped rules), actions, tags, and expiry — with validation on save. |
| **Execution Logs** | A history of past workflow runs. |
| **Simulation results** | The outcome of testing a workflow against sample records. |

---

## Good to know

- **It's a prototype, not the real product.** All data is mock — there's no backend, login, or
  saving. Anything you change in the prototype (reordering, editing, deleting) lives only in the
  current browser tab and resets on refresh.
- **Built in "design mode"** on the Onflo Design System — real components and styling, no live
  data wiring. Spots that need engineering are marked in the code with `TODO eng:` notes.

---

## Running it locally (optional)

For anyone who wants to run it from source:

```bash
npm install
npm start
```

Then open the URL Angular prints (usually `http://localhost:4200`).

---

## Keeping the live link current

The prototype is published to GitHub Pages by a GitHub Actions workflow
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) on every push to `main` — so the
shared link above always reflects the latest commit. No manual deploy step needed.
