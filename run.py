#!/usr/bin/env python3
"""
Code Atlas — Architectural Intelligence Platform
Single-command launcher to run both backend API and static frontend UI.
"""
import argparse
import os
import subprocess
import sys
import webbrowser
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

def check_dependencies():
    required = ["fastapi", "uvicorn", "pathspec", "pydantic"]
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if missing:
        print(f"⚠️ Missing Python dependencies: {', '.join(missing)}")
        print("Installing from requirements.txt...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(PROJECT_ROOT / "requirements.txt")])

def ensure_frontend_built():
    if not FRONTEND_DIST.exists():
        print("📦 Frontend production bundle not found in frontend/dist.")
        print("Building frontend with npm...")
        subprocess.check_call(["npm", "run", "build"], cwd=str(PROJECT_ROOT / "frontend"), shell=True)

def main():
    parser = argparse.ArgumentParser(description="Launch Code Atlas Architectural Visualizer")
    parser.add_argument("--port", type=int, default=8000, help="Port to serve on (default: 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    parser.add_argument("--dev", action="store_true", help="Run with hot reloading enabled")
    args = parser.parse_args()

    check_dependencies()
    ensure_frontend_built()

    url = f"http://{args.host}:{args.port}"
    print("\n" + "=" * 60)
    print("🔬 CODEX-RAY — ARCHITECTURAL X-RAY INTELLIGENCE")
    print("=" * 60)
    print(f"🌐 Server running at: {url}")
    print(f"📁 Backend API:        {url}/docs")
    print(f"💻 Press Ctrl+C to terminate.")
    print("=" * 60 + "\n")

    if not args.no_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    import uvicorn
    uvicorn.run("backend.server:app", host=args.host, port=args.port, reload=args.dev)

if __name__ == "__main__":
    main()
