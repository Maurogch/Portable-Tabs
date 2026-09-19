# Portable Tabs

Keep your VS Code tabs when you move or rename a project folder.

VS Code normally stores editor state outside the project. This works well until you move or rename the project: VS Code may no longer recognize the workspace as the same one, and your carefully arranged tabs can disappear.

**Portable Tabs** keeps a small state file inside the project itself:

`.vscode/portable-tabs.json`

Because the state travels with the project, your open tabs can be restored even after the project has been moved or renamed.

## How it works

Portable Tabs is designed to stay out of VS Code's way during normal use.

### First use

When you open a project for the first time, Portable Tabs waits for VS Code to finish its normal workspace restoration and records the tabs that are already open.

It does **not** close and reopen those tabs.

### Normal reopen

When you open the project again, VS Code gets the first chance to restore your editors.

If VS Code successfully restores the saved tabs, Portable Tabs does nothing.

This avoids the tab-by-tab closing and reopening that can happen with session extensions.

### After moving or renaming a project

If the project has been moved or renamed and VS Code can no longer restore its previous editor state, Portable Tabs restores the saved tabs from the project-local state file.

The result is that your tabs effectively travel with the project.

## What is saved

- Open text-file tabs
- Tab order
- Editor groups / split layout
- Pinned tabs
- Preview state
- Active tab
- Active cursor position and selection

File paths are stored relative to the workspace, so the saved state does not depend on the project's absolute location.

## When the state is saved

Portable Tabs intentionally does **not** write to disk on every cursor movement.

The state is saved when:

- Tabs change
- Editor groups change
- The active editor changes
- A document is saved
- You explicitly use **Portable Tabs: Save Now**
- VS Code is shutting down

The shutdown save captures the final active file and cursor/selection position.

A short debounce is used for normal automatic saves so several quick editor changes do not cause a write for every individual event.

## What is not saved

Portable Tabs currently ignores special editor types such as:

- Untitled files
- Image previews
- Other non-text editors

Only ordinary files belonging to the workspace are persisted.

## Commands

Two commands are available from the Command Palette:

- **Portable Tabs: Save Now**
- **Portable Tabs: Restore Now**

Normally, you should not need to use either command manually.

## State file

The state is stored at:

```text
.vscode/portable-tabs.json
```

The file is intentionally kept inside the workspace so it can move together with the project.

You can inspect or delete it manually if needed.

## Installation

Install Portable Tabs from the VS Code Marketplace.

For development or local installation:

```bash
npm install -g @vscode/vsce
vsce package
```

Then install the generated `.vsix` through **Extensions → ... → Install from VSIX...**

## Limitations

Portable Tabs is intended for preserving normal text editor tabs when a workspace changes location.

It does not attempt to replace VS Code's complete workspace/session state. Terminals, debug sessions, webviews, and other VS Code UI state are handled separately by VS Code.

## Why not just use a session extension?

There are several extensions that let you manually save and restore editor sessions.

Portable Tabs has a narrower goal:

> **Make editor tabs portable without requiring you to manage sessions.**

There is no session to name, save, remember, or manually restore. VS Code continues to handle normal workspace restoration, while Portable Tabs acts as a fallback when the workspace's location has changed.

## License

MIT
