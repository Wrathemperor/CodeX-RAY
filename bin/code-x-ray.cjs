#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const readline = require('node:readline/promises');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const REQUIREMENTS = path.join(PACKAGE_ROOT, 'requirements.txt');

function parseArgs(argv) {
  const options = { project: process.cwd(), yes: false, browser: true, port: 8000 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--no-browser') options.browser = false;
    else if (arg === '--port') options.port = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else options.project = arg;
  }
  return options;
}

function findPython() {
  const candidates = process.platform === 'win32'
    ? [['py', ['-3']], ['python', []], ['python3', []]]
    : [['python3', []], ['python', []]];
  for (const [command, prefix] of candidates) {
    const probe = spawnSync(command, [...prefix, '--version'], { stdio: 'ignore', windowsHide: true });
    if (probe.status === 0) return { command, prefix };
  }
  throw new Error('Python 3.10 or newer is required. Install Python, then run this command again.');
}

function venvPython(venv) {
  return process.platform === 'win32'
    ? path.join(venv, 'Scripts', 'python.exe')
    : path.join(venv, 'bin', 'python');
}

function preparePython() {
  const python = findPython();
  const cacheRoot = process.env.CODEX_RAY_CACHE
    || (process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || os.homedir(), 'CodeX-RAY', 'runtime')
      : path.join(os.homedir(), '.cache', 'code-x-ray', 'runtime'));
  const venv = path.join(cacheRoot, 'venv');
  const executable = venvPython(venv);
  const marker = path.join(venv, '.code-x-ray-dependencies-installed');

  fs.mkdirSync(cacheRoot, { recursive: true });
  if (!fs.existsSync(executable)) {
    console.log('Creating an isolated Python environment for CodeX-RAY…');
    const created = spawnSync(python.command, [...python.prefix, '-m', 'venv', venv], { stdio: 'inherit', windowsHide: true });
    if (created.status !== 0) throw new Error('Could not create the Python environment. Check that Python includes its venv module.');
  }
  if (!fs.existsSync(marker)) {
    console.log('Installing CodeX-RAY backend dependencies…');
    const installed = spawnSync(executable, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', REQUIREMENTS], { stdio: 'inherit', windowsHide: true });
    if (installed.status !== 0) throw new Error('Python dependency installation failed. Check your network connection and retry.');
    fs.writeFileSync(marker, '1\n');
  }
  return executable;
}

async function chooseToScan(project, yes) {
  if (yes || !process.stdin.isTTY) return true;
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question(`Open CodeX-RAY for ${project}? [Y/n] `);
    return !/^n(o)?$/i.test(answer.trim());
  } finally {
    terminal.close();
  }
}

function availablePort(requested) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(requested, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function openBrowser(url) {
  let command;
  let args;
  if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }
  const opener = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  opener.unref();
}

function waitForServer(url, child, timeoutMs = 60000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (child.exitCode !== null) return reject(new Error('The CodeX-RAY server exited before it was ready.'));
      const req = http.get(`${url}/api/config`, (res) => {
        res.resume();
        if (res.statusCode < 500) return resolve();
        retry();
      });
      req.setTimeout(1000, () => req.destroy());
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) return reject(new Error('Timed out waiting for CodeX-RAY to start.'));
      setTimeout(check, 500);
    };
    check();
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: code-x-ray [project-path] [--yes] [--no-browser] [--port <port>]');
    console.log('Scan a project, start the local dashboard, and open it in your browser.');
    return;
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error('--port must be a number between 0 and 65535.');
  }
  const project = path.resolve(options.project);
  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    throw new Error(`Project folder not found: ${project}`);
  }
  if (!await chooseToScan(project, options.yes)) {
    console.log('Scan skipped.');
    return;
  }

  const python = preparePython();
  const port = await availablePort(options.port);
  const url = `http://127.0.0.1:${port}`;
  const server = spawn(python, ['-m', 'uvicorn', 'backend.server:app', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: PACKAGE_ROOT,
    env: { ...process.env, CODEXRAY_INITIAL_PROJECT: project },
    stdio: 'inherit',
    windowsHide: true
  });

  const stop = () => server.kill('SIGINT');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await waitForServer(url, server);
  console.log(`CodeX-RAY is ready for ${project}\n${url}\nPress Ctrl+C to stop.`);
  if (options.browser) openBrowser(url);
}

main().catch((error) => {
  console.error(`CodeX-RAY: ${error.message}`);
  process.exitCode = 1;
});
