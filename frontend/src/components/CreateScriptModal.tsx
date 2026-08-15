import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ScheduleType } from '../types';

interface CreateScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateScriptModal: React.FC<CreateScriptModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [scriptId, setScriptId] = useState('test_script');
  
  // Advanced Scheduling State
  const [scheduleType, setScheduleType] = useState<ScheduleType>('minutes');
  const [scheduleValue, setScheduleValue] = useState('60');
  
  // Format current date/time to local datetime-local format
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const [startTime, setStartTime] = useState(now.toISOString().slice(0, 16));
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Kérlek, adj meg egy nevet a szkriptnek!");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      await addDoc(collection(db, 'scripts_config'), {
        name: name.trim(),
        script_id: scriptId,
        status: 'OFF',
        schedule_type: scheduleType,
        schedule_value: parseInt(scheduleValue, 10) || 1,
        start_time: new Date(startTime).toISOString(),
        parameters: {}
      });
      
      // Reset form and close
      setName('');
      setScriptId('test_script');
      setScheduleType('minutes');
      setScheduleValue('60');
      
      const newTime = new Date();
      newTime.setMinutes(newTime.getMinutes() - newTime.getTimezoneOffset());
      setStartTime(newTime.toISOString().slice(0, 16));
      
      onClose();
      
    } catch (err: any) {
      console.error("Error creating script:", err);
      setError(err.message || "Hiba történt a mentés során.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-panel border border-panel-border rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              {/* Decorative top bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-brand-600 to-brand-400" />
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-brand-500" />
                    Új Szkript Hozzáadása
                  </h2>
                  <button 
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Szkript Neve (pl. Számla Figyelő)</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Saját elnevezés..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Szkript Típusa (ID)</label>
                    <select
                      value={scriptId}
                      onChange={(e) => setScriptId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="test_script">E-mail Szűrő (test_script)</option>
                      <option value="invoice_parser">Csatolmány Számla Olvasó (invoice_parser)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Kezdési Időpont</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      A szkript legkorábban ekkor fog először lefutni.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Gyakoriság</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={scheduleValue}
                        onChange={(e) => setScheduleValue(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
                      />
                      <select
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="minutes">Perc</option>
                        <option value="hours">Óra</option>
                        <option value="days">Nap</option>
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3 mt-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Mentés..." : (
                      <>
                        <Save className="w-5 h-5 mr-2" /> Mentés & Létrehozás
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
