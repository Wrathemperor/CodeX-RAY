# CodeX-RAY Workspace Prompt

This VS Code extension asks whether to scan the opened workspace with CodeX-RAY. Choosing **Open CodeX-RAY** runs the published npm CLI through `npx`, scans that folder locally, and opens the dashboard in your browser.

Install the extension from the VS Code Marketplace after it is published. To package it locally, run these commands from this directory:

```bash
npx --yes @vscode/vsce package
code --install-extension code-x-ray-workspace-prompt-1.0.0.vsix
```

You can also press **F5** while this folder is open to launch the VS Code Extension Development Host.

Set `codeXRay.promptOnOpen` to `false` to turn off the prompt. **Don't ask again** stores a user-wide choice; run **CodeX-RAY: Visualize This Workspace** to launch it manually.
