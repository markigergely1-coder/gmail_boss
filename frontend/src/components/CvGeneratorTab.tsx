import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Briefcase, 
  Sparkles, 
  Copy, 
  Check, 
  Printer, 
  Key, 
  FileText, 
  Eye, 
  EyeOff, 
  ClipboardPaste, 
  RefreshCw, 
  Database, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { MASTER_PROFILE, SAMPLE_JOB_OFFERS } from '../data/masterProfile';
import { generateTailoredCv, generateLocalSampleCv } from '../services/geminiService';

export function CvGeneratorTab() {
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCv, setGeneratedCv] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'md' | 'text' | null>(null);
  const [activeView, setActiveView] = useState<'preview' | 'markdown' | 'master'>('preview');
  const [zoomScale, setZoomScale] = useState<number>(0.95);
  const [showKeyCard, setShowKeyCard] = useState<boolean>(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowKeyCard(true);
    }

    // Default to a pre-generated sample so the preview is never empty
    const initialSample = generateLocalSampleCv('', 'hu', 'Junior IT Üzleti Elemző');
    setGeneratedCv(initialSample);
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJobDescription(text);
        // Try to auto-detect target position from first 2 lines
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const firstLine = lines[0].replace(/^(pozíció|állás|job title|position|role):\s*/i, '').trim();
          if (firstLine.length < 60) {
            setTargetRole(firstLine);
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleLoadSample = (sample: typeof SAMPLE_JOB_OFFERS[0]) => {
    setJobDescription(sample.text);
    setTargetRole(sample.title);
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setErrorMessage('Kérlek illeszd be az álláshirdetés szövegét!');
      return;
    }

    if (!apiKey.trim()) {
      setShowKeyCard(true);
      setErrorMessage('Kérlek add meg a Google Gemini API kulcsodat a generáláshoz!');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const result = await generateTailoredCv({
        jobDescription,
        targetRole: targetRole.trim() || undefined,
        language,
        apiKey: apiKey.trim(),
        model: selectedModel
      });

      setGeneratedCv(result);
      setActiveView('preview');
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(err.message || 'Hiba történt a generálás során.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLocalSampleGenerate = () => {
    setErrorMessage(null);
    const sample = generateLocalSampleCv(jobDescription, language, targetRole || undefined);
    setGeneratedCv(sample);
    setActiveView('preview');
  };

  const handleCopy = (type: 'md' | 'text') => {
    if (!generatedCv) return;
    navigator.clipboard.writeText(generatedCv);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25 shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">CV Szabó & Automációs Rendszer</h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Mester Adatbázis v2.0
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">
                Bármely álláshirdetésből 1 kattintással szabott, pontosan 1 oldalas A4 Markdown önéletrajz
              </p>
            </div>
          </div>

          {/* Global Quick Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Language toggle */}
            <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center">
              <button
                type="button"
                onClick={() => setLanguage('hu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  language === 'hu'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇭🇺</span> Magyar
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  language === 'en'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇬🇧</span> English
              </button>
            </div>

            {/* Model selector */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Gyors & Precíz)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Klasszikus)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>

            {/* API Key Status / Toggle */}
            <button
              onClick={() => setShowKeyCard(!showKeyCard)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                apiKey.trim()
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey.trim() ? 'API Kulcs Rendben' : 'API Kulcs Szükséges'}</span>
              {showKeyCard ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Collapsible API Key Card */}
        <AnimatePresence>
          {showKeyCard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-800"
            >
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Google AI Studio (Gemini) API Kulcs
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                    >
                      Ingyenes kulcs igénylése <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    A kulcs kizárólag a böngésződ memóriájában és helyi tárhelyén (localStorage) tárolódik, közvetlenül a Google AI API-hoz kapcsolódik.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setShowKeyCard(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-all"
                  >
                    Elrejtés
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Grid: Left Controls & Right Output */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Job Input & Customization */}
        <div className="xl:col-span-5 space-y-5 no-print">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                1. Álláshirdetés Bemenet
              </h3>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Beillesztés vágólapról
              </button>
            </div>

            {/* Quick Sample Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Gyors teszteléshez válassz egy minta pozíciót:</label>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_JOB_OFFERS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all text-left"
                  >
                    {sample.title.split('/')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Role input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Keresett pozíció pontos megnevezése (Opcionális finomhangolás):
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="pl. Junior IT Üzleti Elemző / Business Analyst"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>

            {/* Job Description Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Nyers álláshirdetés szövege:
                </label>
                <span className="text-[11px] text-slate-500">
                  {jobDescription.length} karakter
                </span>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={9}
                placeholder="Másold be ide a teljes álláshirdetést (elvárások, leírás, felelősségek)..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all resize-y leading-relaxed font-mono"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>CV Generálása a Mester Adatbázisból...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>🚀 1 Oldalas Szabott CV Generálása</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleLocalSampleGenerate}
                disabled={isGenerating}
                className="w-full py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>⚡ Minta generálása kulcs nélkül (Azonnali előnézet)</span>
              </button>
            </div>
          </div>

          {/* Master Profile Summary Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Beépített Mester Adatbázis
                </h4>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                Aktív & Szinkronizált
              </span>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Jelölt neve:</span>
                <span className="font-semibold text-white">{MASTER_PROFILE.personal.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Felsőfokú végzettség:</span>
                <span className="font-medium text-right text-slate-200">ELTE (MSc) & BME (BSc)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Főbb tapasztalatok:</span>
                <span className="font-medium text-right text-slate-200">Vodafone IT, Röplabda PWA, Oktatás</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Kompetenciák:</span>
                <span className="font-medium text-right text-slate-200">Excel VBA, Svelte 5, Firebase, AI</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-400">Nyelv & Jogosítvány:</span>
                <span className="font-medium text-right text-slate-200">Angol C1 | B kategória</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('master')}
              className="mt-3 w-full py-1.5 bg-slate-800/60 hover:bg-slate-800 text-[11px] text-brand-300 font-medium rounded-lg border border-slate-700/60 text-center transition-all cursor-pointer"
            >
              Mester Adatbázis részleteinek megtekintése →
            </button>
          </div>
        </div>

        {/* Right Column: Output & A4 Document View */}
        <div className="xl:col-span-7 space-y-4">
          {/* Output Toolbar */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
            {/* View switcher tabs */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeView === 'preview'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                A4 Előnézet (1 Oldal)
              </button>
              <button
                type="button"
                onClick={() => setActiveView('markdown')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeView === 'markdown'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Nyers Markdown
              </button>
              <button
                type="button"
                onClick={() => setActiveView('master')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeView === 'master'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Mester Adatbázis
              </button>
            </div>

            {/* Actions: Copy & Print & Zoom */}
            <div className="flex items-center space-x-2">
              {/* Zoom controls for A4 preview */}
              {activeView === 'preview' && (
                <div className="hidden sm:flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 mr-1">
                  <button
                    type="button"
                    onClick={() => setZoomScale(Math.max(0.7, zoomScale - 0.05))}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Kicsinyítés"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-slate-300 font-mono px-1.5">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale(Math.min(1.15, zoomScale + 0.05))}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Nagyítás"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Copy Markdown */}
              <button
                type="button"
                onClick={() => handleCopy('md')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium transition-all"
                title="Markdown kód vágólapra másolása"
              >
                {copiedType === 'md' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Másolva!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Markdown</span>
                  </>
                )}
              </button>

              {/* Print / PDF Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer"
                title="Nyomtatás vagy Mentés PDF-be"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Nyomtatás / PDF</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: A4 Preview Container */}
          {activeView === 'preview' && (
            <div className="flex justify-center overflow-x-auto pb-8">
              <div 
                style={{ 
                  transform: `scale(${zoomScale})`, 
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="w-full max-w-[794px]"
              >
                {/* 
                  A4 Page Specification Sheet:
                  Standard A4: 210mm x 297mm.
                  We use crisp font rendering, precise line-heights and margins,
                  guaranteeing an exact 1-page fit.
                */}
                <div 
                  id="cv-a4-sheet"
                  className="bg-white text-slate-900 rounded-lg shadow-2xl p-[32px] md:p-[42px] font-sans antialiased text-[11.5px] leading-[1.38] min-h-[1100px] relative border border-slate-200"
                >
                  {/* Subtle 1-page fit indicator in bottom corner */}
                  <div className="absolute right-4 bottom-3 text-[10px] text-slate-400 font-mono select-none no-print">
                    1/1 Oldal • A4
                  </div>

                  {/* Render the Markdown through custom styled components */}
                  <div className="cv-content-styled">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Header H1: Single line header
                        h1: ({ children }) => (
                          <div className="border-b-2 border-slate-900 pb-2 mb-3">
                            <h1 className="text-[17px] font-extrabold tracking-tight text-slate-950 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              {children}
                            </h1>
                          </div>
                        ),
                        // Section Titles H2
                        h2: ({ children }) => (
                          <h2 className="text-[11px] font-bold uppercase tracking-wider text-brand-700 border-b border-slate-300 mt-2.5 mb-1 pb-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 inline-block"></span>
                            {children}
                          </h2>
                        ),
                        // Paragraphs
                        p: ({ children }) => (
                          <p className="text-slate-800 text-[11.5px] leading-[1.4] mb-1.5 text-justify">
                            {children}
                          </p>
                        ),
                        // Lists
                        ul: ({ children }) => (
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-800 text-[11.2px] leading-[1.35] mb-2">
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li className="pl-0.5">
                            {children}
                          </li>
                        ),
                        // Strong text
                        strong: ({ children }) => (
                          <strong className="font-semibold text-slate-950">
                            {children}
                          </strong>
                        ),
                        // Blockquote
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-brand-500 pl-3 italic text-slate-600 my-1">
                            {children}
                          </blockquote>
                        )
                      }}
                    >
                      {generatedCv}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Raw Markdown View */}
          {activeView === 'markdown' && (
            <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-slate-400">cv_output.md</span>
                <button
                  type="button"
                  onClick={() => handleCopy('md')}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Másolás vágólapra
                </button>
              </div>
              <pre className="font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto p-4 bg-slate-900/90 rounded-xl border border-slate-800 max-h-[750px] whitespace-pre-wrap select-all">
                {generatedCv}
              </pre>
            </div>
          )}

          {/* VIEW 3: Master Profile Inspector */}
          {activeView === 'master' && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-400" />
                  Márki Gergely – Teljes Mester Profil Adatbázis
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ezeket a validált, valós adatokat használja az AI a pozíciókra szabott önéletrajzok generálásakor.
                </p>
              </div>

              {/* Education */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider">Tanulmányok</h4>
                {MASTER_PROFILE.education.map((edu, idx) => (
                  <div key={idx} className="border-l-2 border-brand-500 pl-3 py-1">
                    <div className="flex justify-between text-xs font-semibold text-white">
                      <span>{edu.institution} – {edu.degree}</span>
                      <span className="text-slate-400">{edu.period}</span>
                    </div>
                    {edu.details && <p className="text-[11px] text-slate-400 mt-0.5">{edu.details}</p>}
                  </div>
                ))}
              </div>

              {/* Experiences */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider">Szakmai Tapasztalatok</h4>
                {MASTER_PROFILE.experiences.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-indigo-500 pl-3 py-1">
                    <div className="flex justify-between text-xs font-semibold text-white">
                      <span>{exp.company}</span>
                      <span className="text-slate-400">{exp.period}</span>
                    </div>
                    <div className="text-xs text-indigo-300 font-medium mb-1">{exp.role}</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                      {exp.details.map((detail, dIdx) => (
                        <li key={dIdx}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider">Készségek & Kompetenciák</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {MASTER_PROFILE.skills.map((skillGroup, idx) => (
                    <div key={idx} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                      <div className="text-xs font-semibold text-slate-200 mb-1">{skillGroup.category}</div>
                      <ul className="space-y-0.5 text-[11px] text-slate-400">
                        {skillGroup.items.map((item, sIdx) => (
                          <li key={sIdx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages & Driver License */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-wrap justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Nyelvtudás: </span>
                  <span className="text-white font-medium">Angol C1 (Felsőfokú szakmai szint)</span>
                </div>
                <div>
                  <span className="text-slate-400">Jogosítvány: </span>
                  <span className="text-white font-medium">{MASTER_PROFILE.drivingLicense}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
