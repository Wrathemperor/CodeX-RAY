import React, { useState, useEffect } from 'react';
import {
  X,
  FileCode2,
  Code2,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CodeInspectorDrawer({
  node,
  onClose,
  onSelectNode,
  onBlastRadius,
}) {
  const { currentUser } = useAuth();
  const [fileDetails, setFileDetails] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [fileInsight, setFileInsight] = useState(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('symbols'); // 'symbols' | 'code' | 'ai'

  useEffect(() => {
    if (!node) return;
    setFileInsight(null);
    setIsLoadingFile(true);
    setIsRestricted(false);

    const headers = currentUser?.email ? { 'X-User-Email': currentUser.email } : {};

    fetch(`/api/file?path=${encodeURIComponent(node.id)}`, { headers })
      .then(async res => {
        if (res.status === 403) {
          setIsRestricted(true);
          setIsLoadingFile(false);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setFileDetails(data);
        setIsLoadingFile(false);
      })
      .catch(err => {
        console.error("Failed to fetch file content", err);
        setIsLoadingFile(false);
      });
  }, [node, currentUser]);

  const handleFetchInsight = () => {
    if (!node) return;
    setIsLoadingInsight(true);
    fetch('/api/ai/file-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: node.id })
    })
      .then(res => res.json())
      .then(data => {
        setFileInsight(data);
        setIsLoadingInsight(false);
        setActiveTab('ai');
      })
      .catch(err => {
        console.error("Failed to fetch file insight", err);
        setIsLoadingInsight(false);
      });
  };

  const handleCopyCode = () => {
    if (fileDetails?.content) {
      navigator.clipboard.writeText(fileDetails.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!node) return null;

  const meta = fileDetails?.meta || {};
  const classes = meta.classes || [];
  const functions = meta.functions || [];
  const exportsList = meta.exports || [];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl glass-panel-elevated border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div className="max-w-[340px]">
            <h2 className="text-base font-bold text-white truncate">{node.name}</h2>
            <p className="text-xs text-slate-400 font-mono truncate">{node.id}</p>
          </div>
        </div>
        {/* Blast Radius Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBlastRadius && onBlastRadius(node)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/60 transition"
            title="Compute blast radius — all files impacted if this one changes"
          >
            <Zap className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
            Blast Radius
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 border-b border-white/10 flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('symbols')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'symbols'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Symbols & Dependencies
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'code'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Source Code ({fileDetails?.loc || node.loc || 0} LOC)
        </button>
        <button
          onClick={() => {
            setActiveTab('ai');
            if (!fileInsight) handleFetchInsight();
          }}
          className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'ai'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Audit</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === 'symbols' && (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl glass-panel text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Lines</span>
                <span className="text-base font-bold text-white font-mono">{fileDetails?.loc || node.loc}</span>
              </div>
              <div className="p-3 rounded-xl glass-panel text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">In-Degree</span>
                <span className="text-base font-bold text-emerald-400 font-mono">{node.in_degree || 0}</span>
              </div>
              <div className="p-3 rounded-xl glass-panel text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Out-Degree</span>
                <span className="text-base font-bold text-indigo-400 font-mono">{node.out_degree || 0}</span>
              </div>
              <div className="p-3 rounded-xl glass-panel text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Cycles</span>
                <span className={`text-base font-bold font-mono ${node.in_cycle ? 'text-rose-400' : 'text-slate-500'}`}>
                  {node.in_cycle ? 'YES' : 'NONE'}
                </span>
              </div>
            </div>

            {/* AST Extracted Symbols */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-cyan-400" />
                <span>Extracted AST Symbols</span>
              </h3>

              {classes.length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Classes ({classes.length})</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {classes.map((cls, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                        class <strong>{cls}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {functions.length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Functions ({functions.length})</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {functions.map((fn, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                        {fn}()
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exportsList.length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Exports ({exportsList.length})</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {exportsList.map((exp, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                        export {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {classes.length === 0 && functions.length === 0 && exportsList.length === 0 && (
                <div className="p-3 rounded-xl glass-panel text-xs text-slate-500">
                  No top-level class or function symbols detected.
                </div>
              )}
            </div>

            {/* AI Quick Insight Teaser */}
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20 bg-gradient-to-r from-dark-900 to-cyan-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Targeted Architectural Audit
                </span>
                <button
                  onClick={handleFetchInsight}
                  disabled={isLoadingInsight}
                  className="px-2.5 py-1 text-xs font-medium bg-cyan-500 hover:bg-cyan-400 text-dark-950 rounded-lg transition"
                >
                  {isLoadingInsight ? 'Auditing...' : 'Run Audit'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Generate token-efficient analysis on blast radius, coupling, and refactoring recommendations for this file.
              </p>
            </div>
          </>
        )}

        {activeTab === 'code' && (
          <div className="relative">
            {isRestricted ? (
              <div className="p-8 rounded-xl glass-panel border border-amber-500/20 bg-amber-950/10 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-white">Source Code Protected</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Access to CodeX-RAY application core source code is restricted to administrators.
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-dark-900 border border-white/10 hover:border-white/30 text-slate-300 hover:text-white transition"
                  title="Copy code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {isLoadingFile ? (
                  <div className="p-8 text-center text-xs text-slate-500">Loading code...</div>
                ) : (
                  <pre className="p-4 rounded-xl glass-panel font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed border border-white/5 max-h-[550px]">
                    <code>{fileDetails?.content || "// Empty file"}</code>
                  </pre>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div>
            {isLoadingInsight ? (
              <div className="p-12 text-center text-xs text-cyan-400 space-y-2">
                <div className="inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p>Generating architectural audit...</p>
              </div>
            ) : fileInsight ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl glass-panel border border-white/10">
                  <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Architectural Role</span>
                  <div className="text-sm font-semibold text-white">{fileInsight.role}</div>
                </div>

                <div className="p-4 rounded-xl glass-panel border border-amber-500/20 bg-amber-950/10">
                  <span className="text-[11px] font-mono uppercase text-amber-400 block mb-1">Blast Radius Impact</span>
                  <div className="text-xs text-slate-200">{fileInsight.blast_radius}</div>
                </div>

                <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
                  <span className="text-[11px] font-mono uppercase text-cyan-400 block mb-2">Recommended Actions</span>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {fileInsight.refactoring_suggestions?.map((sug, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Click "Run Audit" to inspect this file's architectural boundaries.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
