import { useState, useEffect } from 'react';
import type { ScriptConfig, ScriptStatus } from '../types';
import { db, functions } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RefreshCw, Settings, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Save, Search } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ScriptCardProps {
  script: ScriptConfig;
}

export const ScriptCard: React.FC<ScriptCardProps> = ({ script }) => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Expandable UI state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // JSON Parameters editor state (Fallback)
  const [paramText, setParamText] = useState("");
  const [isSavingParams, setIsSavingParams] = useState(false);

  // Email Filter UI State
  const [filterName, setFilterName] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // Invoice Parser UI State
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceRetroactive, setInvoiceRetroactive] = useState(false);

  // Keep local states in sync if they change externally
  useEffect(() => {
    setParamText(JSON.stringify(script.parameters || {}, null, 2));
    
    if (script.script_id === 'test_script') {
      setFilterName(script.parameters?.name || "");
      setFilterEmail(script.parameters?.email || "");
      setFilterSubject(script.parameters?.subject || "");
    } else if (script.script_id === 'invoice_parser') {
      setInvoiceEmail(script.parameters?.email || "");
      setInvoiceRetroactive(script.parameters?.retroactive || false);
    }
  }, [script.parameters, script.script_id]);

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
      setSuccess("Szkript sikeresen elindítva!");
      
      // Revert status to OFF or AUTO
      const scriptRef = doc(db, 'scripts_config', script.id);
      await updateDoc(scriptRef, { status: 'OFF' });
      
    } catch (err: any) {
      console.error("Error triggering script:", err);
      setError(err.message || "Failed to trigger script.");
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSaveParams = async () => {
    setIsSavingParams(true);
    setError(null);
    setSuccess(null);
    try {
      let newParams: any = {};
      
      if (script.script_id === 'test_script') {
        newParams = {
          name: filterName,
          email: filterEmail,
          subject: filterSubject
        };
      } else if (script.script_id === 'invoice_parser') {
        newParams = {
          email: invoiceEmail,
          retroactive: invoiceRetroactive
        };
      } else {
        newParams = JSON.parse(paramText);
      }

      const scriptRef = doc(db, 'scripts_config', script.id);
      await updateDoc(scriptRef, { parameters: newParams });
      setSuccess("Beállítások mentve!");
    } catch (err) {
      console.error("Invalid JSON:", err);
      setError("Érvénytelen formátum a beállításokban.");
    } finally {
      setIsSavingParams(false);
    }
  };

  const cn = (...inputs: (string | undefined | null | false)[]) => {
    return twMerge(clsx(inputs));
  };

  const lastRunStr = script.last_run ? new Date(script.last_run.seconds * 1000).toLocaleString() : 'Soha';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-panel border border-panel-border backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col"
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header Area (Clickable to expand) */}
      <div 
        className="flex justify-between items-start mb-4 relative z-10 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="flex items-center">
            <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-brand-400 transition-colors">{script.name}</h3>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 ml-2 text-slate-500 group-hover:text-brand-400" />
            ) : (
              <ChevronDown className="w-5 h-5 ml-2 text-slate-500 group-hover:text-brand-400" />
            )}
          </div>
          <p className="text-sm text-slate-400 font-mono mt-1">{script.script_id}</p>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
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
            <RefreshCw className="w-4 h-4 mr-2" /> Gyakoriság
          </div>
          <div className="text-white font-medium">{script.interval_minutes} perc</div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center text-slate-400 text-sm mb-1">
            <Settings className="w-4 h-4 mr-2" /> Utolsó futás
          </div>
          <div className="text-white font-medium text-sm">{lastRunStr}</div>
        </div>
      </div>

      {/* Expandable Content Area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden relative z-10 mb-6 flex flex-col space-y-6"
          >
            {/* Parameters Editor */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center">
                  <Search className="w-4 h-4 mr-2" /> 
                  {script.script_id === 'test_script' ? 'Szűrés' : 'Parameters (JSON)'}
                </h4>
                <button 
                  onClick={handleSaveParams}
                  disabled={isSavingParams}
                  className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Save className="w-3 h-3 mr-1.5" /> Mentés
                </button>
              </div>

              {script.script_id === 'test_script' ? (
                <div className="space-y-3 bg-slate-900/80 rounded-xl border border-slate-800 p-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Név (Opcionális)</label>
                    <input 
                      type="text" 
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Pl. Kovács János"
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">E-mail (Opcionális)</label>
                    <input 
                      type="email" 
                      value={filterEmail}
                      onChange={(e) => setFilterEmail(e.target.value)}
                      placeholder="Pl. janos@pelda.hu"
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Tárgy (Opcionális)</label>
                    <input 
                      type="text" 
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      placeholder="Pl. Számla"
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>
              ) : script.script_id === 'invoice_parser' ? (
                <div className="space-y-3 bg-slate-900/80 rounded-xl border border-slate-800 p-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Feladó E-mail Címe (Kötelező)</label>
                    <input 
                      type="email" 
                      value={invoiceEmail}
                      onChange={(e) => setInvoiceEmail(e.target.value)}
                      placeholder="Pl. penzugy@szolgaltato.hu"
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <input 
                      type="checkbox"
                      id={`retroactive-${script.id}`}
                      checked={invoiceRetroactive}
                      onChange={(e) => setInvoiceRetroactive(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950/50 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor={`retroactive-${script.id}`} className="text-xs font-medium text-slate-400 cursor-pointer">
                      Fail-Safe Mód: Visszamenőleges ellenőrzés (Utolsó 10 levélből)
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {invoiceRetroactive 
                      ? 'Bekapcsolva: Az utolsó 10 "számla" tárgyú levelet nézi végig, hogy bepótolja a hiányzókat.' 
                      : 'Kikapcsolva: Csak a legfrissebb számlát ellenőrzi a leggyorsabb működés érdekében.'}
                  </p>
                </div>
              ) : (
                <textarea
                  value={paramText}
                  onChange={(e) => setParamText(e.target.value)}
                  className="w-full bg-slate-900/80 rounded-xl border border-slate-700 p-4 font-mono text-xs text-brand-400 focus:outline-none focus:border-brand-500 transition-colors h-32 resize-y"
                  placeholder='{"key": "value"}'
                  spellCheck={false}
                />
              )}
            </div>

            {/* Output Log */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Utolsó Eredmény</h4>
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 font-mono text-xs text-emerald-400 min-h-24 whitespace-pre-wrap">
                {script.last_output || "Még nincs eredmény."}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start relative z-10">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start relative z-10">
          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => handleStatusChange('ON')}
        disabled={isTriggering}
        className={cn(
          "w-full py-3 rounded-xl font-medium flex items-center justify-center transition-all relative z-10 mt-auto",
          isTriggering 
            ? "bg-slate-800 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:opacity-90 shadow-lg shadow-brand-500/25"
        )}
      >
        {isTriggering ? (
          <>
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Feldolgozás...
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2 fill-current" />
            Keresés Indítása
          </>
        )}
      </button>
    </motion.div>
  );
};
