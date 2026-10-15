import React from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ListOrdered,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export default function AIInsightsModal({
  isOpen,
  onClose,
  insightsData
}) {
  if (!isOpen || !insightsData) return null;

  const {
    verdict = "Analysis complete",
    insights = [],
    action_plan = []
  } = insightsData;

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[85vh] glass-panel-elevated rounded-2xl border border-white/10 flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-dark-950 shadow-glow">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Architecture Intelligence Report</h2>
              <p className="text-xs text-slate-400">Structured token-budgeted insights and refactoring roadmap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Executive Verdict Banner */}
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/30 bg-gradient-to-r from-dark-900 via-dark-850 to-cyan-950/20">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Executive Verdict
              </span>
            </div>
            <p className="text-sm text-slate-100 font-medium leading-relaxed">
              {verdict}
            </p>
          </div>

          {/* Section: Architectural Observations */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Architectural Findings ({insights.length})</span>
            </h3>

            <div className="space-y-3">
              {insights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl glass-panel border border-white/10 hover:border-white/20 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{item.title}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${getSeverityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                  {item.recommendation && (
                    <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-xs text-cyan-300">
                      <span className="font-semibold text-cyan-400 shrink-0">Remedy:</span>
                      <span>{item.recommendation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: Action Plan Roadmap */}
          {action_plan.length > 0 && (
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-2">
                <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recommended Refactoring Sequence</span>
              </h3>

              <div className="space-y-2.5">
                {action_plan.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl glass-panel border border-white/5 flex items-start gap-3 text-xs text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-dark-950 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
