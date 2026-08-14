import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';
import type { ScriptConfig } from './types';
import { ScriptCard } from './components/ScriptCard';
import { CreateScriptModal } from './components/CreateScriptModal';
import { Inbox, Settings, Activity, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  const [scripts, setScripts] = useState<ScriptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'scripts_config'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedScripts: ScriptConfig[] = [];
        snapshot.forEach((doc) => {
          fetchedScripts.push({
            id: doc.id,
            ...doc.data()
          } as ScriptConfig);
        });
        setScripts(fetchedScripts);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-4 mb-2"
          >
            <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Inbox className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Gmail Boss</h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg ml-16"
          >
            Serverless Email Automation Engine
          </motion.p>
        </div>
        
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/20 flex items-center transition-all self-start md:self-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Új Szkript Hozzáadása
        </motion.button>
      </header>

      {/* Main Content */}
      <main>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Activity className="w-8 h-8 text-brand-500 animate-pulse" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl">
            Error loading scripts: {error}
          </div>
        ) : scripts.length === 0 ? (
          <div className="bg-panel border border-panel-border p-12 rounded-2xl text-center backdrop-blur-md">
            <Settings className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No scripts found</h3>
            <p className="text-slate-400">Create a document in the scripts_config Firestore collection to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {scripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        )}
      </main>

      <CreateScriptModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

export default App;
