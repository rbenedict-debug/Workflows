# Setup Project

Walk the user through first-time project setup. Be friendly and plain — assume they are not a developer.

## Steps

### 1. Check Node.js

Run: `node --version`

- If the command succeeds and shows v18 or higher: continue to step 2.
- If it shows a version below v18: tell the user they need to update Node.js.
  - Mac: "Open Terminal and run: `brew install node`" (if Homebrew is installed) or direct them to nodejs.org to download the latest LTS version.
  - Windows: "Go to nodejs.org, download the LTS installer, and run it."
  - After they install, ask them to re-run `/setup-project`.
- If the command fails (node not found): same instructions as above.

### 2. Check npm

Run: `npm --version`

- If it succeeds: continue.
- If it fails: tell the user npm comes with Node.js and they should reinstall Node from nodejs.org.

### 3. Run npm install

Run: `npm install`

- If it succeeds: continue to step 4.
- If it fails: show the error output and tell the user to share it with Rebecca.

### 4. Confirm DS version

Run: `node -e "console.log(require('./node_modules/@onflo/design-system/package.json').version)"`

Tell the user: "Setup complete! You're running Onflo Design System v[version]."

### 5. Ready message

Tell the user:

> "You're all set. To get started, just tell me what you're building — describe the feature or page
> and I'll start putting it together using Onflo components."

Also remind them: open `node_modules/@onflo/design-system/preview/index.html` in their browser
to see a visual catalog of all available components.
