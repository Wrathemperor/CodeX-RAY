import React, { useEffect, useState } from 'react';
import { History, X, Trash2, RotateCcw, FolderOpen, Loader2, RefreshCw } from 'lucide-react';

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const GRADE_STYLE = {
  A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  B: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  C: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  D: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

export default function ScanHistoryDrawer({ isOpen, onClose, onLoadScan }) {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [restoring, setRestore] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/history');
      const data = await res.json();
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) fetchHistory(); }, [isOpen]);

  const handleLoad = async (id) => {
    setRestore(id);
    try {
      const res  = await fetch(`/api/history/${id}`);
      const data = await res.json();
      if (data.status === 'restored') {
        await onLoadScan();   // triggers loadAllArtifacts in App
        onClose();
      }
    } finally {
      setRestore(null);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    setRecords(r => r.filter(x => x.id !== id));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      )}

      {/* Slide-out panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 z-50 flex flex-col glass-panel-elevated border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Scan History</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              className="text-slate-500 hover:text-slate-200 transition"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <History className="w-8 h-8 text-slate-700 mb-3" />
              <p className="text-xs text-slate-500">No scan history yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Scans are saved automatically after completion.</p>
            </div>
          )}

          {!loading && records.map(rec => (
            <div
              key={rec.id}
              className="group rounded-xl border border-white/8 bg-dark-900/50 hover:bg-dark-900/80 hover:border-white/15 transition p-3 cursor-pointer"
              onClick={() => handleLoad(rec.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200 truncate">{rec.name}</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 truncate pl-5">{rec.path}</p>
                </div>

                {/* Grade badge */}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border font-mono shrink-0 ${GRADE_STYLE[rec.grade] || 'text-slate-400 bg-slate-800 border-slate-600'}`}>
                  {rec.grade || '?'}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 mt-2 pl-5 text-[11px] font-mono">
                <span className="text-slate-500">
                  Score: <span className="text-white font-semibold">{rec.health_score ?? '—'}</span>
                </span>
                <span className="text-slate-500">
                  Files: <span className="text-cyan-400 font-semibold">{rec.file_count ?? '—'}</span>
                </span>
                <span className="text-slate-600 ml-auto">{timeAgo(rec.scanned_at)}</span>
              </div>

              {/* Actions (reveal on hover) */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/6">
                <button
                  onClick={e => { e.stopPropagation(); handleLoad(rec.id); }}
                  disabled={restoring === rec.id}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition font-medium"
                >
                  {restoring === rec.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <RotateCcw className="w-3 h-3" />
                  }
                  Load
                </button>
                <button
                  onClick={e => handleDelete(rec.id, e)}
                  className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-rose-400 transition"
                  title="Delete record"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-[10px] text-slate-600 font-mono text-center">
            History stored in ~/.codexray/history.db
          </p>
        </div>
      </aside>
    </>
  );
}
