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
  currentUser,
  onOpenAuthModal,
  onLogout,
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
    <header className="absolute top-0 left-0 right-0 z-30 h-16 px-5 flex items-center justify-between glass-panel border-b border-[#00FFFF]/30 select-none blueprint-crosshair">

      {/* ── Brand + Repo Selector ── */}
      <div className="flex items-center gap-3">
        {/* Logo / Drafting Stamp */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded bg-[#001C38] border border-[#00FFFF]/60 flex items-center justify-center shadow-blueprint">
            <ScanLine className="w-5 h-5 text-[#00FFFF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-widest font-mono text-white uppercase">
                CodeX-RAY
              </h1>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#00FFFF]/10 border border-[#00FFFF]/40 text-[#00FFFF]">
                DWG NO. CR-300
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#00FFFF]/60 leading-none tracking-wider">
              [ ARCHITECTURAL SCHEMATIC // 1:1 ]
            </p>
          </div>
        </div>

        {/* Dimension separator */}
        <div className="text-[10px] font-mono text-white/30 hidden md:block">
          &lt;--- 1200px ---&gt;
        </div>

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

        {/* Cycles (Redline) */}
        <button
          onClick={() => setHighlightCycles(!highlightCycles)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border font-mono transition ${
            highlightCycles
              ? 'blueprint-redline pulse-badge font-bold'
              : 'border-white/20 text-[#FF9999] hover:bg-[#FF3333]/15'
          }`}
          title="Highlight circular dependency cycles in redline ink"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#FF3333]" />
          <span>[REDLINE CYCLES{analysisData?.cycles?.length ? ` : ${analysisData.cycles.length}` : ''}]</span>
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded blueprint-stamp text-[#00FFFF] text-xs font-semibold shadow-blueprint"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>[AI SPEC AUDIT]</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20" />

        {/* User Account State */}
        {currentUser ? (
          <div className="flex items-center gap-2 font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#001C38] border border-[#00FFFF]/40 text-xs text-[#00FFFF]">
              <span className="w-2 h-2 rounded-full bg-[#00FFFF]"></span>
              <span className="max-w-[120px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="px-2.5 py-1 text-xs rounded border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Sign out"
            >
              EXIT
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="px-3 py-1.5 text-xs font-semibold rounded blueprint-stamp text-[#00FFFF] shadow-blueprint"
          >
            [AUTH: SIGN IN]
          </button>
        )}
      </div>
    </header>
  );
}
