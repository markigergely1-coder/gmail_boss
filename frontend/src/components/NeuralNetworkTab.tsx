import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Brain, 
  Bot, 
  User, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Layers, 
  RefreshCw, 
  MessageSquare,
  Activity,
  Zap
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tag?: string;
  confidence?: number;
}

interface Intent {
  tag: string;
  patterns: string[];
  responses: string[];
}

interface TrainingStats {
  last_trained: string | null;
  last_loss: number | null;
  epochs: number;
  patterns_count: number;
  tags_count: number;
  vocab_size: number;
  duration_seconds?: number;
  loss_history: { epoch: number; loss: number }[];
}

export function NeuralNetworkTab() {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'studio'>('chat');
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [checkingServer, setCheckingServer] = useState<boolean>(true);

  // Chat állapot
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      text: 'Üdvözöllek! Én a Gmail Boss lokális neurális háló asszisztense vagyok. Kérdezz bátran az alkalmazás funkcióiról vagy a modulokról!',
      tag: 'greeting',
      confidence: 100
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Studio állapot
  const [intents, setIntents] = useState<Intent[]>([]);
  const [stats, setStats] = useState<TrainingStats>({
    last_trained: null,
    last_loss: null,
    epochs: 1000,
    patterns_count: 0,
    tags_count: 0,
    vocab_size: 0,
    loss_history: []
  });
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainSuccessMessage, setTrainSuccessMessage] = useState<string | null>(null);

  // Új intent form
  const [newTag, setNewTag] = useState('');
  const [newPatterns, setNewPatterns] = useState('');
  const [newResponses, setNewResponses] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Szerver státusz és adatok lekérdezése
  const fetchStatusAndData = async () => {
    try {
      setCheckingServer(true);
      const res = await fetch('http://localhost:8000/status');
      if (res.ok) {
        const data = await res.json();
        setServerOnline(true);
        if (data.training_stats) {
          setStats(data.training_stats);
        }
      } else {
        setServerOnline(false);
      }
    } catch {
      setServerOnline(false);
    } finally {
      setCheckingServer(false);
    }

    // Intents betöltése
    try {
      const res = await fetch('http://localhost:8000/intents');
      if (res.ok) {
        const data = await res.json();
        if (data.intents) {
          setIntents(data.intents);
        }
      }
    } catch (e) {
      console.warn("Intents lekérdezés hiba:", e);
    }
  };

  useEffect(() => {
    fetchStatusAndData();
    const interval = setInterval(fetchStatusAndData, 10000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Üzenet küldés
  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text })
      });
      
      if (!response.ok) {
        throw new Error('Szerver válaszhiba!');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply,
        tag: data.tag,
        confidence: data.confidence
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Sajnos nem tudtam kapcsolódni a lokális agyamhoz. Futtatod a háttérben a 'server.py'-t a local_ai mappában?",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Modell újratanítása gomb
  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainSuccessMessage(null);
    try {
      const res = await fetch('http://localhost:8000/train', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Hiba a tanítás során!');
      }
      const data = await res.json();
      setTrainSuccessMessage(data.message || 'Sikeres betanítás!');
      if (data.stats) {
        setStats(data.stats);
      }
      await fetchStatusAndData();
    } catch (e: any) {
      alert(`Hiba a tanítás során: ${e.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  // Új intent mentése
  const handleAddIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const tagTrim = newTag.trim().toLowerCase().replace(/\s+/g, '_');
    const patternList = newPatterns
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    const responseList = newResponses
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    if (!tagTrim) {
      setFormError('Kérlek adj meg egy kategória nevet (tag)!');
      return;
    }
    if (patternList.length === 0) {
      setFormError('Adj meg legalább 1 kérdés/minta mondatot!');
      return;
    }
    if (responseList.length === 0) {
      setFormError('Adj meg legalább 1 választ!');
      return;
    }

    const updatedIntents = [...intents.filter(i => i.tag !== tagTrim), {
      tag: tagTrim,
      patterns: patternList,
      responses: responseList
    }];

    try {
      const res = await fetch('http://localhost:8000/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intents: updatedIntents })
      });
      if (!res.ok) throw new Error('Mentés sikertelen!');
      
      setIntents(updatedIntents);
      setNewTag('');
      setNewPatterns('');
      setNewResponses('');
      setTrainSuccessMessage(`"${tagTrim}" kategória sikeresen hozzáadva! Kattints a "Modell Újratanítása" gombra az érvényesítéshez.`);
    } catch (err: any) {
      setFormError(`Mentési hiba: ${err.message}`);
    }
  };

  // Intent törlése
  const handleDeleteIntent = async (tagToDelete: string) => {
    if (!confirm(`Biztosan törölni szeretnéd a "${tagToDelete}" szándékot?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/intents/${tagToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        setIntents(prev => prev.filter(i => i.tag !== tagToDelete));
      }
    } catch (e) {
      console.error("Törlési hiba:", e);
    }
  };

  return (
    <div className="flex flex-col min-h-[750px] bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Fejléc */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Neurális Háló Labor
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> PyTorch Engine
              </span>
            </div>
            <p className="text-slate-400 text-xs md:text-sm">
              Saját mély tanulási asszisztens és valós idejű tanító környezet
            </p>
          </div>
        </div>

        {/* Tab váltó gombok és szerver állapot */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Szerver státusz badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            serverOnline 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{checkingServer ? 'Ellenőrzés...' : serverOnline ? 'Agy Online (Port: 8000)' : 'Agy Offline (server.py)'}</span>
          </div>

          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'chat'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Csevegő</span>
            </button>
            <button
              onClick={() => setActiveSubTab('studio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'studio'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Tanító Stúdió</span>
            </button>
          </div>
        </div>
      </div>

      {/* TARTALOM: Csevegő VAGY Tanító Stúdió */}
      {activeSubTab === 'chat' ? (
        /* =================== CSEVEGŐ NÉZET =================== */
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Üzenetlista */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[560px]">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  
                  <div className={`max-w-[82%] rounded-2xl p-4 shadow-sm space-y-2 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-sm'
                  }`}>
                    <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Neurális háló konfidencia és tag jelvény */}
                    {msg.role === 'assistant' && msg.tag && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50 text-[11px] text-slate-400">
                        <span className="font-mono text-purple-300">#{msg.tag}</span>
                        {msg.confidence !== undefined && (
                          <span className="font-mono bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">
                            {msg.confidence}% pontosság
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-4 flex gap-2 items-center">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-purple-400 rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-purple-400 rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-purple-400 rounded-full" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Gyors kérdés sablonok */}
          <div className="px-6 py-2 border-t border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-500 font-semibold shrink-0">Gyors kérdések:</span>
            {[
              "Mit tud a számlafeldolgozó?",
              "Hogyan működik a CV Szabó?",
              "Mi az a Matek Tab?",
              "Hogyan taníthatlak meg új dolgokra?"
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="shrink-0 px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Üzenet író mező */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Kérdezz a bot agyától bármit a rendszerről..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500 text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/25 cursor-pointer text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Küldés</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* =================== TANÍTÓ STÚDIÓ NÉZET =================== */
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[700px]">
          {/* Műszerfal kártyák (Metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Szándékok (Tags)
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {stats.tags_count || intents.length}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Mintamondatok
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {stats.patterns_count || intents.reduce((acc, i) => acc + i.patterns.length, 0)}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Szótár mérete
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {stats.vocab_size} szótő
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Legutóbbi Hiba (Loss)
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                {stats.last_loss !== null ? stats.last_loss.toFixed(4) : '0.0001'}
              </div>
            </div>
          </div>

          {/* Újratanítási sáv és cselekvés gomb */}
          <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/60 border border-purple-500/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Modell Újratanítása (PyTorch 1000 Epoch)
              </h3>
              <p className="text-xs text-slate-300 max-w-xl mt-1">
                Ha új szándékokat vagy mintamondatokat rögzítesz az adatbázisban, kattints ide. A rendszer azonnal újratanítja a hálózatot és betölti az új agyat a memóriába!
              </p>
              {stats.last_trained && (
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Utolsó tanítás ideje: {stats.last_trained} ({stats.duration_seconds ? `${stats.duration_seconds} mp` : ''})
                </div>
              )}
            </div>

            <button
              onClick={handleTrainModel}
              disabled={isTraining || !serverOnline}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/25 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Hálózat tanítása folyamatban...' : 'Modell Újratanítása'}</span>
            </button>
          </div>

          {/* Siker üzenet */}
          {trainSuccessMessage && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{trainSuccessMessage}</span>
            </motion.div>
          )}

          {/* Élő Tanulási Görbe (Loss Curve SVG) */}
          {stats.loss_history && stats.loss_history.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-white">Tanulási Hiba Görbe (Loss Convergence)</h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">1000 Epoch lefutása</span>
              </div>

              {/* Loss Curve SVG */}
              <div className="relative h-32 w-full pt-2">
                <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Vízszintes tengelyek */}
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#334155" strokeWidth="1" />
                  <line x1="0" y1="10" x2="500" y2="10" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Görbe kirajzolása */}
                  {(() => {
                    const maxLoss = Math.max(...stats.loss_history.map(h => h.loss), 1.0);
                    const pts = stats.loss_history.map((pt, i) => {
                      const x = (i / (stats.loss_history.length - 1)) * 500;
                      const y = 90 - (pt.loss / maxLoss) * 80;
                      return { x, y };
                    });

                    const pathD = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
                    const fillD = `${pathD} L 500 90 L 0 90 Z`;

                    return (
                      <>
                        <path d={fillD} fill="url(#lossGrad)" />
                        <path d={pathD} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" />
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Kezdeti Loss: {stats.loss_history[0]?.loss}</span>
                <span>Végleges Loss: {stats.loss_history[stats.loss_history.length - 1]?.loss} ✓</span>
              </div>
            </div>
          )}

          {/* Új Kategória (Intent) hozzáadása űrlap */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              <h4 className="text-base font-bold text-white">Új Szándék / Téma Hozzáadása</h4>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddIntent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategória azonosító (Tag név, pl: rendeles_statusz, idojaras, projekt_leiras):
                </label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="pl: projekt_help"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mintamondatok (Soronként 1 kérdés/minta):
                  </label>
                  <textarea
                    rows={4}
                    value={newPatterns}
                    onChange={(e) => setNewPatterns(e.target.value)}
                    placeholder={"Hogyan működik a projekt?\nMit csinál ez a felület?\nMesélj a rendszerről"}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Válaszok (Soronként 1 lehetséges válasz):
                  </label>
                  <textarea
                    rows={4}
                    value={newResponses}
                    onChange={(e) => setNewResponses(e.target.value)}
                    placeholder={"Ez a Gmail Boss rendszer, ami automatizációkat végez.\nA projekt egy szervermentes platform."}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 cursor-pointer"
              >
                + Kategória Mentése az Adatbázisba
              </button>
            </form>
          </div>

          {/* Meglévő szándékok listája (Intents Explorer) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Jelenleg betanított szándékok ({intents.length} db):</span>
              <span className="text-xs text-slate-400 font-normal">Kattints a törléshez, ha felesleges</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {intents.map((intent) => (
                <div key={intent.tag} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950/40 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                        #{intent.tag}
                      </span>
                      <button
                        onClick={() => handleDeleteIntent(intent.tag)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Törlés"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-slate-300">
                      <div className="text-[11px] text-slate-500 font-semibold mb-1">Minták ({intent.patterns.length}):</div>
                      <p className="line-clamp-2 italic text-slate-400">
                        "{intent.patterns.slice(0, 3).join('", "')}"
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <span className="text-slate-500 font-semibold">Válaszok száma: </span>
                    <span className="font-mono text-slate-300">{intent.responses.length} db</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
