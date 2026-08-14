import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';
import { ScriptConfig } from './types';
import { ScriptCard } from './components/ScriptCard';
import { Inbox, Settings, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  const [scripts, setScripts] = useState<ScriptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <header className="mb-12">
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
    </div>
  );
}

export default App;
