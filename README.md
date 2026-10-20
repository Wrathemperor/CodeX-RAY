# CodeX-RAY

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![D3.js](https://img.shields.io/badge/D3.js-v7-F9A03C.svg)](https://d3js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

CodeX-RAY parses Python, JavaScript, and TypeScript codebases to visualize dependencies, flag circular imports, compute blast radius, and calculate architecture health scores.

---

## Features

### Graph Engine
* **Canvas rendering**: Draws nodes, directed arrows, and cycles on an HTML5 canvas without SVG DOM slowdowns.
* **Spatial indexing**: Uses `d3-quadtree` for instant hover lookups and selection during physics simulations.
* **Directory clustering**: Draws 2D convex polygons around files sharing a directory.

### AST Parsing & Import Resolution
* **JS/TS**: Resolves extension-less imports, `index.ts`/`index.js` directory imports, and `tsconfig.json` path aliases (`@/*`).
* **Python**: Uses Python's native `ast` module to resolve internal modules and relative imports (`from .database import get_session`).
* **Gitignore**: Respects `.gitignore` rules via `pathspec`, ignoring `node_modules`, `venv`, `.git`, and build outputs.

### Analysis & Metrics
* **Cycle detection**: Tarjan's Strongly Connected Components algorithm finds circular import loops.
* **Health score (0–100, grades A–F)**: Scores maintainability based on cycle count, hub coupling, and dead code.
* **God module detection**: Flags files exceeding in-degree and out-degree thresholds.
* **Orphan tracking**: Lists files with zero incoming and zero outgoing imports.
* **Blast radius analysis**: Right-click any file node to trace affected downstream dependencies.

---

## Quick Start

### Run from Source

#### Prerequisites
* Python 3.10+
* Node.js 18+ (needed only if modifying frontend code)

#### Launch
```bash
python run.py
```
This installs dependencies, starts the FastAPI server, and opens `http://localhost:8000`.

### Run via npm CLI
```bash
npx --yes code-x-ray .
```

### Auto-launch with VS Code Extension

To run CodeX-RAY automatically whenever a project folder opens in VS Code:

1. Package the extension:
   ```bash
   npx --yes @vscode/vsce package --cwd vscode-extension
   ```
2. Install the generated `.vsix` file:
   ```bash
   code --install-extension vscode-extension/code-x-ray-workspace-prompt-1.0.0.vsix
   ```
3. To enable instant launch without prompting, add this to your VS Code `settings.json`:
   ```json
   {
     "codeXRay.autoStart": true
   }
   ```
   When set to `true`, CodeX-RAY launches in the background and opens the dashboard when any workspace opens. Leave as `false` (default) to show an interactive prompt instead.

---

## Development

Run backend and frontend servers with hot reload:

### Backend
```bash
pip install -r requirements.txt
python -m uvicorn backend.server:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## Project Structure

```
CodeX-RAY/
├── backend/
│   ├── scanner.py          # File discovery and .gitignore filtering
│   ├── resolver.py         # TS alias and Python import resolution
│   ├── parser.py           # AST symbol and import extraction
│   ├── graph_engine.py     # Graph builder, Tarjan SCC cycle detection
│   ├── analyzer.py         # Health scores, god modules, orphans
│   ├── ai_service.py       # Architecture summary and file audits
│   ├── server.py           # FastAPI server and REST endpoints
│   └── samples/            # Test repositories
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CanvasGraph.jsx         # Canvas renderer with coordinate HUD
│   │   │   ├── Header.jsx              # Controls, search, view modes
│   │   │   ├── HealthDrawer.jsx        # Health metrics and cycle inspector
│   │   │   ├── CodeInspectorDrawer.jsx # Symbol inspector and code viewer
│   │   │   ├── ScanRepoModal.jsx       # Path input and folder picker
│   │   │   └── AuthModal.jsx           # Email/password authentication modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx         # Firebase auth and role management
│   │   ├── App.jsx                     # Top-level state coordinator
│   │   └── index.css                   # Blueprint theme and drafting grid
│   └── dist/                           # Compiled production static bundle
├── tests/
│   └── test_backend.py     # Unit tests for scanner, resolver, and graph engine
├── run.py                  # Single-command launcher
├── requirements.txt        # Python dependencies
└── README.md
```

---

## REST API

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/samples` | `GET` | List available demo repositories |
| `/api/config` | `GET` | Return CLI workspace path |
| `/api/browse-directory` | `POST` | Open native OS folder picker dialog |
| `/api/validate-path` | `GET` | Check directory existence and estimate source file count |
| `/api/scan` | `POST` | Start repository scan |
| `/api/scan/status/{job_id}` | `GET` | Check scan progress |
| `/api/graph` | `GET` | Get node and link graph data |
| `/api/health` | `GET` | Get maintainability score and issue breakdown |
| `/api/ai/insights` | `GET` | Get architectural findings and refactoring suggestions |
| `/api/ai/file-insight` | `POST` | Audit a specific file node |
| `/api/file?path={path}` | `GET` | Fetch source code content |

---

## Authentication & Firebase Setup

CodeX-RAY supports optional user accounts via Firebase Authentication (email/password) and Firestore.

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Under **Build > Authentication > Sign-in method**, enable **Email/Password**.
3. Under **Build > Firestore Database**, create a database.
4. Go to **Project Settings > General > Your apps**, register a Web app, and copy the credentials.
5. Create `frontend/.env.local` using `frontend/.env.example`:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
6. Add your keys:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_ADMIN_EMAILS=your_email@example.com
   ```
7. Rebuild frontend assets:
   ```bash
   cd frontend && npm run build
   ```

---

## Testing

```bash
python -m pytest tests/
```

---

## License

Released under the [MIT License](LICENSE).
