# Update Design System

Check for a newer version of the Onflo Design System and update if one is available.

## Steps

### 1. Get the installed version

Run: `node -e "console.log(require('./node_modules/@onflo/design-system/package.json').version)"`

Save this as the current version.

### 2. Get the latest released version

Run: `gh release view --repo rbenedict-debug/Design-System --json tagName --jq '.tagName'`

This returns the latest tag (e.g. `v0.2.4`). Strip the leading `v` to get the version number.

- If the `gh` command fails (GitHub CLI not installed): tell the user to check
  [github.com/rbenedict-debug/Design-System/tags](https://github.com/rbenedict-debug/Design-System/tags)
  manually for the latest tag, then run `/update-design-system` again after installing
  the GitHub CLI (`brew install gh` on Mac).

### 3. Compare versions

- If the versions match: tell the user "You're already on the latest version (v[version]). No update needed."
  Stop here.
- If the latest is newer: tell the user "A new version is available: v[latest]. You're currently on v[current]. Updating now..."

### 4. Update package.json

Edit `package.json` — find the `@onflo/design-system` entry under `dependencies` and update the tag:

```json
"@onflo/design-system": "github:rbenedict-debug/Design-System#v[latest]"
```

### 5. Run npm install

Run: `npm install`

- If it succeeds: tell the user "Updated to Onflo Design System v[latest]. Restart Claude Code to pick up the new component definitions."
- If it fails: show the error and tell them to share it with Rebecca.
