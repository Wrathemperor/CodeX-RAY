import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".vue", ".svelte"]
INDEX_FILES = [f"/index{ext}" for ext in JS_EXTENSIONS]

# Python stdlib module set (Python 3.10+ has sys.stdlib_module_names)
try:
    PYTHON_STDLIB = set(sys.stdlib_module_names)
except AttributeError:
    PYTHON_STDLIB = {
        "os", "sys", "re", "json", "math", "datetime", "typing", "collections",
        "itertools", "functools", "pathlib", "subprocess", "hashlib", "shutil",
        "logging", "argparse", "unittest", "time", "random", "io", "copy",
        "abc", "threading", "multiprocessing", "asyncio", "socket", "http",
        "urllib", "email", "sqlite3", "csv", "xml", "html", "inspect", "ast"
    }

class ImportResolver:
    def __init__(self, root_dir: str, known_files: Set[str]):
        self.root_dir = Path(root_dir).resolve()
        self.known_files = known_files  # Normalized relative paths with '/'
        self.ts_aliases = self._load_ts_configs()

    def _load_ts_configs(self) -> Dict[str, Tuple[str, List[str]]]:
        """
        Loads path aliases from tsconfig.json or jsconfig.json.
        Returns mapping: alias_prefix -> (base_dir, [replacement_patterns])
        """
        aliases = {}
        candidate_configs = [
            self.root_dir / "tsconfig.json",
            self.root_dir / "jsconfig.json",
            self.root_dir / "tsconfig.app.json"
        ]

        for config_path in candidate_configs:
            if config_path.exists():
                try:
                    with open(config_path, "r", encoding="utf-8", errors="ignore") as f:
                        # Strip simple comments before JSON parse
                        content = re.sub(r"//.*?\n|/\*.*?\*/", "", f.read(), flags=re.S)
                        data = json.loads(content)
                        compiler_options = data.get("compilerOptions", {})
                        base_url = compiler_options.get("baseUrl", ".")
                        base_dir = (config_path.parent / base_url).resolve()
                        
                        paths = compiler_options.get("paths", {})
                        for pattern, targets in paths.items():
                            aliases[pattern] = (
                                os.path.relpath(base_dir, self.root_dir).replace("\\", "/"),
                                targets
                            )
                except Exception:
                    continue

        return aliases

    def resolve_js_import(self, importer_rel_path: str, import_str: str) -> Optional[str]:
        """
        Resolves a JavaScript / TypeScript import string to a local relative file path.
        Handles relative imports, extension-less paths, index files, and tsconfig aliases.
        """
        if not import_str or import_str.startswith("http:") or import_str.startswith("https:"):
            return None

        # 1. Check path aliases (e.g. @/* or ~/*)
        for alias_pattern, (base_rel, targets) in self.ts_aliases.items():
            if alias_pattern.endswith("/*") and import_str.startswith(alias_pattern[:-2]):
                suffix = import_str[len(alias_pattern[:-2]):].lstrip("/")
                for target_pattern in targets:
                    target_prefix = target_pattern[:-2] if target_pattern.endswith("/*") else target_pattern
                    candidate_rel = f"{base_rel}/{target_prefix}/{suffix}".replace("//", "/").strip("/")
                    resolved = self._match_js_file(candidate_rel)
                    if resolved:
                        return resolved

            elif alias_pattern == import_str:
                for target in targets:
                    candidate_rel = f"{base_rel}/{target}".replace("//", "/").strip("/")
                    resolved = self._match_js_file(candidate_rel)
                    if resolved:
                        return resolved

        # 2. Check relative imports (./ or ../)
        if import_str.startswith("./") or import_str.startswith("../"):
            importer_dir = os.path.dirname(importer_rel_path).replace("\\", "/")
            raw_target = os.path.normpath(os.path.join(importer_dir, import_str)).replace("\\", "/")
            return self._match_js_file(raw_target)

        # 3. Check direct root-relative import or non-relative if within src
        resolved_direct = self._match_js_file(import_str)
        if resolved_direct:
            return resolved_direct

        resolved_src = self._match_js_file(f"src/{import_str}")
        if resolved_src:
            return resolved_src

        return None

    def _match_js_file(self, base_rel: str) -> Optional[str]:
        base_rel = os.path.normpath(base_rel).replace("\\", "/")
        while base_rel.startswith("./") or base_rel.startswith("/"):
            base_rel = base_rel.lstrip("./").lstrip("/")
        
        # Exact match
        if base_rel in self.known_files:
            return base_rel

        # Try appending extensions
        for ext in JS_EXTENSIONS:
            cand = f"{base_rel}{ext}"
            if cand in self.known_files:
                return cand

        # Try directory index files
        for idx in INDEX_FILES:
            cand = f"{base_rel}{idx}"
            if cand in self.known_files:
                return cand

        return None

    def resolve_python_import(self, importer_rel_path: str, module_name: Optional[str], level: int = 0) -> Optional[str]:
        """
        Resolves a Python import to a local relative file path.
        - module_name: The imported module name (e.g. 'core.db' or None if 'from . import foo')
        - level: Relative import level (0 for absolute, 1 for '.', 2 for '..', etc.)
        """
        if not module_name and level == 0:
            return None

        # Fast filter for standard library
        top_name = module_name.split(".")[0] if module_name else ""
        if level == 0 and top_name in PYTHON_STDLIB:
            return None

        # 1. Relative import (level > 0)
        if level > 0:
            importer_dir = os.path.dirname(importer_rel_path).replace("\\", "/")
            parts = [p for p in importer_dir.split("/") if p]
            
            # Level 1 means current package/directory
            # Level 2 means parent directory, etc.
            steps_up = level - 1
            if steps_up > len(parts):
                return None
            target_parts = parts[:len(parts) - steps_up] if steps_up > 0 else parts
            target_base_dir = "/".join(target_parts)

            sub_path = module_name.replace(".", "/") if module_name else ""
            candidate = f"{target_base_dir}/{sub_path}".strip("/").replace("//", "/")
            return self._match_py_file(candidate)

        # 2. Absolute import (level == 0)
        sub_path = module_name.replace(".", "/")
        
        # Try relative to repo root
        match = self._match_py_file(sub_path)
        if match:
            return match

        # Try relative to 'src' or common source dirs if they exist
        for common_prefix in ["src", "app", "lib", "backend"]:
            match = self._match_py_file(f"{common_prefix}/{sub_path}")
            if match:
                return match

        # Try relative to importer directory (common in older Python scripts)
        importer_dir = os.path.dirname(importer_rel_path).replace("\\", "/")
        if importer_dir:
            match = self._match_py_file(f"{importer_dir}/{sub_path}")
            if match:
                return match

        return None

    def _match_py_file(self, base_rel: str) -> Optional[str]:
        base_rel = os.path.normpath(base_rel).replace("\\", "/")
        while base_rel.startswith("./") or base_rel.startswith("/"):
            base_rel = base_rel.lstrip("./").lstrip("/")
        if not base_rel or base_rel == ".":
            return None

        # Direct file.py
        cand_py = f"{base_rel}.py"
        if cand_py in self.known_files:
            return cand_py

        # Package __init__.py
        cand_init = f"{base_rel}/__init__.py"
        if cand_init in self.known_files:
            return cand_init

        # Exact match (e.g. if already has extension)
        if base_rel in self.known_files:
            return base_rel

        return None
