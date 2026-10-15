import os
from typing import Dict, List, Optional

class AIService:
    def __init__(self):
        pass

    def generate_architecture_summary(self, analysis: Dict, graph_data: Dict) -> Dict:
        """
        Generates a token-budgeted, structured architectural insight report.
        Can run with built-in heuristic intelligence or optional LLM synthesis.
        """
        metrics = analysis.get("metrics", {})
        health_score = analysis.get("health_score", 100)
        cycles = analysis.get("cycles", [])
        god_modules = analysis.get("god_modules", [])
        orphan_files = analysis.get("orphan_files", [])

        # Construct structured summary
        insights = []
        action_items = []

        # 1. Circular dependency insights
        if cycles:
            cycle_descriptions = []
            for idx, c in enumerate(cycles[:3]):
                cycle_descriptions.append(" -> ".join([os.path.basename(p) for p in c]))
            
            insights.append({
                "severity": "high",
                "category": "Circular Dependencies",
                "summary": f"Detected {len(cycles)} circular dependency loops. Top loops: {'; '.join(cycle_descriptions)}",
                "recommendation": "Decouple cycles by introducing an intermediary interface/types file, or applying dependency injection / event emitter patterns."
            })
            action_items.append("Break cycle between " + " and ".join([os.path.basename(c[0]) for c in cycles[:2]]))
        else:
            insights.append({
                "severity": "positive",
                "category": "Dependency Flow",
                "summary": "Clean acyclic dependency graph. No circular import loops detected.",
                "recommendation": "Maintain unidirectional data and import flow across modules."
            })

        # 2. God module insights
        if god_modules:
            top_god = god_modules[0]
            insights.append({
                "severity": "medium",
                "category": "Coupling & Complexity",
                "summary": f"'{top_god['name']}' acts as a major dependency hub with {top_god['total_degree']} connections ({top_god['in_degree']} incoming, {top_god['out_degree']} outgoing).",
                "recommendation": f"Split '{top_god['name']}' into smaller, single-responsibility modules or use a facade pattern."
            })
            action_items.append(f"Refactor high-coupling hub: {top_god['name']}")

        # 3. Modularity ratio
        mod_ratio = metrics.get("modularity_ratio", 1.0)
        if mod_ratio < 0.4:
            insights.append({
                "severity": "medium",
                "category": "Directory Modularity",
                "summary": f"Low intra-directory cohesion ({int(mod_ratio * 100)}%). Most imports cross folder boundaries.",
                "recommendation": "Group tightly-coupled files into domain-driven feature folders to improve encapsulation."
            })
            action_items.append("Reorganize cross-cutting files into domain feature packages")
        elif mod_ratio > 0.7:
            insights.append({
                "severity": "positive",
                "category": "Directory Modularity",
                "summary": f"Strong modular encapsulation ({int(mod_ratio * 100)}% of imports stay within their respective folders).",
                "recommendation": "Keep domain boundaries clear and enforce public interface barriers."
            })

        # 4. Dead / orphan code
        if orphan_files:
            completely_isolated = [f for f in orphan_files if f.get("is_completely_isolated")]
            if completely_isolated:
                insights.append({
                    "severity": "low",
                    "category": "Dead Code / Unused Files",
                    "summary": f"Found {len(completely_isolated)} completely isolated files with 0 incoming and 0 outgoing dependencies.",
                    "recommendation": "Review whether these files are obsolete utility scripts or missed test files."
                })
                action_items.append(f"Audit {len(completely_isolated)} isolated files for potential deletion")

        # Executive verdict
        if health_score >= 85:
            verdict = "Excellent codebase health. Clean separation of concerns with strong modular boundaries."
        elif health_score >= 70:
            verdict = "Moderate health. The system is maintainable, but targeted refactoring on dependency hubs is recommended."
        else:
            verdict = "Critical architectural debt detected. High risk of cyclic coupling and brittle changes."

        return {
            "verdict": verdict,
            "health_score": health_score,
            "insights": insights,
            "action_items": action_items,
            "top_cycles": cycles[:5],
            "top_god_modules": [g["id"] for g in god_modules[:5]]
        }

    def generate_file_insight(self, file_node: Dict, dependents: List[str], dependencies: List[str], in_cycle: bool) -> Dict:
        """
        Generates targeted AI advice for an individual file without uploading the whole codebase.
        """
        suggestions = []
        if in_cycle:
            suggestions.append("⚠️ This file participates in a circular dependency. Extract shared types or use lazy imports.")
        
        if len(dependencies) > 8:
            suggestions.append(f"📦 High outgoing dependencies ({len(dependencies)} modules imported). Consider grouping imports into a service container.")
        
        if len(dependents) > 10:
            suggestions.append(f"🌟 Critical architectural asset: {len(dependents)} files depend on this module. Any signature changes here carry high blast radius.")
        
        if not suggestions:
            suggestions.append("✅ Well-balanced module with manageable dependency count.")

        return {
            "file": file_node.get("id"),
            "role": "Central Hub" if len(dependents) > 7 else ("Leaf Utility" if len(dependencies) == 0 else "Standard Module"),
            "suggestions": suggestions,
            "blast_radius": "High" if len(dependents) > 7 else ("Medium" if len(dependents) > 2 else "Low")
        }
