import React from 'react';
import {
  X,
  AlertOctagon,
  ShieldAlert,
  Flame,
  FileQuestion,
  Activity,
  ArrowRight,
  Crosshair,
  ExternalLink
} from 'lucide-react';

export default function HealthDrawer({
  isOpen,
  onClose,
  analysisData,
  onHighlightCycle,
  onSelectNode
}) {
  if (!isOpen || !analysisData) return null;

  const {
    health_score,
    grade,
    cycles = [],
    god_modules = [],
    orphan_files = [],
    stats = {}
  } = analysisData;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 80) return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-xl h-full glass-panel-elevated border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Architecture Health Radar</h2>
              <p className="text-xs text-slate-400">Structural integrity, cycle loops, and coupling analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Health Score Card */}
          <div className="p-5 rounded-2xl glass-panel border border-white/10 flex items-center justify-between bg-gradient-to-r from-dark-900 to-dark-850">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Maintainability Rating
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tight">{health_score}</span>
                <span className="text-sm font-semibold text-slate-500">/ 100</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {cycles.length === 0 ? 'No circular dependencies detected' : `${cycles.length} circular loops require resolution`}
              </p>
            </div>

            <div className={`px-4 py-2.5 rounded-xl border text-xl font-mono font-bold uppercase shadow-lg ${getScoreColor(health_score)}`}>
              Grade {grade}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl glass-panel border border-white/5">
              <span className="text-[11px] text-slate-400 block mb-1">Total Files</span>
              <span className="text-lg font-bold text-slate-100 font-mono">{stats.total_files || 0}</span>
            </div>
            <div className="p-3 rounded-xl glass-panel border border-white/5">
              <span className="text-[11px] text-slate-400 block mb-1">Dependencies</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">{stats.total_dependencies || 0}</span>
            </div>
            <div className="p-3 rounded-xl glass-panel border border-white/5">
              <span className="text-[11px] text-slate-400 block mb-1">Coupling Ratio</span>
              <span className="text-lg font-bold text-indigo-400 font-mono">
                {stats.total_files ? ((stats.total_dependencies || 0) / stats.total_files).toFixed(1) : 0}x
              </span>
            </div>
          </div>

          {/* Section 1: Circular Dependencies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-white">Circular Dependencies</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                cycles.length > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {cycles.length} detected
              </span>
            </div>

            {cycles.length === 0 ? (
              <div className="p-4 rounded-xl glass-panel text-xs text-slate-400 border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                No circular dependencies found! Clean unidirectional dependency tree.
              </div>
            ) : (
              <div className="space-y-2.5">
                {cycles.map((cycle, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl glass-panel border border-rose-500/30 hover:border-rose-500/60 transition group bg-rose-950/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-rose-300 font-mono">Loop #{idx + 1} ({cycle.length} files)</span>
                      <button
                        onClick={() => onHighlightCycle(idx)}
                        className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Isolate on Canvas</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-300">
                      {cycle.map((nodeId, nodeIdx) => (
                        <React.Fragment key={nodeIdx}>
                          <span
                            onClick={() => onSelectNode(nodeId)}
                            className="px-2 py-1 rounded bg-dark-900 border border-white/10 hover:border-cyan-400 hover:text-cyan-300 cursor-pointer transition truncate max-w-[200px]"
                            title={nodeId}
                          >
                            {nodeId.split('/').pop()}
                          </span>
                          {nodeIdx < cycle.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-rose-400 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: God Modules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">High-Coupling "God Modules"</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/20 text-amber-300">
                {god_modules.length} flagged
              </span>
            </div>

            {god_modules.length === 0 ? (
              <div className="p-4 rounded-xl glass-panel text-xs text-slate-400 border border-emerald-500/20">
                No high-coupling monolithic files found. Responsibilities are well-distributed.
              </div>
            ) : (
              <div className="space-y-2.5">
                {god_modules.map((gm) => (
                  <div
                    key={gm.id}
                    onClick={() => onSelectNode(gm.id)}
                    className="p-3.5 rounded-xl glass-panel border border-amber-500/30 hover:border-amber-400/60 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white truncate">{gm.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {gm.loc} LOC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mb-2">{gm.id}</p>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-emerald-400">In-degree: <strong>{gm.in_degree}</strong></span>
                      <span className="text-indigo-400">Out-degree: <strong>{gm.out_degree}</strong></span>
                      <span className="text-rose-400">Blast Radius: <strong>{gm.total_connections} files</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Orphan Files */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Orphan Files (Dead Code Candidates)</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300">
                {orphan_files.length} detected
              </span>
            </div>

            {orphan_files.length === 0 ? (
              <div className="p-4 rounded-xl glass-panel text-xs text-slate-400 border border-white/5">
                No dead or unreferenced files detected in the scanned scope.
              </div>
            ) : (
              <div className="space-y-2">
                {orphan_files.map((orphan) => (
                  <div
                    key={orphan.id}
                    onClick={() => onSelectNode(orphan.id)}
                    className="p-3 rounded-xl glass-panel border border-white/10 hover:border-white/30 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-medium text-slate-200 block">{orphan.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{orphan.id}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 px-2 py-1 rounded bg-dark-900 border border-white/5">
                      0 Refs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
