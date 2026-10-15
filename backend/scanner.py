import os
from pathlib import Path
from typing import Dict, List, Optional, Set
import pathspec

DEFAULT_IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    ".env", "dist", "build", "out", ".next", ".nuxt", ".turbo",
    ".cache", ".codeatlas", ".idea", ".vscode", "coverage",
    ".pytest_cache", ".mypy_cache", "target", "bin", "obj", ".svn"
}

SUPPORTED_EXTENSIONS = {
    ".py", ".pyw",
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".json", ".vue", ".svelte"
}

class CodebaseScanner:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        self.gitignore_spec = self._load_gitignore()

    def _load_gitignore(self) -> Optional[pathspec.PathSpec]:
        gitignore_path = self.root_dir / ".gitignore"
        patterns: List[str] = []
        if gitignore_path.exists():
            try:
                with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
                    patterns.extend(f.readlines())
            except Exception:
                pass
        
        # Always add standard vendor patterns to pathspec
        for d in DEFAULT_IGNORE_DIRS:
            patterns.append(f"{d}/")
            patterns.append(f"**/{d}/**")

        return pathspec.PathSpec.from_lines("gitwildmatch", patterns)

    def is_ignored(self, rel_path: str, is_dir: bool = False) -> bool:
        parts = Path(rel_path).parts
        for part in parts:
            if part in DEFAULT_IGNORE_DIRS:
                return True
        if self.gitignore_spec:
            test_path = f"{rel_path}/" if is_dir else rel_path
            return self.gitignore_spec.match_file(test_path)
        return False

    def scan_files(self) -> List[Dict]:
        """
        Recursively scans the directory and returns a list of indexed file entries.
        """
        file_entries = []
        if not self.root_dir.exists() or not self.root_dir.is_dir():
            return []

        for root, dirs, files in os.walk(self.root_dir):
            rel_dir = os.path.relpath(root, self.root_dir)
            if rel_dir == ".":
                rel_dir = ""

            # Prune ignored directories in-place to avoid traversing them
            dirs[:] = [
                d for d in dirs
                if d not in DEFAULT_IGNORE_DIRS
                and not self.is_ignored(os.path.normpath(os.path.join(rel_dir, d)).replace("\\", "/"), is_dir=True)
            ]

            for file in files:
                ext = Path(file).suffix.lower()
                if ext not in SUPPORTED_EXTENSIONS:
                    continue

                full_path = Path(root) / file
                rel_path = os.path.relpath(full_path, self.root_dir).replace("\\", "/")

                if self.is_ignored(rel_path):
                    continue

                try:
                    stat = full_path.stat()
                    file_entries.append({
                        "id": rel_path,
                        "name": file,
                        "rel_path": rel_path,
                        "abs_path": str(full_path),
                        "directory": os.path.dirname(rel_path).replace("\\", "/"),
                        "extension": ext,
                        "size": stat.st_size,
                        "mtime": stat.st_mtime
                    })
                except Exception:
                    continue

        return file_entries
