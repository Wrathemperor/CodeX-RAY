# CodeX-RAY — Interactive Architectural Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![D3.js](https://img.shields.io/badge/D3.js-v7-F9A03C.svg)](https://d3js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**CodeX-RAY** is an architectural intelligence and codebase visualization platform that helps engineering teams understand dependency topology, circular loops, structural coupling, and overall architectural health.

---

## ⚡ Key Technical Innovations

### 1. Canvas-Based Force Engine (Zero SVG DOM Bottleneck)
* **HTML5 Canvas Rendering**: Eliminates DOM overhead by drawing thousands of nodes, directed dependency arrows, and glowing cycle halos on a hardware-accelerated canvas.
* **Spatial Quadtree Indexing (`d3-quadtree`)**: Fast $O(\log n)$ spatial lookups for hover detection, tooltips, and node click selection even under heavy physics simulations.
* **Convex Clustering Hulls**: Dynamically computes 2D convex polygons enveloping modules in the same directory using smooth alpha-padded overlays.

### 2. Polyglot AST Parsing & Resilient Import Resolution
* **JavaScript / TypeScript**: Resolves extension-less imports (`./utils`), directory indexing (`/index.ts`, `/index.js`), and `tsconfig.json` path aliases (e.g. `@/*` mapped to `src/*`).
* **Python**: Parses syntax trees using Python's native `ast` module; differentiates third-party packages from project modules, and normalizes explicit relative imports (`from .database import get_session`).
* **`.gitignore` Integration**: Scans repository roots using Git spec compliance (`pathspec`) while ignoring `node_modules`, `venv`, `__pycache__`, `.git`, and build output directories.

### 3. Topological Graph Theory & Cycle Isolation
* **Tarjan's Strongly Connected Components (SCC)**: Deterministically detects cycles and recursive import loops with $O(V + E)$ complexity.
* **Cycle Highlighting & Pulsing**: One-click cycle mode highlights circular dependencies in glowing crimson and dims unrelated nodes.
* **Hierarchical Macro Compound View**: Summarizes file-level graphs into directory-level aggregated nodes with weighted inter-package edges.
* **Named Symbol Links**: Turn on **Functions** in the dashboard to label dependency lines with imported exported functions, classes, and components when they can be resolved statically.

### 4. Architectural Health Score & God Module Detection
* **Maintainability Index (0–100 & Letter Grades A–F)**: Calculates an overall architecture health score with penalty deductions for circular imports, excessive hub coupling, and dead code.
* **God Module Identification**: Flags files exceeding safe in-degree + out-degree thresholds that represent fragile architectural bottlenecks.
* **Orphan / Dead Code Tracking**: Identifies completely disconnected files (0 incoming, 0 outgoing imports).

### 5. Token-Budgeted AI Architectural Intelligence
* **Structured Executive Insights**: Synthesizes graph topology, cycles, and coupling hubs into high-density actionable findings and a refactoring roadmap.
* **On-Demand File Audits**: Delivers architectural impact evaluations (blast radius, dependency role, decoupling advice) on individual clicked files.

---

## 🚀 Quick Start

### Use from npm

After publishing this package to npm as `code-x-ray`, install the command-line launcher globally to scan a project and open its graph and architecture health dashboard in your browser:

```bash
npm install --global code-x-ray
cd path/to/your-project
code-x-ray .
```

Or run it once without a global install:

```bash
npx --yes code-x-ray .
```

The CLI asks before scanning, binds the dashboard to `127.0.0.1`, and keeps the server running until you press **Ctrl+C**. It needs Node.js 18+ and Python 3.10+; the first run creates an isolated Python environment in your user cache and installs the backend requirements there.

To run the launcher from this checkout before publishing, use `node bin/code-x-ray.cjs .`.

### Prompt when a VS Code project opens

npm and npx commands run when invoked; they cannot detect projects opened later in an editor. For the project-open prompt, install the **CodeX-RAY Workspace Prompt** VS Code extension as well. When published, it will prompt for each workspace and run the npm CLI after you choose **Open CodeX-RAY**. Set `codeXRay.promptOnOpen` to `false`, or choose **Don't ask again**, to disable the prompt.

The extension source is in [`vscode-extension/`](vscode-extension/README.md). Until it is published to the Marketplace, run it from the VS Code Extension Development Host or package and install it locally with `@vscode/vsce`.

### Run from source

### Prerequisites
* Python 3.10+
* Node.js 18+ (only needed for frontend development; pre-built production assets are included)

### 1-Command Launch
Clone the repository and run:
```bash
python run.py
```
This automatically verifies dependencies, serves the FastAPI API + React production bundle, and launches your browser to **`http://localhost:8000`**.

---

## 🛠️ Development Mode

If you wish to develop backend and frontend simultaneously with hot-reloading:

### 1. Backend Server
```bash
pip install -r requirements.txt
python -m uvicorn backend.server:app --reload --port 8000
```

### 2. Frontend Server (Vite)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** (Vite proxies API calls to port 8000).

---

## 📂 Project Architecture

```
CodeX-RAY/
├── backend/
│   ├── scanner.py          # .gitignore-aware file discovery & indexing
│   ├── resolver.py         # JS/TS tsconfig alias resolver & Python import resolver
│   ├── parser.py           # AST-based Python & JS/TS symbol & import extractor
│   ├── graph_engine.py     # D3 topology builder, Tarjan SCC cycle detection, compound graphs
│   ├── analyzer.py         # Health score, God modules, orphan detection, modularity ratio
│   ├── ai_service.py       # Structured architectural summary & file audit generator
│   ├── server.py           # FastAPI server with background jobs, polling, & REST endpoints
│   └── samples/            # Bundled test repositories (Python microservice, React e-commerce)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CanvasGraph.jsx         # HTML5 Canvas + d3-force + d3-quadtree renderer
│   │   │   ├── Header.jsx              # Controls, search, view mode toggles, badges
│   │   │   ├── HealthDrawer.jsx        # Architecture health radar & cycle isolation
│   │   │   ├── CodeInspectorDrawer.jsx # Symbol inspector, source code preview, AI audit
│   │   │   └── AIInsightsModal.jsx     # Executive architecture findings & roadmap modal
│   │   ├── App.jsx                     # Top-level state coordinator & HUD stats bar
│   │   └── index.css                   # Tailwind CSS styling, dark glow animations
│   ├── vite.config.js                  # Vite configuration & backend proxy
│   └── dist/                           # Compiled production static bundle
├── tests/
│   └── test_backend.py     # Automated unit test suite (scanner, resolver, graph engine)
├── run.py                  # Single-command launcher script
├── requirements.txt        # Python dependencies
└── README.md
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/samples` | `GET` | List available demo repositories with tech stack metadata |
| `/api/config` | `GET` | Return the project path selected by the CLI launcher, if any |
| `/api/scan` | `POST` | Trigger asynchronous repository scan job (`sample_id` or custom `path`) |
| `/api/scan/status/{job_id}` | `GET` | Poll scan job status, progress percentage, and log messages |
| `/api/graph` | `GET` | Retrieve complete node/link graph topology, cycles, and directory compound graph |
| `/api/health` | `GET` | Retrieve maintainability health score (0–100), grade, God modules, and orphans |
| `/api/ai/insights` | `GET` | Retrieve structured executive findings, verdict, and refactoring action items |
| `/api/ai/file-insight` | `POST` | Retrieve targeted AI architectural audit for a specific file node |
| `/api/file?path={path}` | `GET` | Fetch source code content and AST metadata for code inspector drawer |

---

## 🧪 Testing

Run the automated backend test suite:
```bash
python tests/test_backend.py
```
* **Scanner Tests**: Validates file inclusion, `.gitignore` filtering, and file indexing.
* **Resolver Tests**: Verifies TS path alias resolution (`@/components/ProductCard`), directory `index.ts` resolution, and Python relative imports.
* **Graph Engine Tests**: Verifies Tarjan SCC cycle detection and bidirectional cycle marking.

---

## 📄 License
Released under the [MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance and [SECURITY.md](SECURITY.md) for vulnerability reporting.
