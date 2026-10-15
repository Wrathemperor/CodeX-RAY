import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

const DIRECTORY_PALETTE = [
  '#38BDF8','#818CF8','#34D399','#F472B6','#FBBF24',
  '#A78BFA','#2DD4BF','#FB923C','#E879F9','#94A3B8'
];

export default function CanvasGraph({
  graphData,
  selectedNode,
  onSelectNode,
  hoveredNode,
  setHoveredNode,
  highlightCycles,
  activeCycleIndex,
  viewMode = 'files',
  searchTerm = '',
  selectedDirectory = null,
  showClusters = true,
  onOpenInspector,
  onBlastRadius,       // Feature 1: right-click → compute blast radius
  blastRadiusNodeId,   // Feature 1: source node id
  blastRadiusMap,      // Feature 1: Map<nodeId, depth>
  focusNodeId,         // Feature 4: snap camera to this node
}) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const simRef       = useRef(null);
  const quadtreeRef  = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const zoomRef      = useRef(null);          // Feature 4: keep zoom behaviour ref
  const nodesRef     = useRef([]);            // Feature 4: access positions outside effect
  const renderRef    = useRef(null);
  const interactionRef = useRef({
    selectedNode: null,
    hoveredNode: null,
    highlightCycles: false,
    activeCycleIndex: null,
    searchTerm: '',
    selectedDirectory: null,
    showClusters: true,
    blastRadiusNodeId: null,
    blastRadiusMap: null,
  });

  const [dirColorMap, setDirColorMap] = useState({});

  const getDirColor = useCallback((dir) => {
    if (!dir || dir === 'root') return '#94A3B8';
    let hash = 0;
    for (let i = 0; i < dir.length; i++) hash = dir.charCodeAt(i) + ((hash << 5) - hash);
    return DIRECTORY_PALETTE[Math.abs(hash) % DIRECTORY_PALETTE.length];
  }, []);

  // Interaction state changes should redraw the existing graph, not recreate
  // the force simulation. Recreating it on every mouse move can overwhelm the
  // browser for medium and large repositories.
  useEffect(() => {
    interactionRef.current = {
      selectedNode,
      hoveredNode,
      highlightCycles,
      activeCycleIndex,
      searchTerm,
      selectedDirectory,
      showClusters,
      blastRadiusNodeId,
      blastRadiusMap,
    };
    renderRef.current?.();
  }, [selectedNode, hoveredNode, highlightCycles, activeCycleIndex, searchTerm, selectedDirectory, showClusters, blastRadiusNodeId, blastRadiusMap]);

  /* ─────────────────────────── Feature 4: Focus / Camera Snap ─────────────────────────── */
  useEffect(() => {
    if (!focusNodeId || !canvasRef.current || !zoomRef.current) return;
    const node = nodesRef.current.find(n => n.id === focusNodeId);
    if (!node || node.x == null) return;

    const canvas = canvasRef.current;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const targetScale = 2.2;
    const tx = w / 2 - node.x * targetScale;
    const ty = h / 2 - node.y * targetScale;
    const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(targetScale);

    d3.select(canvas)
      .transition()
      .duration(520)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform, targetTransform);
  }, [focusNodeId]);

  /* ──────────────────────────── Main simulation effect ────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !graphData) return;

    const width  = container.clientWidth;
    const height = container.clientHeight;
    const dpr    = window.devicePixelRatio || 1;

    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const isDirMode = viewMode === 'directories';
    const rawNodes = isDirMode ? (graphData.directory_graph?.nodes || []) : (graphData.nodes || []);
    const rawLinks = isDirMode ? (graphData.directory_graph?.links || []) : (graphData.links || []);

    if (rawNodes.length === 0) return;

    const nodes   = rawNodes.map(d => ({ ...d }));
    const nodeMap = new Map(nodes.map(d => [d.id, d]));

    const links = rawLinks
      .map(l => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source;
        const tid = typeof l.target === 'object' ? l.target.id : l.target;
        return { source: nodeMap.get(sid), target: nodeMap.get(tid), in_cycle: l.in_cycle, weight: l.weight || 1 };
      })
      .filter(l => l.source && l.target);

    const dirs = Array.from(new Set(nodes.map(n => n.directory))).filter(Boolean);
    const newColorMap = {};
    dirs.forEach((d, i) => { newColorMap[d] = DIRECTORY_PALETTE[i % DIRECTORY_PALETTE.length]; });
    setDirColorMap(newColorMap);

    /* Blast radius colour helper */
    const getBlastDepth = (id) => blastRadiusMap?.get(id) ?? null;

    const getRadius = (d) => isDirMode
      ? Math.max(14, Math.min(36, 12 + Math.sqrt(d.file_count || 1) * 4))
      : Math.max(7,  Math.min(26, 6  + Math.sqrt(d.loc || 1) * 1.6));

    /* D3 Force */
    const simulation = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(links).id(d => d.id).distance(isDirMode ? 140 : 85).strength(0.35))
      .force('charge',  d3.forceManyBody().strength(isDirMode ? -450 : -220))
      .force('collide', d3.forceCollide().radius(d => getRadius(d) + 12).iterations(2))
      .force('center',  d3.forceCenter(width / 2, height / 2).strength(0.08))
      .alphaDecay(0.025);

    simRef.current   = simulation;
    nodesRef.current = nodes;

    /* Convex hull clusters */
    const getDirectoryHulls = () => {
      if (!interactionRef.current.showClusters || isDirMode) return [];
      const groups = new Map();
      nodes.forEach(n => {
        if (!n.directory || n.directory === 'root') return;
        if (!groups.has(n.directory)) groups.set(n.directory, []);
        groups.get(n.directory).push([n.x, n.y]);
      });
      const hulls = [];
      groups.forEach((pts, dir) => {
        if (pts.length >= 3) {
          const hull = d3.polygonHull(pts);
          if (hull) hulls.push({ dir, hull });
        }
      });
      return hulls;
    };

    /* ────────────── Render ────────────── */
    const render = () => {
      const {
        selectedNode,
        hoveredNode,
        highlightCycles,
        activeCycleIndex,
        searchTerm,
        selectedDirectory,
        blastRadiusNodeId,
        blastRadiusMap,
      } = interactionRef.current;
      const activeCycle = (highlightCycles && graphData.cycles?.length)
        ? (activeCycleIndex !== null ? graphData.cycles[activeCycleIndex] : graphData.cycles.flat())
        : null;
      const activeCycleSet = new Set(activeCycle || []);

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      const t = transformRef.current;
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      /* 1 ─ Cluster hulls */
      getDirectoryHulls().forEach(({ dir, hull }) => {
        const color = newColorMap[dir] || '#818CF8';
        ctx.beginPath();
        ctx.fillStyle   = `${color}10`;
        ctx.strokeStyle = `${color}35`;
        ctx.lineWidth   = 1.5 / t.k;
        ctx.moveTo(hull[0][0], hull[0][1]);
        for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i][0], hull[i][1]);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        const centroid = d3.polygonCentroid(hull);
        ctx.font      = `600 ${Math.max(10, 12 / t.k)}px Inter, sans-serif`;
        ctx.fillStyle = `${color}aa`;
        ctx.textAlign = 'center';
        ctx.fillText(dir, centroid[0], centroid[1] - 15);
      });

      /* 2 ─ Highlight set for selected/hovered/search */
      const isFilterActive = Boolean(selectedNode || hoveredNode || searchTerm || selectedDirectory || activeCycleSet.size > 0 || blastRadiusNodeId);
      const highlightedIds        = new Set();
      const directDepIds          = new Set();
      const directDependentIds    = new Set();

      const activeFocus = hoveredNode || selectedNode;
      if (activeFocus) {
        highlightedIds.add(activeFocus.id);
        links.forEach(l => {
          if (l.source.id === activeFocus.id) { highlightedIds.add(l.target.id); directDepIds.add(l.target.id); }
          if (l.target.id === activeFocus.id) { highlightedIds.add(l.source.id); directDependentIds.add(l.source.id); }
        });
      }
      if (searchTerm) {
        nodes.forEach(n => {
          if (n.name.toLowerCase().includes(searchTerm.toLowerCase()) || n.id.toLowerCase().includes(searchTerm.toLowerCase()))
            highlightedIds.add(n.id);
        });
      }
      if (selectedDirectory) nodes.forEach(n => { if (n.directory === selectedDirectory) highlightedIds.add(n.id); });

      /* Include blast radius nodes in highlight set */
      if (blastRadiusMap) blastRadiusMap.forEach((_, id) => highlightedIds.add(id));
      if (blastRadiusNodeId) highlightedIds.add(blastRadiusNodeId);

      /* 3 ─ Links */
      links.forEach(l => {
        const isCycleLink       = highlightCycles && l.in_cycle && (!activeCycle || (activeCycleSet.has(l.source.id) && activeCycleSet.has(l.target.id)));
        const isConnectedToFocus = activeFocus && (l.source.id === activeFocus.id || l.target.id === activeFocus.id);

        /* Blast radius link colouring */
        const srcDepth  = getBlastDepth(l.source.id);
        const tgtId     = l.target.id;
        const isBlastLink = blastRadiusNodeId && (srcDepth !== null && tgtId === blastRadiusNodeId);

        const isDimmed = isFilterActive && !isConnectedToFocus && !isCycleLink && !isBlastLink &&
          !(blastRadiusMap && (blastRadiusMap.has(l.source.id) || blastRadiusMap.has(l.target.id)));

        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);

        if (isBlastLink || (blastRadiusMap && blastRadiusMap.has(l.source.id) && l.target.id === blastRadiusNodeId)) {
          const depth = getBlastDepth(l.source.id) || 1;
          const alpha = Math.max(0.4, 1 - (depth - 1) * 0.2);
          ctx.strokeStyle = `rgba(251, 146, 60, ${alpha})`;
          ctx.lineWidth   = Math.max(1.8, 2.6 / t.k);
          ctx.shadowColor = '#FB923C'; ctx.shadowBlur = 6;
        } else if (isCycleLink) {
          ctx.strokeStyle = '#F43F5E'; ctx.lineWidth = Math.max(2.2, 3 / t.k);
          ctx.shadowColor = '#F43F5E'; ctx.shadowBlur = 8;
        } else if (isConnectedToFocus) {
          ctx.strokeStyle = l.source.id === activeFocus.id ? '#00F0FF' : '#34D399';
          ctx.lineWidth = Math.max(1.8, 2.4 / t.k);
          ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 6;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5 / t.k; ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.16)';
          ctx.lineWidth   = Math.max(1, (l.weight > 1 ? 1.8 : 1) / t.k);
          ctx.shadowBlur  = 0;
        }

        ctx.lineTo(l.target.x, l.target.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        /* Arrow */
        if (!isDimmed && dr > 30) {
          const targetR  = getRadius(l.target);
          const angle    = Math.atan2(dy, dx);
          const ax = l.target.x - (targetR + 4) * Math.cos(angle);
          const ay = l.target.y - (targetR + 4) * Math.sin(angle);
          const al = Math.max(5, 7 / t.k);
          ctx.beginPath();
          ctx.fillStyle = ctx.strokeStyle;
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - al * Math.cos(angle - Math.PI / 6), ay - al * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(ax - al * Math.cos(angle + Math.PI / 6), ay - al * Math.sin(angle + Math.PI / 6));
          ctx.closePath(); ctx.fill();
        }
      });

      /* 4 ─ Nodes */
      nodes.forEach(n => {
        const r             = getRadius(n);
        const isSelected    = selectedNode?.id === n.id;
        const isHovered     = hoveredNode?.id  === n.id;
        const isInActiveCycle = highlightCycles && activeCycleSet.has(n.id);
        const isHighlighted = highlightedIds.has(n.id);
        const isDimmed      = isFilterActive && !isHighlighted && !isSelected && !isInActiveCycle;

        /* Blast radius states */
        const isBlastSource = n.id === blastRadiusNodeId;
        const blastDepth    = getBlastDepth(n.id);
        const isBlastImpact = !isBlastSource && blastDepth !== null;

        const baseColor = newColorMap[n.directory] || '#818CF8';

        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

        if (isBlastSource) {
          /* Origin — bright orange ring */
          ctx.fillStyle   = '#FB923C';
          ctx.strokeStyle = '#FFF7ED';
          ctx.lineWidth   = Math.max(2.5, 3.5 / t.k);
          ctx.shadowColor = '#FB923C'; ctx.shadowBlur = 22;
        } else if (isBlastImpact) {
          const alpha = Math.max(0.3, 1 - (blastDepth - 1) * 0.15);
          ctx.fillStyle   = `rgba(251, 146, 60, ${alpha})`;
          ctx.strokeStyle = '#FED7AA';
          ctx.lineWidth   = Math.max(1.8, 2.8 / t.k);
          ctx.shadowColor = '#FB923C';
          ctx.shadowBlur  = Math.max(6, 14 - blastDepth * 3);
        } else if (isInActiveCycle) {
          ctx.fillStyle = '#F43F5E'; ctx.strokeStyle = '#FFE4E6';
          ctx.lineWidth = Math.max(2, 3 / t.k);
          ctx.shadowColor = '#F43F5E'; ctx.shadowBlur = 15;
        } else if (isSelected || isHovered) {
          ctx.fillStyle = '#00F0FF'; ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = Math.max(2.5, 3.5 / t.k);
          ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 18;
        } else if (directDepIds.has(n.id)) {
          ctx.fillStyle = '#818CF8'; ctx.strokeStyle = '#C7D2FE'; ctx.lineWidth = Math.max(1.5, 2.2 / t.k);
        } else if (directDependentIds.has(n.id)) {
          ctx.fillStyle = '#34D399'; ctx.strokeStyle = '#A7F3D0'; ctx.lineWidth = Math.max(1.5, 2.2 / t.k);
        } else if (isDimmed) {
          ctx.fillStyle = `${baseColor}20`; ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.8 / t.k;
        } else {
          ctx.fillStyle   = baseColor; ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth   = Math.max(1.2, 1.6 / t.k);
          ctx.shadowColor = `${baseColor}60`; ctx.shadowBlur = 6;
        }

        ctx.fill(); ctx.stroke(); ctx.restore();

        /* Labels */
        const showLabel = isSelected || isHovered || isHighlighted || isInActiveCycle || isBlastSource || isBlastImpact || t.k > 1.2 || isDirMode;
        if (showLabel && !isDimmed) {
          ctx.font      = `${isSelected || isHovered ? '600' : '500'} ${Math.max(10, 11 / t.k)}px Inter, sans-serif`;
          ctx.fillStyle = isBlastSource ? '#FB923C'
            : isBlastImpact ? '#FED7AA'
            : isSelected || isHovered ? '#00F0FF'
            : isInActiveCycle ? '#FDA4AF' : '#E2E8F0';
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(n.name, n.x, n.y + r + 5 / t.k);
        }
      });

      ctx.restore();
    };

    renderRef.current = render;

    simulation.on('tick', () => {
      nodesRef.current = nodes; // keep ref fresh
      quadtreeRef.current = d3.quadtree().x(d => d.x).y(d => d.y).addAll(nodes);
      render();
    });

    /* Zoom & Pan */
    const zoom = d3.zoom()
      .scaleExtent([0.15, 6])
      .on('zoom', event => { transformRef.current = event.transform; render(); });

    zoomRef.current = zoom;
    d3.select(canvas).call(zoom);

    /* Hit testing */
    const getNodeAt = (sx, sy) => {
      if (!quadtreeRef.current) return null;
      const t = transformRef.current;
      const wx = (sx - t.x) / t.k;
      const wy = (sy - t.y) / t.k;
      const sr = 35 / t.k;
      let closest = null, minDist = sr;
      quadtreeRef.current.visit((node, x0, y0, x1, y1) => {
        if (!node.length) {
          do {
            const d    = node.data;
            const dist = Math.hypot(d.x - wx, d.y - wy);
            const r    = getRadius(d);
            if (dist < Math.max(r + 6 / t.k, minDist)) { minDist = dist; closest = d; }
          } while ((node = node.next));
        }
        return x0 > wx + minDist || x1 < wx - minDist || y0 > wy + minDist || y1 < wy - minDist;
      });
      return closest;
    };

    const onMouseMove = e => {
      const rect  = canvas.getBoundingClientRect();
      const found = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (found !== interactionRef.current.hoveredNode) { setHoveredNode(found); canvas.style.cursor = found ? 'pointer' : 'default'; render(); }
    };
    const onClick = e => {
      const rect  = canvas.getBoundingClientRect();
      const found = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      onSelectNode(found || null); render();
    };
    const onDblClick = e => {
      const rect  = canvas.getBoundingClientRect();
      const found = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (found && onOpenInspector) onOpenInspector(found);
    };

    /* Feature 1: right-click → blast radius */
    const onContextMenu = e => {
      e.preventDefault();
      const rect  = canvas.getBoundingClientRect();
      const found = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (found && onBlastRadius) onBlastRadius(found);
    };

    canvas.addEventListener('mousemove',   onMouseMove);
    canvas.addEventListener('click',       onClick);
    canvas.addEventListener('dblclick',    onDblClick);
    canvas.addEventListener('contextmenu', onContextMenu);

    const t0 = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2);
    d3.select(canvas).call(zoom.transform, t0);

    return () => {
      simulation.stop();
      if (renderRef.current === render) renderRef.current = null;
      canvas.removeEventListener('mousemove',   onMouseMove);
      canvas.removeEventListener('click',       onClick);
      canvas.removeEventListener('dblclick',    onDblClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [graphData, viewMode]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-dark-950">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Right-click hint (shown only when nothing is active) */}
      {!blastRadiusNodeId && !selectedNode && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-600 pointer-events-none select-none">
          Right-click any node to compute Blast Radius
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-20 px-3.5 py-2.5 rounded-xl glass-panel-elevated text-xs shadow-2xl border border-cyan-500/30 text-slate-200"
          style={{ left: 24, bottom: 24, maxWidth: 320 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getDirColor(hoveredNode.directory) }} />
            <span className="font-semibold text-white text-sm truncate">{hoveredNode.name}</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px] truncate mb-2">{hoveredNode.id}</div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-700/60 font-mono text-[11px]">
            <div><span className="text-slate-400 block">LOC</span><span className="text-cyan-400 font-bold">{hoveredNode.loc || (hoveredNode.files ? `${hoveredNode.files.length} files` : 0)}</span></div>
            <div><span className="text-slate-400 block">In-Deg</span><span className="text-emerald-400 font-bold">{hoveredNode.in_degree || 0}</span></div>
            <div><span className="text-slate-400 block">Out-Deg</span><span className="text-indigo-400 font-bold">{hoveredNode.out_degree || 0}</span></div>
          </div>
          {hoveredNode.in_cycle && (
            <div className="mt-2 text-rose-400 text-[10px] font-semibold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              Circular Dependency Loop
            </div>
          )}
          <div className="mt-1.5 text-slate-500 text-[10px]">Right-click → Blast Radius</div>
        </div>
      )}
    </div>
  );
}
