import os
from collections import defaultdict, deque
from typing import Dict, List, Optional, Set, Tuple

class GraphEngine:
    def __init__(self):
        pass

    def build_graph(self, files: List[Dict], parsed_data: Dict[str, Dict], resolver) -> Dict:
        """
        Builds the dependency graph from scanned files and parsed imports.
        """
        nodes_dict: Dict[str, Dict] = {}
        adjacency: Dict[str, Set[str]] = defaultdict(set)
        reverse_adjacency: Dict[str, Set[str]] = defaultdict(set)

        # 1. Initialize nodes
        for f in files:
            file_id = f["id"]
            p_data = parsed_data.get(file_id, {})
            folder = f["directory"] if f["directory"] else "root"
            top_folder = folder.split("/")[0] if folder != "root" else "root"

            nodes_dict[file_id] = {
                "id": file_id,
                "name": f["name"],
                "path": file_id,
                "directory": folder,
                "top_directory": top_folder,
                "extension": f["extension"],
                "size": f["size"],
                "loc": p_data.get("loc", 0),
                "classes": p_data.get("classes", []),
                "functions": p_data.get("functions", []),
                "exports": p_data.get("exports", []),
                "in_degree": 0,
                "out_degree": 0,
                "in_cycle": False,
                "cycle_ids": []
            }

        # 2. Resolve edges
        edges_set: Set[Tuple[str, str]] = set()

        for f in files:
            source_id = f["id"]
            p_data = parsed_data.get(source_id, {})
            raw_imports = p_data.get("raw_imports", [])

            for imp in raw_imports:
                target_id = None
                if imp.get("type") == "js":
                    target_id = resolver.resolve_js_import(source_id, imp.get("target"))
                elif imp.get("type") == "py":
                    target_id = resolver.resolve_python_import(source_id, imp.get("module"), imp.get("level", 0))

                if target_id and target_id in nodes_dict and target_id != source_id:
                    edges_set.add((source_id, target_id))
                    adjacency[source_id].add(target_id)
                    reverse_adjacency[target_id].add(source_id)

        # 3. Calculate degrees
        for source_id, target_id in edges_set:
            nodes_dict[source_id]["out_degree"] += 1
            nodes_dict[target_id]["in_degree"] += 1

        # 4. Detect cycles using Tarjan's SCC and elementary cycle finder
        cycles = self._find_cycles(nodes_dict.keys(), adjacency)
        for idx, cycle in enumerate(cycles):
            for node_id in cycle:
                if node_id in nodes_dict:
                    nodes_dict[node_id]["in_cycle"] = True
                    nodes_dict[node_id]["cycle_ids"].append(idx)

        # 5. Build links list
        links = []
        for source_id, target_id in edges_set:
            # Check if this link is part of any cycle
            is_cycle_link = False
            for cycle in cycles:
                # Cycle is e.g. [A, B, C, A]
                for i in range(len(cycle) - 1):
                    if cycle[i] == source_id and cycle[i+1] == target_id:
                        is_cycle_link = True
                        break
                if is_cycle_link:
                    break

            links.append({
                "source": source_id,
                "target": target_id,
                "in_cycle": is_cycle_link
            })

        # 6. Build directory clusters & aggregated compound graph
        directory_nodes, directory_links = self._build_directory_aggregation(nodes_dict, edges_set)

        return {
            "nodes": list(nodes_dict.values()),
            "links": links,
            "cycles": cycles,
            "directory_graph": {
                "nodes": directory_nodes,
                "links": directory_links
            },
            "stats": {
                "total_files": len(nodes_dict),
                "total_dependencies": len(links),
                "total_cycles": len(cycles),
                "max_loc": max([n["loc"] for n in nodes_dict.values()], default=0)
            }
        }

    def _find_cycles(self, all_nodes, adjacency: Dict[str, Set[str]]) -> List[List[str]]:
        """
        Finds simple directed cycles using DFS with recursion stack tracking.
        Limits to the most critical cycles to avoid exponential explosion in dense graphs.
        """
        visited = set()
        rec_stack = []
        rec_set = set()
        cycles = []
        seen_cycle_fingerprints = set()

        def dfs(node: str):
            if len(cycles) >= 50:  # Cap at top 50 cycles for responsiveness
                return
            visited.add(node)
            rec_stack.append(node)
            rec_set.add(node)

            for neighbor in sorted(adjacency.get(node, [])):
                if neighbor not in visited:
                    dfs(neighbor)
                elif neighbor in rec_set:
                    # Found a cycle!
                    cycle_start_idx = rec_stack.index(neighbor)
                    cycle_path = rec_stack[cycle_start_idx:] + [neighbor]
                    
                    # Canonical fingerprint (independent of start position)
                    core_cycle = cycle_path[:-1]
                    min_idx = core_cycle.index(min(core_cycle))
                    canonical = tuple(core_cycle[min_idx:] + core_cycle[:min_idx])

                    if canonical not in seen_cycle_fingerprints:
                        seen_cycle_fingerprints.add(canonical)
                        cycles.append(cycle_path)

            rec_stack.pop()
            rec_set.remove(node)

        for n in sorted(all_nodes):
            if n not in visited:
                dfs(n)

        # Sort cycles by length (shortest/most direct cycles first)
        cycles.sort(key=lambda c: len(c))
        return cycles

    def _build_directory_aggregation(self, nodes_dict: Dict[str, Dict], edges_set: Set[Tuple[str, str]]):
        """
        Aggregates files into directory-level nodes and inter-directory links.
        Enables high-level macro architectural visualization.
        """
        dir_files = defaultdict(list)
        for file_id, n in nodes_dict.items():
            d = n["directory"]
            dir_files[d].append(n)

        dir_nodes = []
        dir_names = set(dir_files.keys())

        for d, f_list in dir_files.items():
            total_loc = sum(f["loc"] for f in f_list)
            dir_nodes.append({
                "id": f"dir:{d}",
                "name": d if d != "root" else "(root)",
                "directory": d,
                "file_count": len(f_list),
                "loc": total_loc,
                "files": [f["id"] for f in f_list],
                "in_degree": 0,
                "out_degree": 0
            })

        dir_node_map = {n["id"]: n for n in dir_nodes}
        dir_edges = defaultdict(int)

        for source_id, target_id in edges_set:
            source_dir = f"dir:{nodes_dict[source_id]['directory']}"
            target_dir = f"dir:{nodes_dict[target_id]['directory']}"
            if source_dir != target_dir:
                dir_edges[(source_dir, target_dir)] += 1

        dir_links = []
        for (s_dir, t_dir), weight in dir_edges.items():
            if s_dir in dir_node_map and t_dir in dir_node_map:
                dir_node_map[s_dir]["out_degree"] += 1
                dir_node_map[t_dir]["in_degree"] += 1
                dir_links.append({
                    "source": s_dir,
                    "target": t_dir,
                    "weight": weight
                })

        return dir_nodes, dir_links
