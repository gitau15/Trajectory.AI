
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyzeMomentum } from './geminiService';
import { Habit, AnalysisResult, HistoryPoint, HabitType } from './types';

const INITIAL_HABITS: Habit[] = [
  { id: '1', name: 'Exercise', weight: 2, type: 'good', status: 'missed' },
  { id: '2', name: 'Reading', weight: 1, type: 'good', status: 'missed' },
  { id: '3', name: 'Deep Work', weight: 3, type: 'good', status: 'missed' },
  { id: '4', name: 'Sugar/Junk Food', weight: 2.5, type: 'bad', status: 'passed' },
  { id: '5', name: 'Late Night Scrolling', weight: 1.5, type: 'bad', status: 'passed' },
];

const INITIAL_HISTORY: HistoryPoint[] = [
  { date: 'T-7', momentum: 2.0 },
  { date: 'T-6', momentum: 1.5 },
  { date: 'T-5', momentum: 2.2 },
  { date: 'T-4', momentum: 0.8 },
  { date: 'T-3', momentum: -0.5 },
  { date: 'T-2', momentum: -1.0 },
  { date: 'T-1', momentum: 0.2 },
];

export default function App() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('trajectory_matrix');
    return saved ? JSON.parse(saved) : INITIAL_HABITS;
  });
  const [history] = useState<HistoryPoint[]>(INITIAL_HISTORY);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<HabitType>('good');
  const [newWeight, setNewWeight] = useState(2);

  // Persistence
  useEffect(() => {
    localStorage.setItem('trajectory_matrix', JSON.stringify(habits));
  }, [habits]);

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        if (h.type === 'good') {
          return { ...h, status: h.status === 'done' ? 'missed' : 'done' };
        } else {
          return { ...h, status: h.status === 'failed' ? 'passed' : 'failed' };
        }
      }
      return h;
    }));
  };

  const removeHabit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newName,
      weight: newWeight,
      type: newType,
      status: newType === 'good' ? 'missed' : 'passed'
    };
    setHabits([...habits, newHabit]);
    setNewName('');
    setNewWeight(2);
    setShowAddModal(false);
  };

  // Offline Momentum Calculation
  const localMomentum = useMemo(() => {
    return habits.reduce((acc, h) => {
      const isDone = h.status === 'done' || h.status === 'failed';
      if (!isDone) return acc;
      return acc + (h.type === 'good' ? h.weight : -h.weight);
    }, 0);
  }, [habits]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeMomentum(history, habits);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const yesterdayScore = history[history.length - 1].momentum;
  const isBetter = analysis ? analysis.daily_momentum > yesterdayScore : localMomentum > yesterdayScore;
  const isWorse = analysis ? analysis.daily_momentum < yesterdayScore : localMomentum < yesterdayScore;
  const isStagnant = analysis ? analysis.daily_momentum === yesterdayScore : localMomentum === yesterdayScore;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-white flex items-center gap-2">
            <span className="bg-white text-black px-2 py-0.5 rounded italic shadow-lg">T</span>
            TRAJECTORY.AI
          </h1>
          <p className="text-zinc-500 mono text-[10px] mt-2 tracking-[0.2em]">BEHAVIORAL ENGINE v3.0 // DYNAMIC MATRIX ACTIVE</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-[10px] mono text-zinc-500 uppercase tracking-widest">System Status: {isAnalyzing ? 'Calculating' : 'Online'}</span>
          </div>
          <p className="text-lg font-bold text-white mono">{new Date().toISOString().split('T')[0]}</p>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input and Visualization */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Visualizer */}
          <section className={`bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl transition-all duration-700 ${
            analysis ? (isBetter ? 'shadow-emerald-900/10 border-emerald-500/20' : isWorse ? 'shadow-rose-900/10 border-rose-500/20 pulse-red' : '') : ''
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mono flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isBetter ? 'bg-emerald-500 glow-green' : isWorse ? 'bg-rose-500' : 'bg-zinc-700'}`}></span>
                Momentum Vector Graph
              </h2>
              <div className="text-right">
                <span className="text-[9px] mono text-zinc-600 block uppercase">Real-time Momentum</span>
                <span className={`text-xl font-black mono ${localMomentum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {localMomentum > 0 ? '+' : ''}{localMomentum.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...history, { date: 'Today', momentum: analysis ? analysis.daily_momentum : localMomentum }]}>
                  <defs>
                    <linearGradient id="colorMomentum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isBetter ? "#10b981" : isWorse ? "#f43f5e" : "#10b981"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isBetter ? "#10b981" : isWorse ? "#f43f5e" : "#10b981"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#e5e5e5', fontFamily: 'JetBrains Mono' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="momentum" 
                    stroke={isBetter ? "#10b981" : isWorse ? "#f43f5e" : "#10b981"} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorMomentum)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Matrix Controls */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mono">Dynamic Matrix Configuration</h2>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-all mono text-[10px] uppercase border border-zinc-700 flex items-center gap-2"
              >
                <span>+</span> Append Node
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {habits.map(habit => (
                <div
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    (habit.status === 'done' || habit.status === 'failed') 
                      ? 'bg-zinc-800/50 border-zinc-700' 
                      : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex flex-col truncate pr-4">
                    <span className={`text-sm font-bold truncate ${
                      (habit.status === 'done' || habit.status === 'failed') ? 'text-white' : 'text-zinc-500'
                    }`}>
                      {habit.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded mono uppercase ${
                        habit.type === 'good' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        MAG: {habit.weight}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                      habit.type === 'good' 
                        ? habit.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-800'
                        : habit.status === 'failed' ? 'bg-rose-500 border-rose-500 text-black' : 'border-zinc-800'
                    }`}>
                      {(habit.status === 'done' || habit.status === 'failed') && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <button 
                      onClick={(e) => removeHabit(habit.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-rose-500 transition-all rounded-md hover:bg-rose-500/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full mt-8 py-5 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] shadow-xl tracking-widest uppercase text-xs"
            >
              {isAnalyzing ? 'SYNCHING GRADIENTS...' : 'CALCULATE TRAJECTORY'}
            </button>
          </section>
        </div>

        {/* Right: AI Analysis Output */}
        <div className="lg:col-span-5 h-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl h-full flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mono">Analytical Output</h2>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {!analysis && !isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full border border-dashed border-zinc-800 flex items-center justify-center mb-6">
                    <span className="text-zinc-800 text-3xl mono">?</span>
                  </div>
                  <h3 className="text-zinc-500 font-bold uppercase mono text-xs tracking-widest mb-4">Awaiting Gradient Sync</h3>
                  <p className="text-zinc-700 text-[11px] leading-relaxed max-w-[240px] uppercase">Initialize vectors in the Dynamic Matrix to begin behavioral projection.</p>
                </div>
              ) : isAnalyzing ? (
                <div className="space-y-8">
                  <div className="h-24 bg-zinc-800/30 rounded-2xl animate-pulse"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-zinc-800/20 rounded-2xl animate-pulse"></div>
                    <div className="h-20 bg-zinc-800/20 rounded-2xl animate-pulse"></div>
                  </div>
                  <div className="h-40 bg-zinc-800/10 rounded-2xl animate-pulse"></div>
                </div>
              ) : analysis ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                  {/* High Contrast Verdict Banner */}
                  <div className={`p-6 rounded-2xl border-l-8 shadow-2xl relative overflow-hidden ${
                    isBetter ? 'bg-emerald-500/10 border-emerald-500' : isWorse ? 'bg-rose-500/10 border-rose-500 pulse-red' : 'bg-zinc-500/10 border-zinc-500'
                  }`}>
                    {isBetter && <div className="absolute inset-0 glow-green opacity-20 pointer-events-none"></div>}
                    <div className="flex flex-col relative z-10">
                      <span className="text-[9px] mono text-zinc-500 uppercase tracking-widest mb-2 font-bold">The Verdict</span>
                      <h4 className={`text-xl font-black italic tracking-tighter leading-tight ${isBetter ? 'text-emerald-400' : isWorse ? 'text-rose-400' : 'text-zinc-400'}`}>
                        {analysis.verdict_header}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800/50">
                      <p className="text-[9px] mono text-zinc-600 uppercase mb-2">30D Projection</p>
                      <p className={`text-xl font-black mono ${analysis.projection_30_days.includes('-') ? 'text-rose-400' : 'text-blue-400'}`}>
                        {analysis.projection_30_days}
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800/50">
                      <p className="text-[9px] mono text-zinc-600 uppercase mb-2">Risk Level</p>
                      <p className={`text-xl font-black uppercase tracking-tighter ${
                        analysis.risk_assessment === 'low' ? 'text-emerald-400' : analysis.risk_assessment === 'moderate' ? 'text-amber-400' : 'text-rose-500'
                      }`}>
                        {analysis.risk_assessment}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <h3 className="text-[10px] font-bold uppercase text-zinc-600 mb-4 mono tracking-[0.4em]">Stoic Narrative Analysis</h3>
                    <div className="p-6 bg-zinc-950 border border-zinc-800/50 rounded-2xl relative">
                      <p className="text-zinc-300 leading-relaxed font-light text-md italic">
                        "{analysis.ai_summary}"
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="p-6 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center text-[9px] mono text-zinc-800 uppercase font-bold tracking-[0.2em]">
              <span>Matrix Entropy: Stable</span>
              <span className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-emerald-900"></div>
                Calculated by Stoic-G-3.0
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Add Habit Modal with Magnitude Slider */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
            <h3 className="text-2xl font-black text-white mb-8 mono uppercase tracking-widest italic">Append New Vector</h3>
            
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] mono text-zinc-500 uppercase mb-3 font-bold tracking-widest">Node Identification</label>
                <input 
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="E.G. DEEP WORK"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all text-lg font-bold placeholder:text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] mono text-zinc-500 uppercase mb-3 font-bold tracking-widest">Vector Polarity</label>
                  <div className="flex p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <button 
                      onClick={() => setNewType('good')}
                      className={`flex-1 py-3 rounded-xl text-[10px] mono font-bold transition-all ${newType === 'good' ? 'bg-emerald-500 text-black' : 'text-zinc-600 hover:text-zinc-300'}`}
                    >
                      FORTIFY (+)
                    </button>
                    <button 
                      onClick={() => setNewType('bad')}
                      className={`flex-1 py-3 rounded-xl text-[10px] mono font-bold transition-all ${newType === 'bad' ? 'bg-rose-500 text-black' : 'text-zinc-600 hover:text-zinc-300'}`}
                    >
                      DISSIPATE (-)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] mono text-zinc-500 uppercase mb-3 font-bold tracking-widest">Magnitude: {newWeight}</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="5"
                    step="0.5"
                    value={newWeight}
                    onChange={(e) => setNewWeight(parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800"
                  />
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-[8px] mono text-zinc-700 uppercase">Min (1)</span>
                    <span className="text-[8px] mono text-zinc-700 uppercase">Max (5)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black rounded-2xl hover:bg-zinc-700 transition-all mono text-[10px] uppercase tracking-widest"
                >
                  ABORT
                </button>
                <button 
                  onClick={addHabit}
                  className="flex-1 py-4 bg-white text-black font-black rounded-2xl hover:bg-emerald-50 transition-all mono text-[10px] uppercase tracking-widest shadow-lg shadow-white/5"
                >
                  CONFIRM NODE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 mb-8 text-zinc-800 text-[10px] mono tracking-[0.8em] uppercase text-center max-w-xl leading-loose opacity-50">
        Temporal Equilibrium is an illusion // Progress or decay // No middle ground
      </footer>
      
      <style>{`
        @keyframes pulse-red {
          0%, 100% { border-color: rgba(244, 63, 94, 0.2); }
          50% { border-color: rgba(244, 63, 94, 0.4); }
        }
        .pulse-red { animation: pulse-red 2s infinite ease-in-out; }
        
        .glow-green {
          box-shadow: 0 0 30px 10px rgba(16, 185, 129, 0.1);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #18181b; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #27272a; }

        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
