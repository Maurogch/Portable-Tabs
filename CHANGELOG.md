# Changelog

## 0.1.0

- Initial public release.
- Stores portable editor state inside the workspace.
- Preserves editor groups and tab order.
- Preserves pinned and preview state.
- Preserves the active editor and cursor/selection position.
- Saves the final editor state when VS Code shuts down.
- Restores editor state when a project has been moved or renamed.
- Avoids restoring tabs when VS Code has already restored them.
