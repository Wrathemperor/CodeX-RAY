'use strict';

const vscode = require('vscode');
const { spawn } = require('node:child_process');

function launchWorkspace(context, folder, output) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  // Use the workspace as cwd; keeping its path out of shell arguments avoids
  // quoting problems on Windows paths that contain spaces or shell metacharacters.
  const args = ['--yes', '--package=code-x-ray', 'code-x-ray', '--yes'];
  const child = spawn(command, args, {
    cwd: folder.uri.fsPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: process.platform === 'win32'
  });
  child.stdout.on('data', chunk => output.append(chunk.toString()));
  child.stderr.on('data', chunk => output.append(chunk.toString()));
  child.on('error', error => {
    vscode.window.showErrorMessage(`CodeX-RAY could not start: ${error.message}`);
    output.show(true);
  });
  child.on('exit', code => {
    if (code && code !== 0) {
      vscode.window.showErrorMessage(`CodeX-RAY exited with code ${code}. See the CodeX-RAY output for details.`);
      output.show(true);
    }
  });
  context.subscriptions.push({ dispose: () => child.kill() });
  output.appendLine(`Starting a CodeX-RAY scan for ${folder.uri.fsPath}`);
}

async function askToVisualize(context, output) {
  const folders = vscode.workspace.workspaceFolders || [];
  if (!folders.length) return;

  const config = vscode.workspace.getConfiguration('codeXRay');
  if (!config.get('promptOnOpen', true) || context.globalState.get('dontAskAgain')) return;

  let folder = folders[0];
  if (folders.length > 1) {
    const selected = await vscode.window.showQuickPick(folders.map(item => ({
      label: item.name,
      description: item.uri.fsPath,
      folder: item
    })), { placeHolder: 'Choose a workspace folder to visualize' });
    if (!selected) return;
    folder = selected.folder;
  }

  const choice = await vscode.window.showInformationMessage(
    `Visualize ${folder.name} with CodeX-RAY? The scan runs locally and opens a browser dashboard.`,
    'Open CodeX-RAY', 'Not now', "Don't ask again"
  );
  if (choice === 'Open CodeX-RAY') launchWorkspace(context, folder, output);
  if (choice === "Don't ask again") await context.globalState.update('dontAskAgain', true);
}

function activate(context) {
  const output = vscode.window.createOutputChannel('CodeX-RAY');
  context.subscriptions.push(output);
  context.subscriptions.push(vscode.commands.registerCommand('codeXRay.openWorkspace', async () => {
    const folders = vscode.workspace.workspaceFolders || [];
    if (folders.length) launchWorkspace(context, folders[0], output);
    else vscode.window.showInformationMessage('Open a project folder first to visualize it with CodeX-RAY.');
  }));
  askToVisualize(context, output);
}

function deactivate() {}

module.exports = { activate, deactivate };
