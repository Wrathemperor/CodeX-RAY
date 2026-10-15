from typing import Dict, List, Set

ENTRY_POINT_NAMES = {
    "index.js", "index.ts", "index.tsx", "main.py", "app.py", "server.py",
    "main.ts", "main.js", "App.tsx", "App.jsx", "run.py", "wsgi.py", "manage.py"
}

class ArchitectureAnalyzer:
    def __init__(self):
        pass

    def analyze(self, graph_data: Dict) -> Dict:
        nodes = graph_data.get("nodes", [])
        links = graph_data.get("links", [])
        cycles = graph_data.get("cycles", [])

        total_files = len(nodes)
        if total_files == 0:
            return {
                "health_score": 100,
                "grade": "A",
                "god_modules": [],
                "orphan_files": [],
                "cycles": [],
                "metrics": {
                    "modularity_ratio": 1.0,
                    "cycle_count": 0,
                    "orphan_count": 0,
                    "god_module_count": 0
                },
                "breakdown": []
            }

        # 1. Identify God Modules (Top coupled files)
        # Threshold: degree > 10 or degree > 25% of total nodes (whichever is lower)
        threshold = max(5, int(total_files * 0.15))
        god_modules = []
        for n in nodes:
            total_degree = n["in_degree"] + n["out_degree"]
            if total_degree >= threshold:
                god_modules.append({
                    "id": n["id"],
                    "name": n["name"],
                    "loc": n["loc"],
                    "in_degree": n["in_degree"],
                    "out_degree": n["out_degree"],
                    "total_degree": total_degree,
                    "reason": f"High coupling ({total_degree} connections: {n['in_degree']} incoming, {n['out_degree']} outgoing)"
                })
        god_modules.sort(key=lambda x: x["total_degree"], reverse=True)

        # 2. Identify Orphan / Unconnected Files
        orphan_files = []
        for n in nodes:
            if n["in_degree"] == 0 and n["name"] not in ENTRY_POINT_NAMES:
                orphan_files.append({
                    "id": n["id"],
                    "name": n["name"],
                    "loc": n["loc"],
                    "out_degree": n["out_degree"],
                    "is_completely_isolated": n["out_degree"] == 0
                })
        orphan_files.sort(key=lambda x: x["loc"], reverse=True)

        # 3. Modularity calculation (intra-directory vs cross-directory)
        intra_links = 0
        cross_links = 0
        node_map = {n["id"]: n for n in nodes}

        for link in links:
            s = node_map.get(link["source"] if isinstance(link["source"], str) else link["source"]["id"])
            t = node_map.get(link["target"] if isinstance(link["target"], str) else link["target"]["id"])
            if s and t:
                if s["directory"] == t["directory"]:
                    intra_links += 1
                else:
                    cross_links += 1

        total_links = len(links)
        modularity_ratio = round((intra_links / total_links) if total_links > 0 else 1.0, 2)

        # 4. Calculate Health Score (0 - 100)
        score = 100
        breakdown = []

        # Penalty for cycles: -8 per cycle up to -40
        cycle_count = len(cycles)
        if cycle_count > 0:
            penalty = min(40, cycle_count * 8)
            score -= penalty
            breakdown.append({
                "type": "error",
                "title": f"{cycle_count} Circular Dependencies Found",
                "penalty": penalty,
                "description": "Circular imports can cause import-time race conditions, memory leaks, and brittle coupling."
            })

        # Penalty for God modules: -5 per god module up to -25
        if len(god_modules) > 0:
            penalty = min(25, len(god_modules) * 5)
            score -= penalty
            breakdown.append({
                "type": "warning",
                "title": f"{len(god_modules)} God Modules (High Coupling)",
                "penalty": penalty,
                "description": "Modules with excessive connections indicate poor separation of concerns and fragile abstractions."
            })

        # Penalty for high percentage of orphan files: up to -15
        orphan_ratio = len(orphan_files) / total_files if total_files > 0 else 0
        if orphan_ratio > 0.3:
            penalty = min(15, int(orphan_ratio * 20))
            score -= penalty
            breakdown.append({
                "type": "info",
                "title": f"{len(orphan_files)} Orphan / Unused Files",
                "penalty": penalty,
                "description": f"{round(orphan_ratio * 100)}% of files are never imported by other modules."
            })

        score = max(10, min(100, score))

        if score >= 90:
            grade = "A"
        elif score >= 80:
            grade = "B"
        elif score >= 70:
            grade = "C"
        elif score >= 55:
            grade = "D"
        else:
            grade = "F"

        return {
            "health_score": score,
            "grade": grade,
            "god_modules": god_modules[:10],
            "orphan_files": orphan_files[:15],
            "cycles": cycles[:10],
            "metrics": {
                "modularity_ratio": modularity_ratio,
                "cycle_count": cycle_count,
                "orphan_count": len(orphan_files),
                "god_module_count": len(god_modules),
                "total_files": total_files,
                "total_dependencies": total_links
            },
            "breakdown": breakdown
        }
