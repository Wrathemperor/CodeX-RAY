import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CanvasGraph from './components/CanvasGraph';
import HealthDrawer from './components/HealthDrawer';
import CodeInspectorDrawer from './components/CodeInspectorDrawer';
import AIInsightsModal from './components/AIInsightsModal';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderTree,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

export default function App() {
  const [samples, setSamples] = useState([]);
  const [currentSampleId, setCurrentSampleId] = useState('python_service');
  const [customPath, setCustomPath] = useState('');

  const [graphData, setGraphData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [viewMode, setViewMode] = useState('files'); // 'files' | 'directories'
  const [highlightCycles, setHighlightCycles] = useState(false);
  const [activeCycleIndex, setActiveCycleIndex] = useState(null);
  const [showClusters, setShowClusters] = useState(true);

  const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');

  // 1. Fetch available sample repos and the project selected by the CLI.
  useEffect(() => {
    Promise.all([fetch('/api/samples').then(res => res.json()), fetch('/api/config').then(res => res.json())])
      .then(([availableSamples, config]) => {
        const initialPath = config.initial_path;
        const initialWorkspace = initialPath ? {
          id: 'workspace',
          name: initialPath.split(/[\\/]/).filter(Boolean).pop() || initialPath,
          path: initialPath,
          tech: 'Current workspace'
        } : null;
        const data = initialWorkspace ? [initialWorkspace, ...availableSamples] : availableSamples;
        setSamples(data);
        if (initialWorkspace) {
          setCurrentSampleId('workspace');
          triggerScan(initialPath, false);
        } else if (availableSamples.length > 0) {
          triggerScan(availableSamples[0].path, false, availableSamples[0].id);
        }
      })
      .catch(err => console.error("Failed to fetch samples", err));
  }, []);

  // 2. Scan Trigger & Polling
  const triggerScan = async (path = null, force = false, sampleId = null) => {
    setIsScanning(true);
    setScanProgress(10);
    setScanMessage("Initializing scan...");

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: path,
          sample_id: sampleId || (path ? null : currentSampleId),
          force: force
        })
      });

      const data = await res.json();
      if (data.job_id === 'cached') {
        setScanProgress(100);
        setScanMessage("Loaded from cache");
        await loadAllArtifacts();
        setIsScanning(false);
        return;
      }

      // Poll scan job
      const jobId = data.job_id;
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/scan/status/${jobId}`);
          const pollData = await pollRes.json();
          setScanProgress(pollData.progress || 20);
          setScanMessage(pollData.message || "Scanning...");

          if (pollData.status === 'completed') {
            clearInterval(pollInterval);
            setIsScanning(false);
            await loadAllArtifacts();
          } else if (pollData.status === 'failed') {
            clearInterval(pollInterval);
            setIsScanning(false);
            alert(`Scan failed: ${pollData.error || 'Unknown error'}`);
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setIsScanning(false);
          console.error("Poll error", pollErr);
        }
      }, 500);

    } catch (err) {
      console.error("Scan trigger failed", err);
      setIsScanning(false);
    }
  };

  const loadAllArtifacts = async () => {
    try {
      const [gRes, hRes, aiRes] = await Promise.all([
        fetch('/api/graph'),
        fetch('/api/health'),
        fetch('/api/ai/insights')
      ]);

      const [gData, hData, aiData] = await Promise.all([
        gRes.json(),
        hRes.json(),
        aiRes.json()
      ]);

      setGraphData(gData);
      setAnalysisData(hData);
      setAiInsights(aiData);
      setSelectedNode(null);
      setHoveredNode(null);
      setActiveCycleIndex(null);
    } catch (e) {
      console.error("Error loading artifacts", e);
    }
  };

  const handleSelectSample = (sampleId) => {
    setCurrentSampleId(sampleId);
    const sample = samples.find(s => s.id === sampleId);
    if (sample) {
      triggerScan(sample.path, false, sampleId);
    }
  };

  const handleHighlightCycle = (cycleIdx) => {
    setHighlightCycles(true);
    setActiveCycleIndex(cycleIdx);
    setIsHealthDrawerOpen(false);
  };

  const handleSelectNodeFromDrawer = (nodeId) => {
    if (!graphData) return;
    const target = graphData.nodes?.find(n => n.id === nodeId);
    if (target) {
      setSelectedNode(target);
      setIsInspectorOpen(true);
      setIsHealthDrawerOpen(false);
    }
  };

  // Directory groupings for directory legend
  const directories = Array.from(new Set(graphData?.nodes?.map(n => n.directory) || [])).filter(Boolean);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-dark-950 select-none">
      {/* Top Header */}
      <Header
        samples={samples}
        currentSampleId={currentSampleId}
        onSelectSample={handleSelectSample}
        customPath={customPath}
        setCustomPath={setCustomPath}
        onTriggerScan={(p, f) => triggerScan(p, f)}
        isScanning={isScanning}
        scanProgress={scanProgress}
        scanMessage={scanMessage}
        viewMode={viewMode}
        setViewMode={setViewMode}
        highlightCycles={highlightCycles}
        setHighlightCycles={setHighlightCycles}
        showClusters={showClusters}
        setShowClusters={setShowClusters}
        onOpenHealthDrawer={() => setIsHealthDrawerOpen(true)}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        analysisData={analysisData}
        graphStats={graphData?.stats}
      />

      {/* Main Canvas Area */}
      <main className="w-full h-full pt-16">
        {graphData ? (
          <CanvasGraph
            graphData={graphData}
            selectedNode={selectedNode}
            onSelectNode={(node) => {
              setSelectedNode(node);
              if (node) setIsInspectorOpen(true);
            }}
            hoveredNode={hoveredNode}
            setHoveredNode={setHoveredNode}
            highlightCycles={highlightCycles}
            activeCycleIndex={activeCycleIndex}
            viewMode={viewMode}
            searchTerm={searchTerm}
            selectedDirectory={selectedDirectory}
            showClusters={showClusters}
            onOpenInspector={(node) => {
              setSelectedNode(node);
              setIsInspectorOpen(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">{scanMessage || 'Scanning codebase...'}</p>
          </div>
        )}
      </main>

      {/* Bottom Floating HUD Info Bar */}
      {graphData && (
        <div className="absolute bottom-5 left-5 z-20 flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl glass-panel text-xs flex items-center gap-4 text-slate-300 font-mono shadow-xl border border-white/10">
            <div>
              <span className="text-slate-500 mr-1.5">Nodes:</span>
              <strong className="text-white">
                {viewMode === 'files' ? (graphData.nodes?.length || 0) : (graphData.directory_graph?.nodes?.length || 0)}
              </strong>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <div>
              <span className="text-slate-500 mr-1.5">Edges:</span>
              <strong className="text-cyan-400">
                {viewMode === 'files' ? (graphData.links?.length || 0) : (graphData.directory_graph?.links?.length || 0)}
              </strong>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <div>
              <span className="text-slate-500 mr-1.5">Cycles:</span>
              <strong className="text-rose-400">
                {graphData.cycles?.length || 0}
              </strong>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <div>
              <span className="text-slate-500 mr-1.5">Density:</span>
              <strong className="text-indigo-400">
                {(() => {
                  const n = viewMode === 'files' ? (graphData.nodes?.length || 0) : (graphData.directory_graph?.nodes?.length || 0);
                  const l = viewMode === 'files' ? (graphData.links?.length || 0) : (graphData.directory_graph?.links?.length || 0);
                  return n > 1 ? ((l / (n * (n - 1))) * 100).toFixed(1) : '0.0';
                })()}%
              </strong>
            </div>
          </div>

          {/* Directory Filter Pills */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-xl glass-panel max-w-md overflow-x-auto">
            <button
              onClick={() => setSelectedDirectory(null)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition ${
                selectedDirectory === null
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Folders
            </button>
            {directories.slice(0, 5).map(dir => (
              <button
                key={dir}
                onClick={() => setSelectedDirectory(selectedDirectory === dir ? null : dir)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium truncate max-w-[110px] transition ${
                  selectedDirectory === dir
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={dir}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slide-out Architecture Health Drawer */}
      <HealthDrawer
        isOpen={isHealthDrawerOpen}
        onClose={() => setIsHealthDrawerOpen(false)}
        analysisData={analysisData}
        onHighlightCycle={handleHighlightCycle}
        onSelectNode={handleSelectNodeFromDrawer}
      />

      {/* Slide-out Code Inspector Drawer */}
      {isInspectorOpen && selectedNode && (
        <CodeInspectorDrawer
          node={selectedNode}
          onClose={() => {
            setIsInspectorOpen(false);
            setSelectedNode(null);
          }}
          onSelectNode={handleSelectNodeFromDrawer}
        />
      )}

      {/* AI Architectural Insights Modal */}
      <AIInsightsModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        insightsData={aiInsights}
      />
    </div>
  );
}
