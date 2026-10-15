import ast
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

class CodeParser:
    def __init__(self):
        # JS/TS import regexes
        self.js_import_regexes = [
            # import ... from '...' or import ... from "..."
            re.compile(r"""(?:import|export)\s+(?:[\w*\s{},$]+from\s+)?['"]([^'"]+)['"]"""),
            # require('...') or require("...")
            re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
            # dynamic import('...')
            re.compile(r"""import\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
        ]

        # JS/TS export signatures
        self.js_export_regex = re.compile(
            r"""export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|type|interface|enum)\s+([a-zA-Z0-9_$]+)"""
        )

        # JS/TS function / class definitions
        self.js_func_regex = re.compile(
            r"""(?:function\*?\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)"""
        )
        self.js_class_regex = re.compile(r"""class\s+([a-zA-Z0-9_$]+)""")
        self.js_import_binding_regex = re.compile(
            r"""(?:import|export)\s+(?:type\s+)?(?P<bindings>[\s\S]*?)\s+from\s+['"](?P<target>[^'"]+)['"]"""
        )

    def parse_file(self, abs_path: str, rel_path: str, ext: str) -> Dict:
        """
        Parses a file and extracts metrics, symbols, and raw import targets.
        """
        result = {
            "id": rel_path,
            "rel_path": rel_path,
            "loc": 0,
            "blank_lines": 0,
            "comment_lines": 0,
            "classes": [],
            "functions": [],
            "exports": [],
            "raw_imports": []  # List of dicts: {"type": "py"|"js", ...}
        }

        try:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            return result

        lines = content.splitlines()
        result["loc"] = len([l for l in lines if l.strip()])
        result["blank_lines"] = len([l for l in lines if not l.strip()])

        if ext in [".py", ".pyw"]:
            self._parse_python(content, lines, result)
        elif ext in [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]:
            self._parse_javascript(content, lines, result)

        return result

    def _parse_python(self, content: str, lines: List[str], result: Dict):
        result["comment_lines"] = len([l for l in lines if l.strip().startswith("#")])
        try:
            tree = ast.parse(content)
        except Exception:
            # Fallback regex if syntax error (e.g. newer syntax or template)
            self._parse_python_regex_fallback(content, result)
            return

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    result["raw_imports"].append({
                        "type": "py",
                        "module": alias.name,
                        "level": 0,
                        "symbols": []
                    })
            elif isinstance(node, ast.ImportFrom):
                result["raw_imports"].append({
                    "type": "py",
                    "module": node.module,
                    "level": node.level,
                    "symbols": [alias.name for alias in node.names if alias.name != "*"]
                })
            elif isinstance(node, ast.ClassDef):
                result["classes"].append(node.name)
                result["exports"].append(node.name)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                # Only record top-level functions or public methods
                result["functions"].append(node.name)
                if not node.name.startswith("_"):
                    result["exports"].append(node.name)

    def _parse_python_regex_fallback(self, content: str, result: Dict):
        for line in content.splitlines():
            line_str = line.strip()
            # from X import Y
            from_m = re.match(r"^from\s+([.\w]+)\s+import", line_str)
            if from_m:
                mod = from_m.group(1)
                level = len(re.match(r"^(\.*)", mod).group(1))
                clean_mod = mod.lstrip(".")
                result["raw_imports"].append({
                    "type": "py",
                    "module": clean_mod if clean_mod else None,
                    "level": level,
                    "symbols": []
                })
                continue
            # import X
            import_m = re.match(r"^import\s+([\w, ]+)", line_str)
            if import_m:
                for part in import_m.group(1).split(","):
                    p = part.strip().split()[0]
                    if p:
                        result["raw_imports"].append({
                            "type": "py",
                            "module": p,
                            "level": 0,
                            "symbols": []
                        })

    def _parse_javascript(self, content: str, lines: List[str], result: Dict):
        result["comment_lines"] = len([
            l for l in lines if l.strip().startswith("//") or l.strip().startswith("/*") or l.strip().startswith("*")
        ])

        imported_symbols = {}
        for match in self.js_import_binding_regex.finditer(content):
            target = match.group("target").strip()
            bindings = match.group("bindings").strip()
            symbols = self._parse_js_import_bindings(bindings)
            if target and symbols:
                imported_symbols.setdefault(target, set()).update(symbols)

        seen_imports = set()
        for rx in self.js_import_regexes:
            for match in rx.finditer(content):
                target = match.group(1).strip()
                if target and target not in seen_imports:
                    seen_imports.add(target)
                    result["raw_imports"].append({
                        "type": "js",
                        "target": target,
                        "symbols": sorted(imported_symbols.get(target, set()))
                    })

        # Find exports
        for match in self.js_export_regex.finditer(content):
            name = match.group(1)
            if name and name not in result["exports"]:
                result["exports"].append(name)

        # Find classes
        for match in self.js_class_regex.finditer(content):
            name = match.group(1)
            if name and name not in result["classes"]:
                result["classes"].append(name)

        # Find functions
        for match in self.js_func_regex.finditer(content):
            name = match.group(1) or match.group(2)
            if name and name not in result["functions"]:
                result["functions"].append(name)

    @staticmethod
    def _parse_js_import_bindings(bindings: str) -> List[str]:
        """Return imported source symbols for common ES module import forms."""
        if not bindings or bindings.startswith("*"):
            return []

        symbols = []
        named_match = re.search(r"\{([^}]+)\}", bindings)
        if named_match:
            for item in named_match.group(1).split(","):
                name = item.strip().removeprefix("type ").split(" as ")[0].strip()
                if name:
                    symbols.append(name)

        default_part = bindings.split("{")[0].strip().rstrip(",").removeprefix("type ").strip()
        if default_part and not default_part.startswith("*"):
            symbols.append("default")
        return symbols
