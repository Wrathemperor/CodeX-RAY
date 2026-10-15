import asyncio
import os
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.scanner import CodebaseScanner
from backend.resolver import ImportResolver
from backend.parser import CodeParser
from backend.graph_engine import GraphEngine
from backend.analyzer import ArchitectureAnalyzer
from backend.ai_service import AIService
from backend.history import save_scan, list_scans, load_scan, delete_scan

app = FastAPI(title="CodeX-RAY API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR      = Path(__file__).resolve().parent.parent
SAMPLES_DIR   = BASE_DIR / "backend" / "samples"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

active_jobs: Dict[str, Dict] = {}
scan_cache:  Dict[str, Dict] = {}
INITIAL_PROJECT = os.environ.get("CODEXRAY_INITIAL_PROJECT")
if INITIAL_PROJECT:
    INITIAL_PROJECT = str(Path(INITIAL_PROJECT).expanduser().resolve())

current_state = {
    "active_path": INITIAL_PROJECT or str(SAMPLES_DIR / "python_service"),
    "graph_data":  None,
    "analysis":    None
}


class ScanRequest(BaseModel):
    path:      Optional[str] = None
    sample_id: Optional[str] = None
    force:     bool = False


class FileInsightRequest(BaseModel):
    file_id: str


def run_scan_pipeline(job_id: str, target_path: str):
    try:
        if job_id not in active_jobs:
            active_jobs[job_id] = {
                "job_id": job_id, "status": "queued", "progress": 5,
                "message": "Initializing...", "target_path": str(target_path)
            }
        active_jobs[job_id]["status"]   = "scanning"
        active_jobs[job_id]["message"]  = "Scanning directory structure..."
        active_jobs[job_id]["progress"] = 15

        target_dir = Path(target_path).resolve()
        if not target_dir.exists() or not target_dir.is_dir():
            raise ValueError(f"Directory not found: {target_path}")

        scanner = CodebaseScanner(str(target_dir))
        files   = scanner.scan_files()
        active_jobs[job_id]["progress"] = 35
        active_jobs[job_id]["message"]  = f"Indexed {len(files)} source files. Parsing AST..."

        parser      = CodeParser()
        parsed_data = {}
        for idx, f in enumerate(files):
            parsed_data[f["id"]] = parser.parse_file(f["abs_path"], f["rel_path"], f["extension"])
            if idx % max(1, len(files) // 5) == 0:
                active_jobs[job_id]["progress"] = 35 + int((idx / len(files)) * 30)

        active_jobs[job_id]["progress"] = 70
        active_jobs[job_id]["message"]  = "Resolving imports and calculating topology..."
        known_files  = {f["id"] for f in files}
        resolver     = ImportResolver(str(target_dir), known_files)
        graph_engine = GraphEngine()
        graph_data   = graph_engine.build_graph(files, parsed_data, resolver)

        active_jobs[job_id]["progress"] = 85
        active_jobs[job_id]["message"]  = "Evaluating architecture health and cycles..."
        analyzer   = ArchitectureAnalyzer()
        analysis   = analyzer.analyze(graph_data)

        ai_service  = AIService()
        ai_summary  = ai_service.generate_architecture_summary(analysis, graph_data)

        result = {
            "root_path":   str(target_dir),
            "graph":       graph_data,
            "analysis":    analysis,
            "ai_summary":  ai_summary,
            "parsed_data": parsed_data,
        }

        scan_cache[str(target_dir)]         = result
        current_state["active_path"]        = str(target_dir)
        current_state["graph_data"]         = graph_data
        current_state["analysis"]           = analysis

        # ── Persist to history ──
        try:
            repo_name = target_dir.name or str(target_dir)
            save_scan(
                path=str(target_dir),
                name=repo_name,
                health_score=analysis.get("health_score", 0),
                grade=analysis.get("grade", "?"),
                file_count=graph_data.get("stats", {}).get("total_files", len(files)),
                result=result,
            )
        except Exception:
            pass  # history is non-blocking

        active_jobs[job_id]["status"]   = "completed"
        active_jobs[job_id]["progress"] = 100
        active_jobs[job_id]["message"]  = "Scan complete!"
        active_jobs[job_id]["result"]   = {
            "root_path":    str(target_dir),
            "stats":        graph_data["stats"],
            "health_score": analysis["health_score"],
            "grade":        analysis["grade"],
        }

    except Exception as e:
        active_jobs[job_id]["status"]   = "failed"
        active_jobs[job_id]["progress"] = 0
        active_jobs[job_id]["error"]    = str(e)
        active_jobs[job_id]["message"]  = f"Scan failed: {str(e)}"


# Pre-warm default sample on startup
try:
    run_scan_pipeline("startup", current_state["active_path"])
except Exception:
    pass


# ──────────────────────────── Samples ────────────────────────────

@app.get("/api/config")
def get_config():
    """Expose the selected project so CLI launches open the right workspace."""
    return {"initial_path": INITIAL_PROJECT}

@app.get("/api/samples")
def get_samples():
    return [
        {"id": "python_service",  "name": "Python Microservice",
         "description": "Multi-module backend with intentional circular import & orphan modules",
         "path": str(SAMPLES_DIR / "python_service"), "tech": "Python, AST"},
        {"id": "react_ecommerce", "name": "React E-Commerce",
         "description": "Modular TypeScript/React app using @/* path aliases and domain services",
         "path": str(SAMPLES_DIR / "react_ecommerce"), "tech": "TypeScript, React, Aliases"},
        {"id": "self",            "name": "CodeX-RAY (Self)",
         "description": "Scan this CodeX-RAY repository itself to visualise our own architecture",
         "path": str(BASE_DIR), "tech": "FastAPI, React, Canvas"},
    ]


# ──────────────────────────── Validate Path ──────────────────────

@app.get("/api/validate-path")
def validate_path(path: str = Query(...)):
    """Feature 2: Live path validation for the Scan Repo modal."""
    try:
        p = Path(path).resolve()
        if not p.exists():
            return {"valid": False, "exists": False, "message": "Path does not exist"}
        if not p.is_dir():
            return {"valid": False, "exists": True, "message": "Path is a file, not a directory"}
        # Quick estimate: count files (not full scan)
        exts = {'.py', '.js', '.ts', '.jsx', '.tsx', '.mjs'}
        count = sum(1 for f in p.rglob('*') if f.suffix in exts and '.git' not in f.parts
                    and 'node_modules' not in f.parts and '__pycache__' not in f.parts)
        return {"valid": True, "exists": True, "file_count_estimate": count,
                "message": f"Found ~{count} source files"}
    except Exception as e:
        return {"valid": False, "exists": False, "message": str(e)}


# ──────────────────────────── Scan ───────────────────────────────

@app.post("/api/scan")
def trigger_scan(req: ScanRequest, background_tasks: BackgroundTasks):
    target_path = req.path
    if req.sample_id:
        sample_map = {
            "python_service":  str(SAMPLES_DIR / "python_service"),
            "react_ecommerce": str(SAMPLES_DIR / "react_ecommerce"),
            "self":            str(BASE_DIR),
        }
        if req.sample_id not in sample_map:
            raise HTTPException(status_code=400, detail="Invalid sample_id")
        target_path = sample_map[req.sample_id]

    if not target_path:
        target_path = current_state["active_path"]

    normalized = str(Path(target_path).resolve())

    if not req.force and normalized in scan_cache:
        cached = scan_cache[normalized]
        current_state["active_path"] = normalized
        current_state["graph_data"]  = cached["graph"]
        current_state["analysis"]    = cached["analysis"]
        return {"job_id": "cached", "status": "completed", "progress": 100,
                "message": "Loaded from cache", "from_cache": True}

    job_id = str(uuid.uuid4())
    active_jobs[job_id] = {
        "job_id": job_id, "status": "queued", "progress": 5,
        "message": "Initializing scan...", "target_path": normalized,
        "created_at": time.time(),
    }
    background_tasks.add_task(run_scan_pipeline, job_id, normalized)
    return {"job_id": job_id, "status": "queued", "progress": 5, "message": "Scan job started"}


@app.get("/api/scan/status/{job_id}")
def get_scan_status(job_id: str):
    if job_id == "cached":
        return {"status": "completed", "progress": 100, "message": "Cached"}
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ──────────────────────────── Graph / Health / AI ────────────────

@app.get("/api/graph")
def get_graph():
    active_path = current_state["active_path"]
    if active_path in scan_cache:
        return scan_cache[active_path]["graph"]
    run_scan_pipeline("init", active_path)
    if active_path in scan_cache:
        return scan_cache[active_path]["graph"]
    raise HTTPException(status_code=404, detail="No graph data. Please trigger a scan first.")


@app.get("/api/health")
def get_health():
    active_path = current_state["active_path"]
    if active_path in scan_cache:
        return scan_cache[active_path]["analysis"]
    raise HTTPException(status_code=404, detail="No analysis available")


@app.get("/api/ai/insights")
def get_ai_insights():
    active_path = current_state["active_path"]
    if active_path in scan_cache:
        return scan_cache[active_path]["ai_summary"]
    raise HTTPException(status_code=404, detail="No insights available")


@app.post("/api/ai/file-insight")
def get_file_insight(req: FileInsightRequest):
    active_path = current_state["active_path"]
    cached = scan_cache.get(active_path)
    if not cached:
        raise HTTPException(status_code=404, detail="Repository not scanned")

    nodes = cached["graph"]["nodes"]
    node  = next((n for n in nodes if n["id"] == req.file_id), None)
    if not node:
        raise HTTPException(status_code=404, detail="File node not found")

    links      = cached["graph"]["links"]
    dependents = [
        l["source"] if isinstance(l["source"], str) else l["source"]["id"]
        for l in links
        if (l["target"] if isinstance(l["target"], str) else l["target"]["id"]) == req.file_id
    ]
    dependencies = [
        l["target"] if isinstance(l["target"], str) else l["target"]["id"]
        for l in links
        if (l["source"] if isinstance(l["source"], str) else l["source"]["id"]) == req.file_id
    ]

    ai_service = AIService()
    return ai_service.generate_file_insight(node, dependents, dependencies, node.get("in_cycle", False))


@app.get("/api/file")
def get_file_content(path: str = Query(...)):
    active_path = current_state["active_path"]
    root        = Path(active_path).resolve()
    full_path   = (root / path).resolve()

    if not str(full_path).startswith(str(root)):
        raise HTTPException(status_code=403, detail="Path traversal forbidden")
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    cached      = scan_cache.get(active_path, {})
    parsed_meta = cached.get("parsed_data", {}).get(path, {})

    return {"id": path, "name": full_path.name, "content": content,
            "loc": len(content.splitlines()), "meta": parsed_meta}


# ──────────────────────────── History ────────────────────────────

@app.get("/api/history")
def get_history():
    """Return the 20 most-recent scan records (no full result blob)."""
    return list_scans(limit=20)


@app.get("/api/history/{scan_id}")
def get_history_scan(scan_id: int):
    """Load a historical scan into current_state (no re-scanning required)."""
    record = load_scan(scan_id)
    if not record:
        raise HTTPException(status_code=404, detail="History record not found")

    result = record["result"]
    path   = record["path"]

    # Restore into in-memory caches
    scan_cache[path]               = result
    current_state["active_path"]   = path
    current_state["graph_data"]    = result.get("graph")
    current_state["analysis"]      = result.get("analysis")

    return {
        "status":       "restored",
        "path":         path,
        "name":         record["name"],
        "health_score": record["health_score"],
        "grade":        record["grade"],
        "scanned_at":   record["scanned_at"],
    }


@app.delete("/api/history/{scan_id}")
def remove_history_scan(scan_id: int):
    if not delete_scan(scan_id):
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": True}


# ──────────────────────────── Static Frontend ────────────────────

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host="127.0.0.1", port=8000, reload=True)
