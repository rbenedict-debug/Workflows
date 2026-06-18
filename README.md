# Onflo Project Template

Starter template for Onflo design prototypes. Used by designers and PMs to build
working feature mockups using real Onflo components before engineering handoff.

---

## Getting started

### 1. Create your project from this template

Click **"Use this template"** at the top of this GitHub page and give your project a name.
Then clone your new repo locally.

### 2. Open in Claude Code

Open the project folder in Claude Code. Claude will read the project setup automatically.

If `node_modules/` doesn't exist yet, Claude will ask you to run `/setup-project` — do that first
and it will walk you through everything.

### 3. Start building

Tell Claude what you're building. Example:

> "Build me a page that shows a list of user accounts with a search bar and a way to add new users."

Claude knows all the Onflo components and will build it using the real design system.

---

## Visual reference

Open `node_modules/@onflo/design-system/preview/index.html` in your browser after setup
to see every available component, layout, and token with live demos.

---

## Updating the design system

When Rebecca releases a new DS version, run `/update-design-system` in Claude Code
and it will handle the update automatically.

---

## Handing off to engineering

When the prototype is ready, share this repo with the engineering team. They'll clone it,
switch to engineering mode in the CLAUDE.md, and wire up the real data and behavior.
