import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, ScanLine, X, CheckCircle2, AlertCircle, Loader2, Clock, FolderSearch } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ScanRepoModal({ isOpen, onClose, onTriggerScan, recentHistory = [] }) {
  const { currentUser } = useAuth();
  const [path, setPath]         = useState('');
  const [validation, setVal]    = useState(null);   // null | { valid, message, file_count_estimate }
  const [checking, setChecking] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage]   = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setPath(''); setVal(null); setScanning(false); setProgress(0);
    }
  }, [isOpen]);

  /* Live path validation with 600ms debounce */
  useEffect(() => {
    if (!path.trim()) { setVal(null); return; }
    clearTimeout(debounceRef.current);
    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const headers = currentUser?.email ? { 'X-User-Email': currentUser.email } : {};
        const res  = await fetch(`/api/validate-path?path=${encodeURIComponent(path.trim())}`, { headers });
        const data = await res.json();
        setVal(data);
      } catch {
        setVal({ valid: false, message: 'Network error' });
      } finally {
        setChecking(false);
      }
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [path, currentUser]);

  const handleBrowseFolder = async () => {
    setBrowsing(true);
    try {
      const headers = currentUser?.email ? { 'X-User-Email': currentUser.email } : {};
      const res = await fetch('/api/browse-directory', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        setVal({ valid: false, message: data.detail || 'Could not select folder' });
        return;
      }
      if (!data.cancelled && data.path) {
        setPath(data.path);
      }
    } catch (e) {
      setVal({ valid: false, message: e.message || 'Error opening folder picker' });
    } finally {
      setBrowsing(false);
    }
  };

  const handleScan = async (scanPath) => {
    const target = scanPath || path.trim();
    if (!target) return;
    setScanning(true); setProgress(5); setMessage('Starting scan…');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentUser?.email) headers['X-User-Email'] = currentUser.email;

      const res  = await fetch('/api/scan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: target, force: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.detail || 'Scan request failed'}`);
        setScanning(false);
        return;
      }

      if (data.job_id === 'cached') {
        setProgress(100); setMessage('Loaded from cache');
        setTimeout(() => { onTriggerScan(target, false); onClose(); }, 600);
        return;
      }

      const jobId = data.job_id;
      const poll = setInterval(async () => {
        const pr  = await fetch(`/api/scan/status/${jobId}`);
        const pd  = await pr.json();
        setProgress(pd.progress || 20);
        setMessage(pd.message  || 'Scanning…');
        if (pd.status === 'completed') {
          clearInterval(poll);
          setTimeout(() => { onTriggerScan(target, false); onClose(); }, 400);
        } else if (pd.status === 'failed') {
          clearInterval(poll);
          setMessage(`❌ ${pd.error}`);
          setScanning(false);
        }
      }, 500);
    } catch (e) {
      setMessage(`Error: ${e.message}`);
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl glass-panel-elevated border border-white/12 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Scan Repository</h2>
              <p className="text-[11px] text-slate-400">Analyse any folder on your machine</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Path Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Absolute Folder Path
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderOpen className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={path}
                  onChange={e => setPath(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && validation?.valid) handleScan(); }}
                  placeholder="e.g. C:\Users\you\projects\my-app"
                  disabled={scanning || browsing}
                  className="w-full pl-9 pr-4 py-2.5 text-sm font-mono rounded-lg bg-dark-900/80 border border-white/10 text-slate-100 placeholder-slate-600 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 outline-none transition disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                onClick={handleBrowseFolder}
                disabled={scanning || browsing}
                className="px-3.5 py-2.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 hover:text-cyan-200 transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                title="Browse device for directory"
              >
                {browsing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                ) : (
                  <FolderSearch className="w-4 h-4 text-cyan-400" />
                )}
                <span>Browse</span>
              </button>
            </div>

            {/* Validation feedback */}
            <div className="mt-2 min-h-[20px]">
              {checking && (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking path…
                </span>
              )}
              {!checking && validation && (
                <span className={`flex items-center gap-1.5 text-[11px] font-medium ${validation.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {validation.valid
                    ? <><CheckCircle2 className="w-3 h-3" /> {validation.message}</>
                    : <><AlertCircle  className="w-3 h-3" /> {validation.message}</>
                  }
                </span>
              )}
            </div>
          </div>

          {/* Scan Progress */}
          {scanning && (
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>{message}</span>
                <span className="text-cyan-400">{progress}%</span>
              </div>
              <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Recent History Quick-Pick */}
          {recentHistory.length > 0 && !scanning && (
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Recent scans
              </p>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {recentHistory.slice(0, 5).map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleScan(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-dark-900/60 border border-white/6 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 transition" />
                      <span className="text-xs text-slate-300 font-medium truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        item.grade === 'A' ? 'text-emerald-400 bg-emerald-500/10' :
                        item.grade === 'B' ? 'text-cyan-400 bg-cyan-500/10' :
                        item.grade === 'C' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                      }`}>
                        {item.grade}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-600 font-mono">
            Tip: Press Enter to scan after path is validated
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => handleScan()}
              disabled={!validation?.valid || scanning}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-dark-950 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
              {scanning ? 'Scanning…' : 'Scan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
