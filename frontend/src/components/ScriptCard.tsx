import { useState } from 'react';
import type { ScriptConfig, ScriptStatus } from '../types';
import { db, functions } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ScriptCardProps {
  script: ScriptConfig;
}

export const ScriptCard: React.FC<ScriptCardProps> = ({ script }) => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: ScriptStatus) => {
    try {
      const scriptRef = doc(db, 'scripts_config', script.id);
      await updateDoc(scriptRef, { status: newStatus });
      
      // If user sets to ON, automatically trigger the function
      if (newStatus === 'ON') {
        handleTriggerScript();
      }
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status.");
    }
  };

  const handleTriggerScript = async () => {
    setIsTriggering(true);
    setError(null);
    setSuccess(null);
    try {
      const triggerScript = httpsCallable(functions, 'trigger_script');
      await triggerScript({ doc_id: script.id });
      setSuccess("Script triggered successfully!");
      
      // After manual trigger, revert status to OFF or AUTO to prevent infinite looping
      // Let's set it back to OFF for safety
      const scriptRef = doc(db, 'scripts_config', script.id);
      await updateDoc(scriptRef, { status: 'OFF' });
      
    } catch (err: any) {
      console.error("Error triggering script:", err);
      setError(err.message || "Failed to trigger script.");
    } finally {
      setIsTriggering(false);
    }
  };

  const cn = (...inputs: (string | undefined | null | false)[]) => {
    return twMerge(clsx(inputs));
  };

  const lastRunStr = script.last_run ? new Date(script.last_run.seconds * 1000).toLocaleString() : 'Never';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-panel border border-panel-border backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden"
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">{script.name}</h3>
          <p className="text-sm text-slate-400 font-mono mt-1">{script.script_id}</p>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
          <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => handleStatusChange('OFF')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                script.status === 'OFF' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              OFF
            </button>
            <button
              onClick={() => handleStatusChange('AUTO')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                script.status === 'AUTO' ? "bg-brand-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              AUTO
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center text-slate-400 text-sm mb-1">
            <RefreshCw className="w-4 h-4 mr-2" /> Interval
          </div>
          <div className="text-white font-medium">{script.interval_minutes} mins</div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center text-slate-400 text-sm mb-1">
            <Settings className="w-4 h-4 mr-2" /> Last Run
          </div>
          <div className="text-white font-medium text-sm">{lastRunStr}</div>
        </div>
      </div>

      {/* Parameters */}
      <div className="mb-6 relative z-10">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Parameters</h4>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 font-mono text-xs text-brand-500 overflow-x-auto">
          {JSON.stringify(script.parameters, null, 2)}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start">
          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => handleStatusChange('ON')}
        disabled={isTriggering}
        className={cn(
          "w-full py-3 rounded-xl font-medium flex items-center justify-center transition-all relative z-10",
          isTriggering 
            ? "bg-slate-800 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:opacity-90 shadow-lg shadow-brand-500/25"
        )}
      >
        {isTriggering ? (
          <>
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2 fill-current" />
            Run Now
          </>
        )}
      </button>
    </motion.div>
  );
};
