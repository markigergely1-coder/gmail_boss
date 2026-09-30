import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Compass, 
  BookOpen, 
  Sliders, 
  Activity,
  Layers,
  Zap
} from 'lucide-react';

export type TrigFunction = 'sin' | 'cos' | 'tan';

interface SpecialAngle {
  deg: number;
  radLabel: string;
  sinExact: string;
  sinVal: number;
  cosExact: string;
  cosVal: number;
  tanExact: string;
  tanVal: number | null; // null ha nem értelmezett
}

const SPECIAL_ANGLES: SpecialAngle[] = [
  { deg: 0, radLabel: '0', sinExact: '0', sinVal: 0, cosExact: '1', cosVal: 1, tanExact: '0', tanVal: 0 },
  { deg: 30, radLabel: 'π/6', sinExact: '1/2', sinVal: 0.5, cosExact: '√3/2', cosVal: Math.sqrt(3)/2, tanExact: '√3/3', tanVal: Math.sqrt(3)/3 },
  { deg: 45, radLabel: 'π/4', sinExact: '√2/2', sinVal: Math.sqrt(2)/2, cosExact: '√2/2', cosVal: Math.sqrt(2)/2, tanExact: '1', tanVal: 1 },
  { deg: 60, radLabel: 'π/3', sinExact: '√3/2', sinVal: Math.sqrt(3)/2, cosExact: '1/2', cosVal: 0.5, tanExact: '√3', tanVal: Math.sqrt(3) },
  { deg: 90, radLabel: 'π/2', sinExact: '1', sinVal: 1, cosExact: '0', cosVal: 0, tanExact: 'Nem értelmezett (∄)', tanVal: null },
  { deg: 120, radLabel: '2π/3', sinExact: '√3/2', sinVal: Math.sqrt(3)/2, cosExact: '-1/2', cosVal: -0.5, tanExact: '-√3', tanVal: -Math.sqrt(3) },
  { deg: 135, radLabel: '3π/4', sinExact: '√2/2', sinVal: Math.sqrt(2)/2, cosExact: '-√2/2', cosVal: -Math.sqrt(2)/2, tanExact: '-1', tanVal: -1 },
  { deg: 150, radLabel: '5π/6', sinExact: '1/2', sinVal: 0.5, cosExact: '-√3/2', cosVal: -Math.sqrt(3)/2, tanExact: '-√3/3', tanVal: -Math.sqrt(3)/3 },
  { deg: 180, radLabel: 'π', sinExact: '0', sinVal: 0, cosExact: '-1', cosVal: -1, tanExact: '0', tanVal: 0 },
  { deg: 210, radLabel: '7π/6', sinExact: '-1/2', sinVal: -0.5, cosExact: '-√3/2', cosVal: -Math.sqrt(3)/2, tanExact: '√3/3', tanVal: Math.sqrt(3)/3 },
  { deg: 225, radLabel: '5π/4', sinExact: '-√2/2', sinVal: -Math.sqrt(2)/2, cosExact: '-√2/2', cosVal: -Math.sqrt(2)/2, tanExact: '1', tanVal: 1 },
  { deg: 240, radLabel: '4π/3', sinExact: '-√3/2', sinVal: -Math.sqrt(3)/2, cosExact: '-1/2', cosVal: -0.5, tanExact: '√3', tanVal: Math.sqrt(3) },
  { deg: 270, radLabel: '3π/2', sinExact: '-1', sinVal: -1, cosExact: '0', cosVal: 0, tanExact: 'Nem értelmezett (∄)', tanVal: null },
  { deg: 300, radLabel: '5π/3', sinExact: '-√3/2', sinVal: -Math.sqrt(3)/2, cosExact: '1/2', cosVal: 0.5, tanExact: '-√3', tanVal: -Math.sqrt(3) },
  { deg: 315, radLabel: '7π/4', sinExact: '-√2/2', sinVal: -Math.sqrt(2)/2, cosExact: '√2/2', cosVal: Math.sqrt(2)/2, tanExact: '-1', tanVal: -1 },
  { deg: 330, radLabel: '11π/6', sinExact: '-1/2', sinVal: -0.5, cosExact: '√3/2', cosVal: Math.sqrt(3)/2, tanExact: '-√3/3', tanVal: -Math.sqrt(3)/3 },
  { deg: 360, radLabel: '2π', sinExact: '0', sinVal: 0, cosExact: '1', cosVal: 1, tanExact: '0', tanVal: 0 },
];

export function MathTab() {
  const [selectedFunc, setSelectedFunc] = useState<TrigFunction>('sin');
  const [angleDeg, setAngleDeg] = useState<number>(30); // Kezdőérték 30 fok
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 0.5, 1, 2
  const [snapToSpecial, setSnapToSpecial] = useState<boolean>(true);
  const [showHelpers, setShowHelpers] = useState<boolean>(true);
  const [showTheory, setShowTheory] = useState<boolean>(false);

  // SVG kör interakcióhoz ref
  const circleSvgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Normalizált szög 0 és 360 fok között
  const normDeg = useMemo(() => {
    let d = angleDeg % 360;
    if (d < 0) d += 360;
    return d;
  }, [angleDeg]);

  const rad = useMemo(() => (normDeg * Math.PI) / 180, [normDeg]);

  // Számított trigonometrikus értékek
  const sinValue = useMemo(() => Math.sin(rad), [rad]);
  const cosValue = useMemo(() => Math.cos(rad), [rad]);
  const isTanUndefined = useMemo(() => Math.abs(cosValue) < 1e-6, [cosValue]);
  const tanValue = useMemo(() => (isTanUndefined ? null : Math.tan(rad)), [rad, isTanUndefined]);

  // Közel van-e egy nevezetes szöghöz?
  const matchedSpecial = useMemo(() => {
    return SPECIAL_ANGLES.find((sa) => Math.abs(sa.deg - normDeg) < 0.4 || Math.abs(sa.deg - (normDeg - 360)) < 0.4);
  }, [normDeg]);

  // Aktuális síknegyed megállapítása
  const quadrant = useMemo(() => {
    if (normDeg === 0 || normDeg === 360) return 'Pozitív X tengely';
    if (normDeg === 90) return 'Pozitív Y tengely';
    if (normDeg === 180) return 'Negatív X tengely';
    if (normDeg === 270) return 'Negatív Y tengely';
    if (normDeg > 0 && normDeg < 90) return 'I. síknegyed (0° - 90°)';
    if (normDeg > 90 && normDeg < 180) return 'II. síknegyed (90° - 180°)';
    if (normDeg > 180 && normDeg < 270) return 'III. síknegyed (180° - 270°)';
    return 'IV. síknegyed (270° - 360°)';
  }, [normDeg]);

  // Folyamatos forgás animáció
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let animId: number;

    const tick = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      // 36 fok/mp alapsebesség 1x-nél => 1 teljes kör 10 mp
      const step = 36 * speed * delta;
      setAngleDeg((prev) => (prev + step) % 360);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speed]);

  // Egér / Touch húzás az egységsugarú körön
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setIsPlaying(false);
    updateAngleFromPointer(e.clientX, e.clientY);
  };

  const updateAngleFromPointer = (clientX: number, clientY: number) => {
    if (!circleSvgRef.current) return;
    const rect = circleSvgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = centerY - clientY; // Matematikai Y: felfelé pozitív!

    let angleRad = Math.atan2(dy, dx);
    if (angleRad < 0) angleRad += 2 * Math.PI;
    let deg = (angleRad * 180) / Math.PI;

    if (snapToSpecial) {
      const nearest = SPECIAL_ANGLES.find(
        (a) => Math.abs(a.deg - deg) < 4.5 || Math.abs(a.deg - (deg - 360)) < 4.5
      );
      if (nearest) {
        deg = nearest.deg;
      }
    }

    setAngleDeg(Math.round(deg * 10) / 10);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        updateAngleFromPointer(e.clientX, e.clientY);
      }
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, snapToSpecial]);

  // Színek témánként
  const funcTheme = {
    sin: {
      name: 'Szinusz',
      symbol: 'sin(α)',
      color: '#06b6d4', // Cyan
      colorHex: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.25)',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      activeBtn: 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30',
      stroke: '#06b6d4',
      glowFilter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.7))',
      formula: 'sin(α) = y (szemközti befogó / átfogó)',
      description: 'Az egységsugarú körben a pont Y koordinátája adja a szinusz értékét.',
    },
    cos: {
      name: 'Koszinusz',
      symbol: 'cos(α)',
      color: '#f59e0b', // Amber / Orange
      colorHex: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.25)',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      activeBtn: 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30',
      stroke: '#f59e0b',
      glowFilter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.7))',
      formula: 'cos(α) = x (melletti befogó / átfogó)',
      description: 'Az egységsugarú körben a pont X koordinátája adja a koszinusz értékét.',
    },
    tan: {
      name: 'Tangens',
      symbol: 'tan(α)',
      color: '#ec4899', // Pink / Fuchsia
      colorHex: '#ec4899',
      bgGlow: 'rgba(236, 72, 153, 0.25)',
      badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      activeBtn: 'bg-pink-500 text-slate-950 font-bold shadow-lg shadow-pink-500/30',
      stroke: '#ec4899',
      glowFilter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.7))',
      formula: 'tan(α) = sin(α) / cos(α) = y / x',
      description: 'Az (1, 0) pontban húzott függőleges érintőn a sugár egyenesének metszéspontja.',
    },
  }[selectedFunc];

  // Geometriai pontok a körön (Kör sugár R = 130 px, viewBox 340x340, origó 170, 170)
  const circleRadius = 120;
  const originX = 170;
  const originY = 170;
  const pointX = originX + circleRadius * cosValue;
  const pointY = originY - circleRadius * sinValue; // SVG lefelé növekvő Y miatt kivonás!

  // Tangens érintő koordinátái
  const tangentX = originX + circleRadius;
  // A sugár egyenesének meghosszabbítása a tangent érintőhöz
  // Vigyázzunk: ha |cos| kicsi, a tangens nagyon messze száll, korlátozzuk a kirajzolást
  const clampedTanValue = tanValue !== null ? Math.max(-3.5, Math.min(3.5, tanValue)) : 0;
  const tangentPointY = originY - circleRadius * clampedTanValue;

  // Függvénygrafikon paraméterek
  const graphWidth = 460;
  const graphHeight = 220;
  const graphPadLeft = 45;
  const graphPadRight = 25;
  const graphPadTop = 20;
  const graphPadBottom = 30;
  const plotWidth = graphWidth - graphPadLeft - graphPadRight;
  const plotHeight = graphHeight - graphPadTop - graphPadBottom;
  const graphZeroY = graphPadTop + plotHeight / 2;

  // Pontok a függvénygörbéhez
  const graphPoints = useMemo(() => {
    const segments: { x: number; y: number }[][] = [];
    let currentSegment: { x: number; y: number }[] = [];

    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * 360;
      const r = (d * Math.PI) / 180;
      const gx = graphPadLeft + (d / 360) * plotWidth;

      let val = 0;
      let valid = true;

      if (selectedFunc === 'sin') {
        val = Math.sin(r);
      } else if (selectedFunc === 'cos') {
        val = Math.cos(r);
      } else if (selectedFunc === 'tan') {
        const cos = Math.cos(r);
        if (Math.abs(cos) < 0.08) {
          valid = false;
        } else {
          val = Math.tan(r);
          // Korlátozzuk a vizualizált magasságot
          if (Math.abs(val) > 3.2) valid = false;
        }
      }

      if (valid) {
        // Skálázás: Sin/Cos esetén [-1.2, 1.2], Tan esetén [-3.2, 3.2]
        const maxScale = selectedFunc === 'tan' ? 3.0 : 1.2;
        const gy = graphZeroY - (val / maxScale) * (plotHeight / 2);
        currentSegment.push({ x: gx, y: gy });
      } else {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    return segments;
  }, [selectedFunc, plotWidth, plotHeight, graphPadLeft, graphZeroY]);

  // Pont koordináta a függvényen az aktuális szögnél
  const currentGraphPoint = useMemo(() => {
    const gx = graphPadLeft + (normDeg / 360) * plotWidth;
    let gy: number | null = null;

    if (selectedFunc === 'sin') {
      gy = graphZeroY - (sinValue / 1.2) * (plotHeight / 2);
    } else if (selectedFunc === 'cos') {
      gy = graphZeroY - (cosValue / 1.2) * (plotHeight / 2);
    } else if (selectedFunc === 'tan') {
      if (tanValue !== null && Math.abs(tanValue) <= 3.2) {
        gy = graphZeroY - (tanValue / 3.0) * (plotHeight / 2);
      } else {
        gy = null; // Aszimptota
      }
    }
    return { x: gx, y: gy };
  }, [normDeg, selectedFunc, sinValue, cosValue, tanValue, graphPadLeft, plotWidth, graphZeroY, plotHeight]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Intro Card */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-slate-700/60 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-gradient-to-br from-brand-600 to-indigo-600 rounded-xl shadow-lg shadow-brand-500/20 text-white">
                <Compass className="w-6 h-6" />
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Trigonometria Labor & Egységsugarú Kör
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" /> Oktatási Segédanyag
                </span>
              </h2>
            </div>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl">
              Interaktív tanulási segédlet: forgasd a sugarat az egységkörben, figyeld a szinusz, koszinusz és tangens szakaszok geometriai jelentését és a függvényhullám valós idejű képződését!
            </p>
          </div>

          {/* Felső vezérlő gyorsgombok: Lejátszás, sebesség, reset */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/25'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Megállítás' : 'Sugár forgatása'}</span>
            </button>

            {isPlaying && (
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-1 text-xs font-semibold text-slate-300">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      speed === s ? 'bg-brand-600 text-white shadow' : 'hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setIsPlaying(false);
                setAngleDeg(0);
              }}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
              title="Visszaállítás 0°-ra"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowTheory(!showTheory)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                showTheory
                  ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{showTheory ? 'Elmélet elrejtése' : 'Képletgyűjtemény'}</span>
            </button>
          </div>
        </div>

        {/* Függvényválasztó Tabok Fent */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400 mr-2 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-brand-400" /> Függvény:
            </span>
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setSelectedFunc('sin')}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  selectedFunc === 'sin'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60'
                }`}
              >
                <span>sin(α)</span>
                <span className="text-xs opacity-75 hidden md:inline">Szinusz</span>
              </button>

              <button
                onClick={() => setSelectedFunc('cos')}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  selectedFunc === 'cos'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/60'
                }`}
              >
                <span>cos(α)</span>
                <span className="text-xs opacity-75 hidden md:inline">Koszinusz</span>
              </button>

              <button
                onClick={() => setSelectedFunc('tan')}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  selectedFunc === 'tan'
                    ? 'bg-pink-500 text-slate-950 shadow-lg shadow-pink-500/30'
                    : 'text-slate-400 hover:text-pink-400 hover:bg-slate-800/60'
                }`}
              >
                <span>tan(α)</span>
                <span className="text-xs opacity-75 hidden md:inline">Tangens</span>
              </button>
            </div>
          </div>

          {/* Opcionális beállítások: Mágneses igazítás, segédvonalak */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none hover:text-slate-200">
              <input
                type="checkbox"
                checked={snapToSpecial}
                onChange={(e) => setSnapToSpecial(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <span>Nevezetes szögekhez igazítás (Snap)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none hover:text-slate-200">
              <input
                type="checkbox"
                checked={showHelpers}
                onChange={(e) => setShowHelpers(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <span>Segédvonalak mutatása</span>
            </label>
          </div>
        </div>
      </div>

      {/* Fő Vizuális Felület: 2 Oszlop (Bal: Egységsugarú Kör, Jobb: Hullámgrafikon) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BAL OSZLOP: Egységsugarú Kör (Unit Circle) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: funcTheme.colorHex }} />
              <h3 className="font-bold text-lg text-white">Egységsugarú Kör (r = 1)</h3>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              Fogd meg a sugarat és mozgasd!
            </span>
          </div>

          {/* SVG Egységkör */}
          <div className="relative flex items-center justify-center py-2 select-none">
            <svg
              ref={circleSvgRef}
              viewBox="0 0 340 340"
              className="w-full max-w-[380px] h-auto cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={handlePointerDown}
            >
              <defs>
                {/* Ragyogás szűrő */}
                <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Rácsvonalak & Alap tengelyek */}
              <circle cx={originX} cy={originY} r={circleRadius} fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="20" y1={originY} x2="320" y2={originY} stroke="#475569" strokeWidth="1.5" />
              <line x1={originX} y1="20" x2={originX} y2="320" stroke="#475569" strokeWidth="1.5" />

              {/* Tengely feliratok */}
              <text x="325" y={originY + 4} fill="#94a3b8" fontSize="11" fontFamily="monospace">x</text>
              <text x={originX} y="15" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">y</text>
              <text x={originX + circleRadius} y={originY + 16} fill="#64748b" fontSize="10" textAnchor="middle">1</text>
              <text x={originX - circleRadius} y={originY + 16} fill="#64748b" fontSize="10" textAnchor="middle">-1</text>
              <text x={originX - 12} y={originY - circleRadius + 4} fill="#64748b" fontSize="10" textAnchor="end">1</text>
              <text x={originX - 12} y={originY + circleRadius + 4} fill="#64748b" fontSize="10" textAnchor="end">-1</text>

              {/* Nevezetes szögjelölések halvány pöttyökkel */}
              {SPECIAL_ANGLES.filter(a => a.deg !== 360).map((sa) => {
                const sRad = (sa.deg * Math.PI) / 180;
                const px = originX + circleRadius * Math.cos(sRad);
                const py = originY - circleRadius * Math.sin(sRad);
                const isSelected = Math.abs(sa.deg - normDeg) < 0.5;
                return (
                  <g key={sa.deg} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setAngleDeg(sa.deg); }}>
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected ? 4 : 2}
                      fill={isSelected ? funcTheme.colorHex : '#64748b'}
                      opacity={isSelected ? 1 : 0.6}
                    />
                  </g>
                );
              })}

              {/* TANGENS ESETÉN: Függőleges érintő vonal az x = 1 pontban */}
              {selectedFunc === 'tan' && (
                <>
                  <line
                    x1={tangentX}
                    y1={originY - 140}
                    x2={tangentX}
                    y2={originY + 140}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  {/* Sugár meghosszabbítása az érintőhöz */}
                  <line
                    x1={originX}
                    y1={originY}
                    x2={tangentX}
                    y2={tangentPointY}
                    stroke="#ec4899"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  {/* Tangens kiemelt szakasz az érintőn */}
                  <line
                    x1={tangentX}
                    y1={originY}
                    x2={tangentX}
                    y2={tangentPointY}
                    stroke="#ec4899"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />
                  {/* Tangens metszéspont jelölő */}
                  <circle cx={tangentX} cy={tangentPointY} r="5" fill="#ec4899" filter="url(#glow)" />
                  <text
                    x={tangentX + 8}
                    y={(originY + tangentPointY) / 2}
                    fill="#f472b6"
                    fontSize="11"
                    fontWeight="bold"
                    dominantBaseline="middle"
                  >
                    tan(α)
                  </text>
                </>
              )}

              {/* Szög íve (Arc) az origó körül */}
              {normDeg > 0 && (
                <path
                  d={`M ${originX + 28} ${originY} A 28 28 0 ${normDeg > 180 ? 1 : 0} 0 ${
                    originX + 28 * Math.cos(rad)
                  } ${originY - 28 * Math.sin(rad)}`}
                  fill="none"
                  stroke={funcTheme.colorHex}
                  strokeWidth="2"
                  opacity="0.8"
                />
              )}
              <text
                x={originX + 38 * Math.cos(rad / 2)}
                y={originY - 38 * Math.sin(rad / 2)}
                fill={funcTheme.colorHex}
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
              >
                α
              </text>

              {/* KOSZINUSZ SZAKASZ (Vízszintes X tengelyen) */}
              <line
                x1={originX}
                y1={originY}
                x2={pointX}
                y2={originY}
                stroke={selectedFunc === 'cos' ? '#f59e0b' : showHelpers ? '#64748b' : 'none'}
                strokeWidth={selectedFunc === 'cos' ? 4 : 2}
                strokeLinecap="round"
                filter={selectedFunc === 'cos' ? 'url(#glow)' : undefined}
                strokeDasharray={selectedFunc === 'cos' ? 'none' : '3 3'}
              />
              {selectedFunc === 'cos' && (
                <text
                  x={(originX + pointX) / 2}
                  y={originY + (sinValue >= 0 ? 18 : -10)}
                  fill="#fbbf24"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  cos(α)
                </text>
              )}

              {/* SZINUSZ SZAKASZ (Függőleges szakasz a derékszögű háromszögben) */}
              <line
                x1={pointX}
                y1={originY}
                x2={pointX}
                y2={pointY}
                stroke={selectedFunc === 'sin' ? '#06b6d4' : showHelpers ? '#64748b' : 'none'}
                strokeWidth={selectedFunc === 'sin' ? 4 : 2}
                strokeLinecap="round"
                filter={selectedFunc === 'sin' ? 'url(#glow)' : undefined}
                strokeDasharray={selectedFunc === 'sin' ? 'none' : '3 3'}
              />
              {selectedFunc === 'sin' && (
                <text
                  x={pointX + (cosValue >= 0 ? 14 : -14)}
                  y={(originY + pointY) / 2}
                  fill="#22d3ee"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor={cosValue >= 0 ? 'start' : 'end'}
                  dominantBaseline="middle"
                >
                  sin(α)
                </text>
              )}

              {/* Derékszögű háromszög derékszögének jelölése */}
              {showHelpers && Math.abs(cosValue) > 0.1 && Math.abs(sinValue) > 0.1 && (
                <rect
                  x={cosValue >= 0 ? pointX - 10 : pointX}
                  y={sinValue >= 0 ? originY - 10 : originY}
                  width="10"
                  height="10"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1"
                />
              )}

              {/* A SUGÁR (Radius Vector r = 1) */}
              <line
                x1={originX}
                y1={originY}
                x2={pointX}
                y2={pointY}
                stroke="#f8fafc"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Sugár végpontja a körön (Húzható fogantyú pulzáló aurával) */}
              <circle
                cx={pointX}
                cy={pointY}
                r="10"
                fill={funcTheme.colorHex}
                opacity="0.3"
                className="animate-ping"
              />
              <circle
                cx={pointX}
                cy={pointY}
                r="7"
                fill={funcTheme.colorHex}
                stroke="#ffffff"
                strokeWidth="2.5"
                filter="url(#strongGlow)"
              />

              {/* Pont koordináták felirat */}
              <text
                x={pointX + (cosValue >= 0 ? 12 : -12)}
                y={pointY + (sinValue >= 0 ? -12 : 18)}
                fill="#f8fafc"
                fontSize="10"
                fontFamily="monospace"
                textAnchor={cosValue >= 0 ? 'start' : 'end'}
                className="bg-slate-900/80 px-1 py-0.5 rounded font-semibold"
              >
                P({cosValue.toFixed(2)}, {sinValue.toFixed(2)})
              </text>
            </svg>
          </div>

          {/* Kör alatti státusz és negyed kijelző */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-400">
              Pozíció: <strong className="text-slate-200">{quadrant}</strong>
            </span>
            <span className="font-mono text-slate-300">
              x = {cosValue.toFixed(3)}, y = {sinValue.toFixed(3)}
            </span>
          </div>
        </div>

        {/* JOBB OSZLOP: Függvénygrafikon (Function Wave Graph) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                style={{ backgroundColor: `${funcTheme.colorHex}22`, color: funcTheme.colorHex }}
              >
                Hullámgörbe
              </span>
              <h3 className="font-bold text-lg text-white">
                {funcTheme.name} görbe ábrázolása: <span className="font-mono">{funcTheme.symbol}</span>
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              0° → 360° (2π)
            </span>
          </div>

          {/* SVG Hullámgrafikon */}
          <div className="relative flex items-center justify-center py-2 select-none">
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className="w-full h-auto overflow-visible"
            >
              <defs>
                <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={funcTheme.colorHex} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={funcTheme.colorHex} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Rácsvonalak */}
              <line x1={graphPadLeft} y1={graphZeroY} x2={graphWidth - graphPadRight} y2={graphZeroY} stroke="#475569" strokeWidth="1.5" />
              <line x1={graphPadLeft} y1={graphPadTop} x2={graphPadLeft} y2={graphHeight - graphPadBottom} stroke="#475569" strokeWidth="1.5" />

              {/* Y tengely skála és címkék */}
              {selectedFunc === 'tan' ? (
                <>
                  <text x={graphPadLeft - 8} y={graphZeroY - (2.0 / 3.0) * (plotHeight / 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">+2</text>
                  <line x1={graphPadLeft - 3} y1={graphZeroY - (2.0 / 3.0) * (plotHeight / 2)} x2={graphWidth - graphPadRight} y2={graphZeroY - (2.0 / 3.0) * (plotHeight / 2)} stroke="#334155" strokeDasharray="2 2" />
                  
                  <text x={graphPadLeft - 8} y={graphZeroY + 4} fill="#64748b" fontSize="10" textAnchor="end">0</text>
                  
                  <text x={graphPadLeft - 8} y={graphZeroY + (2.0 / 3.0) * (plotHeight / 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">-2</text>
                  <line x1={graphPadLeft - 3} y1={graphZeroY + (2.0 / 3.0) * (plotHeight / 2)} x2={graphWidth - graphPadRight} y2={graphZeroY + (2.0 / 3.0) * (plotHeight / 2)} stroke="#334155" strokeDasharray="2 2" />
                  
                  {/* Tangens aszimptoták: 90° és 270° */}
                  <line
                    x1={graphPadLeft + (90 / 360) * plotWidth}
                    y1={graphPadTop}
                    x2={graphPadLeft + (90 / 360) * plotWidth}
                    y2={graphHeight - graphPadBottom}
                    stroke="#ec4899"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                  <line
                    x1={graphPadLeft + (270 / 360) * plotWidth}
                    y1={graphPadTop}
                    x2={graphPadLeft + (270 / 360) * plotWidth}
                    y2={graphHeight - graphPadBottom}
                    stroke="#ec4899"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                </>
              ) : (
                <>
                  <text x={graphPadLeft - 8} y={graphZeroY - (1.0 / 1.2) * (plotHeight / 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">+1</text>
                  <line x1={graphPadLeft - 3} y1={graphZeroY - (1.0 / 1.2) * (plotHeight / 2)} x2={graphWidth - graphPadRight} y2={graphZeroY - (1.0 / 1.2) * (plotHeight / 2)} stroke="#334155" strokeDasharray="2 2" />
                  
                  <text x={graphPadLeft - 8} y={graphZeroY + 4} fill="#64748b" fontSize="10" textAnchor="end">0</text>
                  
                  <text x={graphPadLeft - 8} y={graphZeroY + (1.0 / 1.2) * (plotHeight / 2) + 4} fill="#64748b" fontSize="10" textAnchor="end">-1</text>
                  <line x1={graphPadLeft - 3} y1={graphZeroY + (1.0 / 1.2) * (plotHeight / 2)} x2={graphWidth - graphPadRight} y2={graphZeroY + (1.0 / 1.2) * (plotHeight / 2)} stroke="#334155" strokeDasharray="2 2" />
                </>
              )}

              {/* X tengely skálaosztások: 0°, 90°, 180°, 270°, 360° */}
              {[
                { deg: 0, label: '0°' },
                { deg: 90, label: '90° (π/2)' },
                { deg: 180, label: '180° (π)' },
                { deg: 270, label: '270° (3π/2)' },
                { deg: 360, label: '360° (2π)' }
              ].map((tick) => {
                const tx = graphPadLeft + (tick.deg / 360) * plotWidth;
                return (
                  <g key={tick.deg}>
                    <line x1={tx} y1={graphZeroY - 4} x2={tx} y2={graphZeroY + 4} stroke="#475569" strokeWidth="1.5" />
                    <text x={tx} y={graphHeight - graphPadBottom + 16} fill="#94a3b8" fontSize="10" textAnchor="middle">
                      {tick.label}
                    </text>
                  </g>
                );
              })}

              {/* A TELJES GÖRBE KIRAJZOLÁSA */}
              {graphPoints.map((segment, segIdx) => {
                if (segment.length < 2) return null;
                const pathD = segment.reduce(
                  (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
                  ''
                );
                return (
                  <path
                    key={segIdx}
                    d={pathD}
                    fill="none"
                    stroke={funcTheme.colorHex}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 0 6px ${funcTheme.colorHex}66)` }}
                  />
                );
              })}

              {/* FOLYAMATOS KÉPZŐDÉS / NYOMVONAL: Az aktuális pontig tartó kiemelt szakasz */}
              {currentGraphPoint.y !== null && (
                <>
                  {/* Függőleges vetítővonal az X tengelyről */}
                  <line
                    x1={currentGraphPoint.x}
                    y1={graphZeroY}
                    x2={currentGraphPoint.x}
                    y2={currentGraphPoint.y}
                    stroke={funcTheme.colorHex}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />

                  {/* Vízszintes vetítővonal az Y tengelyre */}
                  <line
                    x1={graphPadLeft}
                    y1={currentGraphPoint.y}
                    x2={currentGraphPoint.x}
                    y2={currentGraphPoint.y}
                    stroke={funcTheme.colorHex}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />

                  {/* Az aktuális pont a görbén */}
                  <circle
                    cx={currentGraphPoint.x}
                    cy={currentGraphPoint.y}
                    r="8"
                    fill={funcTheme.colorHex}
                    opacity="0.3"
                    className="animate-ping"
                  />
                  <circle
                    cx={currentGraphPoint.x}
                    cy={currentGraphPoint.y}
                    r="6"
                    fill={funcTheme.colorHex}
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ filter: `drop-shadow(0 0 8px ${funcTheme.colorHex})` }}
                  />

                  {/* Pont feletti lebegő érték felirat */}
                  <text
                    x={currentGraphPoint.x}
                    y={currentGraphPoint.y - 12}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {selectedFunc === 'sin'
                      ? sinValue.toFixed(2)
                      : selectedFunc === 'cos'
                      ? cosValue.toFixed(2)
                      : tanValue !== null
                      ? tanValue.toFixed(2)
                      : '∄'}
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Grafikon alatti magyarázó kártya */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-400">
              Függvény: <strong className="text-slate-200">{funcTheme.formula}</strong>
            </span>
            <span className="text-slate-400">
              Periódus:{' '}
              <strong className="text-slate-200">
                {selectedFunc === 'tan' ? '180° (π)' : '360° (2π)'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Szög Vezérlő Sliderek és Gyorsgombok */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Szög Állítása (α)</h4>
              <p className="text-xs text-slate-400">
                Állítsd a csúszkával, vagy válassz az alábbi nevezetes szögek közül!
              </p>
            </div>
          </div>

          {/* Léptető gombok */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setAngleDeg((prev) => Math.max(0, Math.round(prev - 15)))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-700"
            >
              -15°
            </button>
            <button
              onClick={() => setAngleDeg((prev) => Math.max(0, Math.round(prev - 1)))}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-700"
            >
              -1°
            </button>
            <div className="px-4 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm font-bold text-white min-w-[70px] text-center">
              {normDeg.toFixed(1)}°
            </div>
            <button
              onClick={() => setAngleDeg((prev) => Math.round(prev + 1))}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-700"
            >
              +1°
            </button>
            <button
              onClick={() => setAngleDeg((prev) => Math.round(prev + 15))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-700"
            >
              +15°
            </button>
          </div>
        </div>

        {/* Nagy Csúszka (Slider) */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="360"
            step="0.5"
            value={normDeg}
            onChange={(e) => {
              setIsPlaying(false);
              setAngleDeg(parseFloat(e.target.value));
            }}
            className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400 transition-all"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>0° (0)</span>
            <span>90° (π/2)</span>
            <span>180° (π)</span>
            <span>270° (3π/2)</span>
            <span>360° (2π)</span>
          </div>
        </div>

        {/* Nevezetes szögek gyorsgomb sora */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Nevezetes Szögek Gyorsválasztó:
          </div>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_ANGLES.map((sa) => {
              const isCurrent = Math.abs(sa.deg - normDeg) < 0.5;
              return (
                <button
                  key={sa.deg}
                  onClick={() => {
                    setIsPlaying(false);
                    setAngleDeg(sa.deg);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 scale-105 border border-brand-400'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <span>{sa.deg}°</span>
                  <span className="text-[10px] opacity-75 font-serif">{sa.radLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Matematikai Eredmények és Értékek (3 Kártya Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Kártya: Szög adatok */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Szög Paraméterek</span>
              <span className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
                <Compass className="w-4 h-4" />
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">Szög fokban (Degree):</div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  {normDeg.toFixed(1)}°
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Szög radiánban (Radian):</div>
                <div className="text-xl font-bold text-brand-300 font-mono flex items-center gap-2">
                  <span>{matchedSpecial ? matchedSpecial.radLabel : `${rad.toFixed(3)} rad`}</span>
                  {matchedSpecial && (
                    <span className="text-xs text-slate-400 font-normal">({rad.toFixed(3)} rad)</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                <span>Elhelyezkedés: </span>
                <span className="text-slate-200 font-medium">{quadrant}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Kártya: Kiválasztott függvény értéke kiemelve */}
        <div
          className="border rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between relative overflow-hidden"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            borderColor: `${funcTheme.colorHex}66`,
            boxShadow: `0 10px 30px -10px ${funcTheme.colorHex}33`,
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: `${funcTheme.colorHex}15` }} />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: funcTheme.colorHex }}>
                Kiválasztott Függvény
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${funcTheme.colorHex}22`,
                  borderColor: `${funcTheme.colorHex}44`,
                  color: funcTheme.colorHex,
                }}
              >
                {funcTheme.name}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">Kiszámított érték:</div>
                <div className="text-4xl font-black font-mono tracking-tight" style={{ color: funcTheme.colorHex }}>
                  {selectedFunc === 'sin'
                    ? (matchedSpecial ? matchedSpecial.sinExact : sinValue.toFixed(4))
                    : selectedFunc === 'cos'
                    ? (matchedSpecial ? matchedSpecial.cosExact : cosValue.toFixed(4))
                    : (matchedSpecial ? matchedSpecial.tanExact : isTanUndefined ? 'Nem értelmezett' : tanValue?.toFixed(4))}
                </div>
              </div>

              {matchedSpecial && (
                <div className="text-sm font-mono text-slate-300">
                  Tizedes törtként:{' '}
                  <span className="font-bold text-white">
                    {selectedFunc === 'sin'
                      ? sinValue.toFixed(4)
                      : selectedFunc === 'cos'
                      ? cosValue.toFixed(4)
                      : isTanUndefined
                      ? '±∞'
                      : tanValue?.toFixed(4)}
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800 leading-relaxed">
                {funcTheme.description}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Kártya: Összehasonlító táblázat mindhárom értékkel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Minden Érték Összevetése</span>
              <span className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
                <Layers className="w-4 h-4" />
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div
                onClick={() => setSelectedFunc('sin')}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedFunc === 'sin'
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="font-bold">sin({normDeg.toFixed(0)}°)</span>
                <span className="font-mono font-bold">
                  {matchedSpecial ? `${matchedSpecial.sinExact} (${sinValue.toFixed(3)})` : sinValue.toFixed(4)}
                </span>
              </div>

              <div
                onClick={() => setSelectedFunc('cos')}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedFunc === 'cos'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="font-bold">cos({normDeg.toFixed(0)}°)</span>
                <span className="font-mono font-bold">
                  {matchedSpecial ? `${matchedSpecial.cosExact} (${cosValue.toFixed(3)})` : cosValue.toFixed(4)}
                </span>
              </div>

              <div
                onClick={() => setSelectedFunc('tan')}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedFunc === 'tan'
                    ? 'bg-pink-500/10 border-pink-500/40 text-pink-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="font-bold">tan({normDeg.toFixed(0)}°)</span>
                <span className="font-mono font-bold">
                  {isTanUndefined
                    ? '∄ (aszimptota)'
                    : matchedSpecial
                    ? `${matchedSpecial.tanExact} (${tanValue?.toFixed(3)})`
                    : tanValue?.toFixed(4)}
                </span>
              </div>

              {/* Pitagoraszi azonosság ellenőrzése valós időben */}
              <div className="pt-2 text-xs text-slate-400 font-mono border-t border-slate-800 flex justify-between">
                <span>sin²(α) + cos²(α):</span>
                <span className="text-emerald-400 font-bold">
                  {(Math.pow(sinValue, 2) + Math.pow(cosValue, 2)).toFixed(4)} = 1.0000 ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kinyitható Képletgyűjtemény és Elméleti Magyarázó */}
      <AnimatePresence>
        {showTheory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/30 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Matematikai Összefoglaló & Képletgyűjtemény</h3>
                  <p className="text-slate-400 text-xs">Minden amit a trigonometrikus függvényekről tudni érdemes közép- és felsőfokon</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Szinusz elmélet */}
                <div className="bg-slate-950/60 border border-cyan-500/20 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <h4>Szinusz függvény: sin(x)</h4>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                    <li>• <strong>Értelmezési tartomány:</strong> x ∈ ℝ</li>
                    <li>• <strong>Értékkészlet:</strong> [-1, 1]</li>
                    <li>• <strong>Periódus:</strong> 2π (360°)</li>
                    <li>• <strong>Paritás:</strong> Páratlan függvény: sin(-x) = -sin(x)</li>
                    <li>• <strong>Geometriai jelentés:</strong> A derékszögű háromszögben a szöggel szemközti befogó és az átfogó aránya (egységkörben az Y koordináta).</li>
                  </ul>
                </div>

                {/* Koszinusz elmélet */}
                <div className="bg-slate-950/60 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h4>Koszinusz függvény: cos(x)</h4>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                    <li>• <strong>Értelmezési tartomány:</strong> x ∈ ℝ</li>
                    <li>• <strong>Értékkészlet:</strong> [-1, 1]</li>
                    <li>• <strong>Periódus:</strong> 2π (360°)</li>
                    <li>• <strong>Paritás:</strong> Páros függvény: cos(-x) = cos(x)</li>
                    <li>• <strong>Geometriai jelentés:</strong> A szög melletti befogó és az átfogó aránya (egységkörben az X koordináta).</li>
                  </ul>
                </div>

                {/* Tangens elmélet */}
                <div className="bg-slate-950/60 border border-pink-500/20 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-pink-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                    <h4>Tangens függvény: tan(x)</h4>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                    <li>• <strong>Értelmezési tartomány:</strong> x ∈ ℝ \ {'{'}π/2 + k·π{'}'}</li>
                    <li>• <strong>Értékkészlet:</strong> ]-∞, +∞[ (ℝ)</li>
                    <li>• <strong>Periódus:</strong> π (180°)</li>
                    <li>• <strong>Aszimptoták:</strong> x = 90°, 270°, ... (ahol cos(x) = 0)</li>
                    <li>• <strong>Geometriai jelentés:</strong> A szemközti és melletti befogó hányadosa: tan(x) = sin(x)/cos(x).</li>
                  </ul>
                </div>
              </div>

              {/* Nevezetes szögek táblázata */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Fok (α)</th>
                      <th className="py-2.5 px-3">Radián</th>
                      <th className="py-2.5 px-3 text-cyan-400">sin(α)</th>
                      <th className="py-2.5 px-3 text-amber-400">cos(α)</th>
                      <th className="py-2.5 px-3 text-pink-400">tan(α)</th>
                      <th className="py-2.5 px-3">Művelet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                    {[
                      { deg: 0, rad: '0', sin: '0', cos: '1', tan: '0' },
                      { deg: 30, rad: 'π/6', sin: '1/2', cos: '√3/2', tan: '√3/3' },
                      { deg: 45, rad: 'π/4', sin: '√2/2', cos: '√2/2', tan: '1' },
                      { deg: 60, rad: 'π/3', sin: '√3/2', cos: '1/2', tan: '√3' },
                      { deg: 90, rad: 'π/2', sin: '1', cos: '0', tan: 'Nem értelmezett' },
                      { deg: 180, rad: 'π', sin: '0', cos: '-1', tan: '0' },
                      { deg: 270, rad: '3π/2', sin: '-1', cos: '0', tan: 'Nem értelmezett' },
                      { deg: 360, rad: '2π', sin: '0', cos: '1', tan: '0' },
                    ].map((row) => (
                      <tr key={row.deg} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 font-bold text-white">{row.deg}°</td>
                        <td className="py-2 px-3 text-indigo-300">{row.rad}</td>
                        <td className="py-2 px-3 text-cyan-300 font-bold">{row.sin}</td>
                        <td className="py-2 px-3 text-amber-300 font-bold">{row.cos}</td>
                        <td className="py-2 px-3 text-pink-300 font-bold">{row.tan}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => {
                              setIsPlaying(false);
                              setAngleDeg(row.deg);
                            }}
                            className="px-2.5 py-1 bg-brand-600/30 hover:bg-brand-600 text-brand-300 hover:text-white rounded-lg text-[10px] font-sans transition-all"
                          >
                            Kiválaszt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
