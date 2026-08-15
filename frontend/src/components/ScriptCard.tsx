import { useState } from 'react';
import type { ScriptConfig, ScriptStatus, ScheduleType } from '../types';
import { db, functions } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RefreshCw, Settings, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Save, Search, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...args: (string | boolean | undefined | null)[]) => twMerge(clsx(args));

interface ScriptCardProps {
  script: ScriptConfig;
}

export const ScriptCard: React.FC<ScriptCardProps> = ({ script }) => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  // Invoice Parser UI State
  const [invoiceEmail, setInvoiceEmail] = useState(
    script.parameters?.sender_email || ""
  );
  const [invoiceRetroactive, setInvoiceRetroactive] = useState<boolean>(
    script.parameters?.retroactive || false
  );

  // Advanced Scheduling UI State
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    script.schedule_type || 'minutes'
  );
  const [scheduleValue, setScheduleValue] = useState<string>(
    String(script.schedule_value || 60)
  );
  const [startTime, setStartTime] = useState<string>(() => {
    if (script.start_time) {
      const d = new Date(script.start_time);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const scriptRef = doc(db, 'scripts_config', script.id);

  const handleStatusChange = async (newStatus: ScriptStatus) => {
    if (newStatus === 'ON') {
      // "Run Now": auto-save parameters first, then trigger
      setIsTriggering(true);
      setError(null);
      setSuccess(null);
      try {
        // 1. Save current params to Firestore before running
        if (script.script_id === 'test_script') {
          await updateDoc(scriptRef, {
            parameters: { name: filterName, email: filterEmail },
          });
        } else if (script.script_id === 'invoice_parser') {
          await updateDoc(scriptRef, {
            parameters: {
              sender_email: invoiceEmail,
              retroactive: invoiceRetroactive,
            },
          });
        }

        // 2. Trigger the script via Cloud Function
        const triggerScript = httpsCallable(functions, 'trigger_script');
        const result = await triggerScript({ doc_id: script.id });
        console.log("Trigger result:", result.data);
        setSuccess("Szkript sikeresen elindult!");
        setTimeout(() => setSuccess(null), 5000);
      } catch (err: any) {
        console.error("Error triggering script:", err);
        setError(err.message || "Hiba a szkript indításakor.");
      } finally {
        setIsTriggering(false);
      }
    } else {
      // Toggle AUTO / OFF
      try {
        await updateDoc(scriptRef, { status: newStatus });
      } catch (err: any) {
        setError(err.message || "Hiba a státusz frissítésekor.");
      }
    }
  };

  const handleDeleteScript = async () => {
    if (!window.confirm(`Biztosan törölni szeretnéd a "${script.name}" szkriptet? Ez a művelet nem visszafordítható.`)) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await deleteDoc(scriptRef);
      // The card will disappear automatically via onSnapshot
    } catch (err: any) {
      console.error("Error deleting script:", err);
      setError(err.message || "Hiba a szkript törlésekor.");
      setIsDeleting(false);
    }
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    setError(null);
    try {
      await updateDoc(scriptRef, {
        schedule_type: scheduleType,
        schedule_value: parseInt(scheduleValue, 10) || 1,
        start_time: new Date(startTime).toISOString(),
      });
      setSuccess("Ütemezés mentve!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Hiba a mentés során.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSaveParams = async () => {
    setIsSavingParams(true);
    setError(null);
    try {
      if (script.script_id === 'test_script') {
        await updateDoc(scriptRef, {
          parameters: { name: filterName, email: filterEmail },
        });
      } else if (script.script_id === 'invoice_parser') {
        await updateDoc(scriptRef, {
          parameters: {
            sender_email: invoiceEmail,
            retroactive: invoiceRetroactive,
          },
        });
      } else {
        const parsed = JSON.parse(paramText);
        await updateDoc(scriptRef, { parameters: parsed });
      }
      setSuccess("Beállítások mentve!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Hiba a mentés során. Ellenőrizd a JSON formátumot.");
    } finally {
      setIsSavingParams(false);
    }
  };

  const formatSchedule = () => {
    const val = script.schedule_value || 60;
    const type = script.schedule_type || 'minutes';
    const labels: Record<ScheduleType, string> = { minutes: 'percenként', hours: 'óránként', days: 'naponként' };
    return `Minden ${val} ${labels[type]}`;
  };

  const getStatusColor = (status: ScriptStatus) => {
    if (status === 'AUTO') return 'text-emerald-400';
    if (status === 'OFF') return 'text-slate-500';
    return 'text-brand-400';
  };

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

        {/* Status & Actions indicator */}
        <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Status dot */}
          <span
            title={`Státusz: ${script.status}`}
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              script.status === 'AUTO' ? "bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" : "bg-slate-600"
            )}
          />
          {/* Run Now Button */}
          <button
            onClick={() => handleStatusChange('ON')}
            disabled={isTriggering || isDeleting}
            title="Azonnali futtatás"
            className={cn(
              "p-2 rounded-lg transition-all shrink-0",
              isTriggering
                ? "bg-brand-900/50 text-brand-700 cursor-not-allowed"
                : "bg-brand-500/20 text-brand-400 hover:bg-brand-500 hover:text-white"
            )}
          >
            {isTriggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          {/* Delete Button */}
          <button
            onClick={handleDeleteScript}
            disabled={isDeleting || isTriggering}
            title="Szkript törlése"
            className={cn(
              "p-2 rounded-lg transition-all shrink-0",
              isDeleting
                ? "bg-red-900/50 text-red-700 cursor-not-allowed"
                : "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
            )}
          >
            {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-1">Státusz</p>
          <p className={cn("text-sm font-bold", getStatusColor(script.status))}>
            {script.status}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-1">Ütemezés</p>
          <p className="text-sm font-semibold text-white truncate">{formatSchedule()}</p>
        </div>
        {script.last_run && (
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 col-span-2">
            <p className="text-xs text-slate-500 mb-1">Utolsó futtatás</p>
            <p className="text-sm font-mono text-slate-300">
              {new Date(script.last_run.seconds * 1000).toLocaleString('hu-HU')}
            </p>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden space-y-6 relative z-10"
          >
            {/* Status Toggle */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Szkript Státusza</h4>
              <div className="flex bg-slate-800/80 rounded-xl p-1 border border-slate-700 w-full">
                <button
                  onClick={() => handleStatusChange('OFF')}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
                    script.status === 'OFF'
                      ? "bg-slate-700 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  OFF
                </button>
                <button
                  onClick={() => handleStatusChange('AUTO')}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
                    script.status === 'AUTO'
                      ? "bg-brand-600 text-white shadow-sm shadow-brand-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  AUTO (Ütemezett)
                </button>
              </div>
            </div>

            {/* Advanced Scheduling */}

            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                <Settings className="w-4 h-4 mr-2 text-brand-500" />
                Ütemezés Beállítása
              </h4>
              <div className="space-y-3 bg-slate-900/80 rounded-xl border border-slate-800 p-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Kezdési Időpont</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Ismétlési Intervallum</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={scheduleValue}
                      onChange={(e) => setScheduleValue(e.target.value)}
                      className="w-24 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                    <select
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                      className="flex-1 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors appearance-none"
                    >
                      <option value="minutes">Perc</option>
                      <option value="hours">Óra</option>
                      <option value="days">Nap</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {isSavingSchedule ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Ütemezés Mentése
                </button>
              </div>
            </div>

            {/* Script Parameters */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                <Search className="w-4 h-4 mr-2 text-brand-500" />
                Szkript Beállítások
              </h4>
              {script.script_id === 'test_script' ? (
                <div className="space-y-3 bg-slate-900/80 rounded-xl border border-slate-800 p-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Feladó Neve (Szűrő)</label>
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Pl. Kovács János"
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Feladó E-mail Címe (Szűrő)</label>
                    <input
                      type="email"
                      value={filterEmail}
                      onChange={(e) => setFilterEmail(e.target.value)}
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
              <button
                onClick={handleSaveParams}
                disabled={isSavingParams}
                className="w-full mt-2 py-2 bg-brand-600/80 hover:bg-brand-600 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {isSavingParams ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Beállítások Mentése
              </button>
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
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start relative z-10">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start relative z-10">
          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
          {success}
        </div>
      )}
    </motion.div>
  );
};
