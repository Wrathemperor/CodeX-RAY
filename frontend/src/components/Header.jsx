import React, { useState, useRef, useEffect } from 'react';
import {
  ScanLine,
  FolderGit2,
  RefreshCw,
  Layers,
  FileCode,
  ShieldAlert,
  Sparkles,
  Search,
  AlertTriangle,
  Zap,
  History,
  FolderOpen,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export default function Header({
  samples,
  currentSampleId,
  onSelectSample,
  onOpenScanModal,
  isScanning,
  scanProgress,
  scanMessage,
  viewMode,
  setViewMode,
  highlightCycles,
  setHighlightCycles,
  showClusters,
  setShowClusters,
  showFunctionLabels,
  setShowFunctionLabels,
  onOpenHealthDrawer,
  onOpenAIModal,
  onOpenHistory,
  searchTerm,
  setSearchTerm,
  onSearchNavigate,
  searchResults,
  searchResultIndex,
  analysisData,
  blastRadiusNodeId,
  blastRadiusCount,
  onClearBlastRadius,
}) {
  const searchRef = useRef(null);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'B': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'C': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'D': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      default:  return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  const currentSample = samples.find(s => s.id === currentSampleId);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-16 px-5 flex items-center justify-between glass-panel border-b border-white/10 select-none">

      {/* ── Brand + Repo Selector ── */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-[1px] shadow-glow">
            <div className="w-full h-full bg-dark-900 rounded-xl flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
              CodeX-RAY
            </h1>
            <p className="text-[10px] font-mono text-slate-400 leading-none">v3.0 Architecture X-Ray</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Sample Picker */}
        <div className="flex items-center bg-dark-900/90 rounded-lg p-1 border border-white/10">
          <FolderGit2 className="w-4 h-4 text-slate-400 ml-2 mr-1 shrink-0" />
          <select
            value={currentSampleId}
            onChange={e => onSelectSample(e.target.value)}
            className="bg-transparent text-xs text-slate-200 font-medium px-2 py-1 outline-none cursor-pointer max-w-[180px] truncate"
          >
            {samples.map(s => (
              <option key={s.id} value={s.id} className="bg-dark-900 text-white">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scan Repo Button */}
        <button
          onClick={onOpenScanModal}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Scan a custom repository folder"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Scan Repo</span>
        </button>

        {/* Rescan */}
        <button
          onClick={() => onOpenScanModal(true)}
          disabled={isScanning}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
            isScanning
              ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10 cursor-not-allowed'
              : 'border-white/10 text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/5'
          }`}
          title="Force refresh scan"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{isScanning ? `${scanProgress}%` : 'Rescan'}</span>
        </button>
      </div>

      {/* ── Centre: Search + View Controls ── */}
      <div className="flex items-center gap-3">

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); onSearchNavigate(e.shiftKey ? 'prev' : 'next'); }
              if (e.key === 'Escape') { setSearchTerm(''); }
            }}
            placeholder="Search files or modules..."
            className="w-52 pl-8 pr-3 py-1.5 text-xs rounded-lg bg-dark-900/90 border border-white/10 text-slate-200 placeholder-slate-500 focus:w-64 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all font-mono"
          />
          {/* Match counter */}
          {searchTerm && searchResults?.length > 0 && (
            <div className="absolute right-2 flex items-center gap-1">
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                {searchResultIndex + 1}/{searchResults.length}
              </span>
              <div className="flex flex-col">
                <button onClick={() => onSearchNavigate('prev')} className="text-slate-500 hover:text-slate-200">
                  <ChevronUp className="w-2.5 h-2.5" />
                </button>
                <button onClick={() => onSearchNavigate('next')} className="text-slate-500 hover:text-slate-200">
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}
          {searchTerm && searchResults?.length === 0 && (
            <span className="absolute right-2 text-[10px] font-mono text-rose-400">0 found</span>
          )}
        </div>

        {/* View Mode */}
        <div className="flex items-center bg-dark-900/90 rounded-lg p-0.5 border border-white/10">
          <button
            onClick={() => setViewMode('files')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              viewMode === 'files'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Files</span>
          </button>
          <button
            onClick={() => setViewMode('directories')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
              viewMode === 'directories'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Folders</span>
          </button>
        </div>

        {/* Clusters */}
        <button
          onClick={() => setShowClusters(!showClusters)}
          className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
            showClusters
              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
              : 'border-white/10 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle directory clustering hulls"
        >
          Clusters
        </button>

        <button
          onClick={() => setShowFunctionLabels(!showFunctionLabels)}
          className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
            showFunctionLabels
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 text-slate-400 hover:text-slate-200'
          }`}
          title="Show imported functions and symbols on dependency lines"
        >
          Functions
        </button>

        {/* Cycles */}
        <button
          onClick={() => setHighlightCycles(!highlightCycles)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
            highlightCycles
              ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 pulse-badge'
              : 'border-white/10 text-slate-400 hover:text-slate-200'
          }`}
          title="Highlight circular dependency cycles"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Cycles{analysisData?.cycles?.length ? ` (${analysisData.cycles.length})` : ''}</span>
        </button>

        {/* ⚡ Blast Radius HUD — shown only when active */}
        {blastRadiusNodeId && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-orange-500/50 bg-orange-500/15 text-orange-300 pulse-badge">
            <Zap className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
            <span className="font-semibold">
              Blast: {blastRadiusCount} file{blastRadiusCount !== 1 ? 's' : ''} impacted
            </span>
            <button
              onClick={onClearBlastRadius}
              className="ml-1 text-orange-400 hover:text-white transition"
              title="Clear blast radius"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Intelligence Badges ── */}
      <div className="flex items-center gap-3">

        {/* History */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 hover:bg-white/5 transition font-medium"
          title="View scan history"
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>

        {/* Health Score */}
        {analysisData && (
          <button
            onClick={onOpenHealthDrawer}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition hover:scale-105 ${getGradeColor(analysisData.grade)}`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Health: {analysisData.health_score}/100</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/10">
              Grade {analysisData.grade}
            </span>
          </button>
        )}

        {/* AI Insights */}
        <button
          onClick={onOpenAIModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-dark-950 font-semibold text-xs transition shadow-glow"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>AI Insights</span>
        </button>
      </div>
    </header>
  );
}
