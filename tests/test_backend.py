import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.scanner import CodebaseScanner
from backend.resolver import ImportResolver
from backend.parser import CodeParser
from backend.graph_engine import GraphEngine
from backend.analyzer import ArchitectureAnalyzer
from backend.ai_service import AIService

def test_scanner_and_resolver():
    print(">>> Testing Scanner & Resolver on react_ecommerce...")
    react_dir = PROJECT_ROOT / "backend" / "samples" / "react_ecommerce"
    scanner = CodebaseScanner(str(react_dir))
    files = scanner.scan_files()
    
    file_ids = {f["id"] for f in files}
    print(f"  Scanned {len(files)} files: {file_ids}")
    assert "src/App.tsx" in file_ids
    assert "src/types/index.ts" in file_ids
    assert "src/components/Header.tsx" in file_ids

    resolver = ImportResolver(str(react_dir), file_ids)
    
    # Test alias resolution: @/components/Header from App.tsx
    resolved_header = resolver.resolve_js_import("src/App.tsx", "@/components/Header")
    print(f"  Resolved '@/components/Header': {resolved_header}")
    assert resolved_header == "src/components/Header.tsx", f"Expected src/components/Header.tsx, got {resolved_header}"

    # Test alias + directory index resolution: @/types -> src/types/index.ts
    resolved_types = resolver.resolve_js_import("src/components/ProductCard.tsx", "@/types")
    print(f"  Resolved '@/types': {resolved_types}")
    assert resolved_types == "src/types/index.ts", f"Expected src/types/index.ts, got {resolved_types}"

    print("  Scanner & JS/TS Alias Resolver tests passed!")

def test_python_circular_dependencies():
    print(">>> Testing Python Scanner, Parser & Cycle Detection on python_service...")
    py_dir = PROJECT_ROOT / "backend" / "samples" / "python_service"
    scanner = CodebaseScanner(str(py_dir))
    files = scanner.scan_files()
    file_ids = {f["id"] for f in files}

    parser = CodeParser()
    parsed_data = {}
    for f in files:
        parsed_data[f["id"]] = parser.parse_file(f["abs_path"], f["rel_path"], f["extension"])

    resolver = ImportResolver(str(py_dir), file_ids)
    graph_engine = GraphEngine()
    graph_data = graph_engine.build_graph(files, parsed_data, resolver)

    print(f"  Graph generated with {len(graph_data['nodes'])} nodes and {len(graph_data['links'])} links.")
    print(f"  Cycles detected: {len(graph_data['cycles'])}")
    for c in graph_data["cycles"]:
        print(f"    Cycle: {' -> '.join(c)}")

    assert len(graph_data["cycles"]) >= 1, "Expected at least 1 cycle between auth_service and user_service!"
    cycle_files = set(graph_data["cycles"][0])
    assert "services/auth_service.py" in cycle_files or "services/user_service.py" in cycle_files

    analyzer = ArchitectureAnalyzer()
    analysis = analyzer.analyze(graph_data)
    print(f"  Health Score: {analysis['health_score']}/100, Grade: {analysis['grade']}")
    print(f"  Orphan files: {[o['name'] for o in analysis['orphan_files']]}")
    
    # Check that legacy_unused.py is detected as an orphan
    orphan_names = [o["name"] for o in analysis["orphan_files"]]
    assert "legacy_unused.py" in orphan_names, "Expected legacy_unused.py to be identified as orphan"

    ai_service = AIService()
    ai_report = ai_service.generate_architecture_summary(analysis, graph_data)
    print(f"  AI Verdict: {ai_report['verdict']}")
    assert len(ai_report["insights"]) > 0

    print("  Python AST & Cycle Detection tests passed!")

if __name__ == "__main__":
    test_scanner_and_resolver()
    test_python_circular_dependencies()
    print("\nALL BACKEND TESTS PASSED!")
