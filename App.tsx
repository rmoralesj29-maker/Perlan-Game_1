
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Settings, Trophy, Users, ArrowLeft, Check, X, Clock, 
  Thermometer, Mountain, Wind, Bird, History, Droplets, 
  Building2, Gift, BrainCircuit, Zap, Award, Lock, Lightbulb,
  ChevronDown, Trash2, Eye, EyeOff, PieChart, BarChart2, Filter, ChevronUp, Sparkles, PlusCircle, Search, AlertCircle, BookOpen, ChevronRight, CheckCircle, RotateCcw, Edit2, ArrowUp, ArrowDown, Save, ChevronLeft, Loader2
} from 'lucide-react';
import { Category, Difficulty, GameConfig, GameResult, Question, PlayerAnswer, PlayerStats, LearningModule, LearningUnit, UserProgress, Flashcard, LearningQuiz } from './types';
import Button from './components/Button';
import { getQuestions, saveGameResult, getAllStats, addQuestion, deleteQuestion, getAllResults, getUserProgress, saveUserProgress, getLearningModules, saveLearningModules, deleteLearningModuleFromCloud, syncContentFromFirebase } from './services/storageService';
import { generateQuestionsWithAI } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePie, Pie } from 'recharts';
import { v4 as uuidv4 } from 'uuid';

// --- Helper Components & Icons ---

const CategoryIcon = ({ category, size=24 }: { category: Category, size?: number }) => {
  switch (category) {
    case Category.NorthernLights: return <Zap size={size} className="text-purple-400" />;
    case Category.Volcanoes: return <Mountain size={size} className="text-red-400" />;
    case Category.Glaciers: return <Thermometer size={size} className="text-blue-200" />;
    case Category.Wildlife: return <Bird size={size} className="text-green-400" />;
    case Category.History: return <History size={size} className="text-yellow-600" />;
    case Category.Water: return <Droplets size={size} className="text-blue-400" />;
    case Category.Perlan: return <Building2 size={size} className="text-gray-400" />;
    case Category.Christmas: return <Gift size={size} className="text-red-500" />;
    default: return <BrainCircuit size={size} className="text-white" />;
  }
};

// --- Reusable UI Components ---

interface SelectOption {
    label: string;
    value: string | number;
}

const CustomSelect = ({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  className = "",
  zIndex = 50
}: {
  label?: string;
  value: string | number;
  options: SelectOption[];
  onChange: (val: any) => void;
  placeholder?: string;
  className?: string;
  zIndex?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ zIndex: isOpen ? zIndex + 10 : zIndex }}>
      {label && <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">{label}</label>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 font-bold text-left flex justify-between items-center focus:outline-none focus:border-[#0057A0] focus:ring-2 focus:ring-[#0057A0]/10 transition-all hover:bg-white shadow-sm"
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={`transition-transform duration-300 text-[#0057A0] ${isOpen ? 'rotate-180' : ''}`} size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar-blue border-2 border-blue-50 animate-slide-up overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-6 py-3 text-sm font-bold transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center
                ${value === opt.value ? 'bg-blue-50 text-[#0057A0]' : 'text-slate-600 hover:bg-gray-50 hover:text-[#0057A0]'}
              `}
            >
              {opt.label}
              {value === opt.value && <Check size={16} className="text-[#0057A0]" />}
            </button>
          ))}
          <div className="h-4 bg-gradient-to-t from-white to-transparent pointer-events-none sticky bottom-0" />
        </div>
      )}
    </div>
  );
};

// --- Modal Components ---

const LeaderboardModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<PlayerStats[]>([]);

  useEffect(() => {
    if (isOpen) {
      const allStats = getAllStats();
      setStats(allStats.sort((a, b) => b.totalScore - a.totalScore).slice(0, 10));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#003D73] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-slide-up border border-white/20">
        <div className="p-6 pb-2 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
             <div className="bg-yellow-400 p-2 rounded-lg text-slate-900">
                <Trophy size={20} fill="currentColor" />
             </div>
             <h2 className="font-heading font-bold text-xl">Top Players</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
           {stats.length === 0 ? (
             <div className="text-center text-blue-200 py-8">No games played yet. Be the first!</div>
           ) : (
             <div className="space-y-3">
               {stats.map((player, index) => (
                 <div key={player.username} className="flex items-center bg-[#0057A0]/50 p-4 rounded-2xl border border-white/5">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-900 mr-4 flex-shrink-0
                      ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : index === 2 ? 'bg-orange-400' : 'bg-white/20 text-white'}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{player.username}</p>
                      <p className="text-blue-300 text-xs">{player.totalGames} Games Played</p>
                    </div>
                    <div className="text-right">
                       <p className="text-white font-bold text-lg">{player.totalScore}</p>
                       <p className="text-xs text-blue-300 uppercase font-bold">Score</p>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// --- Learning Components ---

const FlashcardComponent: React.FC<{ cards: {front: string, back: string}[], onComplete: () => void }> = ({ cards, onComplete }) => {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = () => {
        setIsFlipped(false);
        if (index < cards.length - 1) {
            setTimeout(() => setIndex(index + 1), 300);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        setIsFlipped(false);
        if (index > 0) {
            setTimeout(() => setIndex(index - 1), 300);
        }
    };

    return (
        <div className="flex flex-col items-center w-full">
             <div className="w-full aspect-[4/3] relative mb-6 cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
                <div 
                    className="w-full h-full relative transition-all duration-500" 
                    style={{ 
                        transformStyle: 'preserve-3d', 
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                    }}
                >
                    {/* Front */}
                    <div 
                        className="absolute inset-0 bg-[#0057A0] rounded-3xl shadow-xl flex flex-col items-center justify-center p-6 text-center border-4 border-white/20"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                         <div className="bg-white/20 p-3 rounded-full mb-4"><Sparkles size={32} className="text-white" /></div>
                         <h3 className="text-2xl font-bold text-white font-heading">{cards[index].front}</h3>
                         <p className="absolute bottom-6 text-blue-200 text-xs uppercase tracking-widest">Tap to flip</p>
                    </div>
                    
                    {/* Back */}
                    <div 
                        className="absolute inset-0 bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-6 text-center"
                        style={{ 
                            transform: 'rotateY(180deg)',
                            backfaceVisibility: 'hidden' 
                        }}
                    >
                         <h3 className="text-lg font-medium text-slate-800 leading-relaxed">{cards[index].back}</h3>
                    </div>
                </div>
             </div>
             
             <div className="flex justify-between items-center w-full mt-2">
                <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={handlePrev} 
                    disabled={index === 0}
                    className={`shadow-sm border-0 ${index === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ChevronLeft size={16} /> Prev
                </Button>

                <div className="text-slate-400 font-bold text-sm">{index + 1} / {cards.length}</div>
                
                <Button size="sm" onClick={handleNext} className="shadow-md bg-[#0057A0]">
                    {index === cards.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
                </Button>
             </div>
        </div>
    );
};

const MiniQuizComponent: React.FC<{ quiz: {question: string, options: string[], correctIndex: number}, onComplete: () => void }> = ({ quiz, onComplete }) => {
    const [selected, setSelected] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const handleCheck = (idx: number) => {
        setSelected(idx);
        const correct = idx === quiz.correctIndex;
        setIsCorrect(correct);
        if (correct) {
            setTimeout(onComplete, 1500);
        }
    };

    return (
        <div className="w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{quiz.question}</h3>
            <div className="space-y-2">
                {quiz.options.map((opt, idx) => (
                    <button 
                        key={idx}
                        disabled={isCorrect === true}
                        onClick={() => handleCheck(idx)}
                        className={`w-full p-4 rounded-xl text-left font-bold transition-all border-2
                            ${selected === idx 
                                ? (isCorrect ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700')
                                : 'bg-white border-slate-100 hover:border-blue-200 text-slate-600'
                            }
                        `}
                    >
                        <div className="flex justify-between items-center">
                            {opt}
                            {selected === idx && (isCorrect ? <Check size={20}/> : <X size={20}/>)}
                        </div>
                    </button>
                ))}
            </div>
            {isCorrect === false && (
                <div className="mt-4 text-center text-red-500 font-bold animate-bounce-short">Try again!</div>
            )}
            {isCorrect === true && (
                <div className="mt-4 text-center text-green-500 font-bold animate-fade-in">Correct! Moving on...</div>
            )}
        </div>
    )
}

const LearningScreen: React.FC<{ onBack: () => void, username?: string }> = ({ onBack, username = "Guest" }) => {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [activeModule, setActiveModule] = useState<LearningModule | null>(null);
  const [progress, setProgress] = useState<UserProgress>({ username, completedUnitIds: [] });
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  useEffect(() => {
      setModules(getLearningModules());
      if (username) {
        setProgress(getUserProgress(username));
      }
  }, [username]);

  const handleCompleteUnit = (unitId: string) => {
    if (progress.completedUnitIds.includes(unitId)) return;
    
    const newProgress = {
      ...progress,
      completedUnitIds: [...progress.completedUnitIds, unitId]
    };
    setProgress(newProgress);
    saveUserProgress(newProgress);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto text-white relative pb-8">
       {/* Header */}
       <div className="p-6 flex items-center gap-4">
          <button onClick={activeModule ? () => setActiveModule(null) : onBack} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition backdrop-blur-md">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-heading font-bold text-2xl">{activeModule ? activeModule.category : "Learn"}</h1>
       </div>

       {/* Main Module List */}
       {!activeModule && (
         <div className="px-6 space-y-4 animate-fade-in">
            {modules.map((mod) => {
               const totalUnits = mod.units.length;
               const completedCount = mod.units.filter(u => progress.completedUnitIds.includes(u.id)).length;
               const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

               return (
                 <button 
                   key={mod.id}
                   onClick={() => setActiveModule(mod)}
                   className="w-full bg-white text-left rounded-3xl p-5 shadow-lg border-b-4 border-blue-100 active:border-b-0 active:translate-y-1 transition-all relative overflow-hidden group"
                 >
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-blue-50 p-3 rounded-2xl text-[#0057A0]">
                            <CategoryIcon category={mod.category} size={28} />
                        </div>
                        <span className="text-xs font-extrabold bg-blue-100 text-[#0057A0] px-2 py-1 rounded-lg">
                            {completedCount}/{totalUnits}
                        </span>
                    </div>
                    <h3 className="text-[#003D73] font-bold text-xl mb-1">{mod.category}</h3>
                    <p className="text-slate-500 text-sm font-medium mb-4 line-clamp-2">{mod.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#30C050] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }} 
                        />
                    </div>
                 </button>
               )
            })}
         </div>
       )}

       {/* Detailed Module View (Winding Path Style) */}
       {activeModule && (
          <div className="flex-1 relative overflow-y-auto custom-scrollbar pb-20">
              {/* Path Background Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-white/10 -translate-x-1/2 z-0"></div>

              <div className="px-6 pt-8 space-y-12">
                  {activeModule.units.map((unit, idx) => {
                    const isCompleted = progress.completedUnitIds.includes(unit.id);
                    const isLocked = idx > 0 && !progress.completedUnitIds.includes(activeModule.units[idx - 1].id);
                    const isExpanded = expandedUnit === unit.id;
                    
                    // ZigZag Logic
                    const isLeft = idx % 2 === 0;

                    return (
                      <div key={unit.id} className={`relative flex ${isLeft ? 'justify-start' : 'justify-end'} ${isLocked ? 'opacity-60 grayscale' : ''}`}>
                         
                         <div className={`relative z-10 flex flex-col items-center ${isLeft ? 'mr-auto ml-4' : 'ml-auto mr-4'}`}>
                             
                             {/* Node Circle */}
                             <button 
                                disabled={isLocked}
                                onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                                className={`
                                  w-20 h-20 rounded-full border-[6px] flex items-center justify-center shadow-xl transition-all
                                  ${isCompleted ? 'bg-[#30C050] border-[#24963d] text-white' : 'bg-white border-blue-200 text-gray-300'}
                                  ${!isLocked && !isCompleted ? 'hover:scale-110 active:scale-95 animate-bounce-short' : ''}
                                  ${isExpanded ? 'ring-4 ring-white/50' : ''}
                                `}
                             >
                                {isCompleted ? <Check size={36} strokeWidth={4} /> : unit.type === 'flashcards' ? <Sparkles size={32} className="text-[#0057A0]"/> : unit.type === 'quiz' ? <BrainCircuit size={32} className="text-[#0057A0]"/> : <BookOpen size={32} className={isLocked ? "text-gray-300" : "text-[#0057A0]"} />}
                             </button>

                             {/* Unit Title Label */}
                             <div className="mt-3 bg-[#003D73] px-4 py-1.5 rounded-xl shadow-md border border-white/10">
                                <p className="text-xs font-bold text-white uppercase tracking-wide">{unit.title}</p>
                             </div>
                         </div>

                         {/* Expanded Content Card - Modal overlay style */}
                         {isExpanded && !isLocked && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up relative max-h-[80vh] overflow-y-auto custom-scrollbar-blue">
                                    <button onClick={() => setExpandedUnit(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
                                    
                                    <div className="flex items-center gap-2 mb-4 text-[#0057A0]">
                                        {unit.type === 'flashcards' ? <Sparkles size={20}/> : unit.type === 'quiz' ? <BrainCircuit size={20}/> : <BookOpen size={20}/>}
                                        <span className="text-sm font-bold uppercase tracking-wide">{unit.type === 'text' ? 'Read' : unit.type === 'flashcards' ? 'Practice' : 'Quiz'} • {unit.duration}</span>
                                    </div>
                                    
                                    <h2 className="text-2xl font-heading font-bold text-slate-800 mb-6">{unit.title}</h2>

                                    {/* Content Logic */}
                                    {unit.type === 'text' && (
                                        <>
                                            <p className="text-lg leading-relaxed font-medium text-slate-600 mb-8">{unit.content}</p>
                                            <Button fullWidth variant={isCompleted ? 'success' : 'primary'} onClick={() => { handleCompleteUnit(unit.id); setExpandedUnit(null); }} disabled={isCompleted}>
                                                {isCompleted ? "Completed" : "Mark Complete"}
                                            </Button>
                                        </>
                                    )}

                                    {unit.type === 'flashcards' && unit.flashcards && (
                                        <FlashcardComponent cards={unit.flashcards} onComplete={() => { handleCompleteUnit(unit.id); setExpandedUnit(null); }} />
                                    )}

                                    {unit.type === 'quiz' && unit.quiz && (
                                        <MiniQuizComponent quiz={unit.quiz} onComplete={() => { handleCompleteUnit(unit.id); setExpandedUnit(null); }} />
                                    )}

                                </div>
                            </div>
                         )}
                      </div>
                    )
                  })}
              </div>
          </div>
       )}
    </div>
  )
};


// --- Views ---

const HomeScreen: React.FC<{ onStart: (config: GameConfig) => void, onAdmin: () => void, onLearning: () => void }> = ({ onStart, onAdmin, onLearning }) => {
  const [name, setName] = useState('');
  const [categoryMode, setCategoryMode] = useState<'general' | 'specific' | null>(null);
  const [category, setCategory] = useState<Category>(Category.NorthernLights);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [challenge, setChallenge] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleStart = () => {
    if (name.trim().length < 2) {
      alert("Please enter a valid name");
      return;
    }
    const selectedCategory = categoryMode === 'general' ? Category.General : category;
    onStart({ username: name.trim(), category: selectedCategory, difficulty, isChallengeMode: challenge });
  };

  return (
    <div className="flex flex-col min-h-screen p-6 text-white max-w-md mx-auto relative">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
            <button 
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-sm font-bold transition backdrop-blur-md"
            >
            <Trophy size={16} className="text-yellow-400" />
            <span>Leaderboard</span>
            </button>
            <button 
            onClick={onLearning}
            className="flex items-center gap-2 bg-[#30C050]/20 hover:bg-[#30C050]/40 border border-[#30C050]/50 px-3 py-2 rounded-full text-sm font-bold transition backdrop-blur-md"
            >
            <BookOpen size={16} className="text-[#30C050]" />
            <span>Learn</span>
            </button>
        </div>
        <button onClick={onAdmin} className="text-white/50 hover:text-white transition p-2">
          <Lock size={20} />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col justify-center items-center space-y-6">
        <div className="text-center space-y-1 mb-4">
          <h1 className="font-heading font-extrabold text-4xl tracking-tight text-white drop-shadow-sm">Perlan Museum</h1>
          <p className="font-heading font-bold text-2xl text-blue-200 tracking-wide">Game</p>
        </div>

        <div className="w-full space-y-5 bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-xl">
          
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-blue-200 ml-2 tracking-wider">Player Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your name"
              className="w-full bg-white/20 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition font-medium text-lg"
            />
          </div>

          {/* Mode Selection Buttons - Minimalist */}
          <div className="grid grid-cols-2 gap-3">
             <button 
                onClick={() => setCategoryMode('general')}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 
                   ${categoryMode === 'general' ? 'bg-white text-[#0057A0] shadow-md scale-[1.02]' : 'bg-transparent border border-white/30 text-white hover:bg-white/10'}
                `}
             >
                General
             </button>
             <button 
                onClick={() => setCategoryMode('specific')}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200
                   ${categoryMode === 'specific' ? 'bg-white text-[#0057A0] shadow-md scale-[1.02]' : 'bg-transparent border border-white/30 text-white hover:bg-white/10'}
                `}
             >
                Categories
             </button>
          </div>

          {/* Custom Category Dropdown */}
          {categoryMode === 'specific' && (
            <div className="relative animate-fade-in z-20">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white text-[#0057A0] rounded-2xl px-5 py-4 font-bold text-base shadow-md flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span>{category}</span>
                  <ChevronDown className={`transition-transform duration-300 text-[#0057A0] ${isDropdownOpen ? 'rotate-180' : ''}`} size={20} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar-blue border-4 border-blue-50 animate-slide-up">
                     {Object.values(Category).filter(c => c !== Category.General).map((cat) => (
                       <button
                         key={cat}
                         onClick={() => { setCategory(cat); setIsDropdownOpen(false); }}
                         className={`w-full text-left px-6 py-3.5 text-sm font-bold transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center
                           ${category === cat ? 'bg-blue-50 text-[#0057A0]' : 'text-slate-600 hover:bg-gray-50 hover:text-[#0057A0]'}
                         `}
                       >
                         {cat}
                         {category === cat && <Check size={16} className="text-[#0057A0]"/>}
                       </button>
                     ))}
                     <div className="h-8 bg-gradient-to-t from-white to-transparent pointer-events-none sticky bottom-0" />
                  </div>
                )}
                
                {/* Click outside listener background */}
                {isDropdownOpen && (
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)}></div>
                )}
            </div>
          )}

          {/* Difficulty */}
          <div className="space-y-2 pt-2">
            <label className="text-xs uppercase font-bold text-blue-200 ml-2 tracking-wider">Difficulty</label>
            <div className="bg-black/20 p-1 rounded-2xl grid grid-cols-3">
              {Object.values(Difficulty).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all duration-300 ${difficulty === d ? 'bg-white text-[#0057A0] shadow-md' : 'text-white/70 hover:text-white'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Challenge Mode - Minimalist */}
          <button 
            onClick={() => setChallenge(!challenge)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 
              ${challenge ? 'border-white/60 bg-white/5' : 'border-white/20 hover:border-white/40'}`}
          >
             <div className="flex items-center gap-3">
                <Clock size={18} className="text-blue-200"/>
                <div className="text-left">
                    <p className="font-bold text-sm text-white">Challenge Mode</p>
                    <p className="text-[10px] text-blue-200">15s per question</p>
                </div>
             </div>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${challenge ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-white/30'}`}>
                 {challenge && <Check size={12} strokeWidth={4} />}
             </div>
          </button>

          <Button 
            fullWidth 
            size="lg" 
            onClick={handleStart} 
            disabled={!name || !categoryMode}
            className="mt-4 shadow-xl text-lg py-4 bg-[#0057A0] border-[#003D73] hover:bg-[#003D73]"
          >
            Start Game
          </Button>
        </div>
      </div>

      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </div>
  );
};

const GameScreen: React.FC<{ config: GameConfig, onEnd: (result: GameResult) => void, onBack: () => void }> = ({ config, onEnd, onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.isChallengeMode ? 15 : 0);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [startCountdown, setStartCountdown] = useState<number | null>(3);
  const [isGameActive, setIsGameActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const allQuestions = getQuestions();
    let filtered = config.category !== Category.General 
        ? allQuestions.filter(q => q.category === config.category && q.difficulty === config.difficulty)
        : allQuestions; 
    
    if (config.category === Category.General) {
        filtered = allQuestions.filter(q => q.difficulty === config.difficulty);
        if (filtered.length < 10) filtered = allQuestions;
    } else {
        const difficultQs = filtered.filter(q => q.difficulty === config.difficulty);
        if (difficultQs.length >= 5) {
            filtered = difficultQs;
        }
    }
    
    const shuffledQs = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 10);
    if (shuffledQs.length === 0) {
       alert("Not enough questions! Please ask an admin to add more.");
       onBack();
       return;
    }

    // Randomize Option Order for each question using Fisher-Yates shuffle
    const finalQuestions = shuffledQs.map(q => {
        const indices = [0, 1, 2];
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        const newOptions = indices.map(i => q.options[i]);
        const newCorrectIndex = indices.indexOf(q.correctIndex);

        return {
            ...q,
            options: newOptions,
            correctIndex: newCorrectIndex
        };
    });

    setQuestions(finalQuestions);
  }, [config, onBack]);

  useEffect(() => {
      if (startCountdown !== null && startCountdown > 0) {
          const timer = setTimeout(() => setStartCountdown(startCountdown - 1), 1000);
          return () => clearTimeout(timer);
      } else if (startCountdown === 0) {
          setTimeout(() => {
              setStartCountdown(null);
              setIsGameActive(true);
          }, 500);
      }
  }, [startCountdown]);

  useEffect(() => {
    if (isGameActive && config.isChallengeMode && !isAnswered && questions.length > 0) {
      setTimeLeft(15);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleAnswer(-1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, isAnswered, config.isChallengeMode, questions, isGameActive]);

  const handleAnswer = (optionIndex: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    
    const currentQ = questions[currentIndex];
    const correct = optionIndex === currentQ.correctIndex;
    
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
    } else {
      setStreak(0);
    }

    let originalIndex = -1;
    if (optionIndex >= 0) {
        const selectedText = currentQ.options[optionIndex];
        const allQs = getQuestions();
        const originalQ = allQs.find(q => q.id === currentQ.id);
        if (originalQ) {
            originalIndex = originalQ.options.indexOf(selectedText);
        }
    }

    setAnswers(prev => [...prev, {
      questionId: currentQ.id,
      selectedOptionIndex: originalIndex,
      isCorrect: correct,
      timeTaken: config.isChallengeMode ? 15 - timeLeft : 0 
    }]);
  };

  const nextQuestion = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      saveGameResult({
        id: Date.now().toString(),
        timestamp: Date.now(),
        username: config.username,
        config,
        score: answers.filter(a => a.isCorrect).length, 
        totalQuestions: questions.length,
        answers: answers,
        streakMax: maxStreak
      });
      onEnd({
        id: Date.now().toString(),
        timestamp: Date.now(),
        username: config.username,
        config,
        score: answers.filter(a => a.isCorrect).length, 
        totalQuestions: questions.length,
        answers: answers,
        streakMax: maxStreak
      });
    }
  };

  if (startCountdown !== null) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-[#0057A0] text-white">
              <div className="text-center animate-bounce-short">
                 <div className="text-8xl font-heading font-black drop-shadow-lg mb-4">
                     {startCountdown > 0 ? startCountdown : "GO!"}
                 </div>
                 <p className="text-xl font-medium opacity-80 uppercase tracking-widest">Are you ready?</p>
              </div>
          </div>
      )
  }
  
  if (questions.length === 0) return null;
  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto p-4 relative pb-8">
      <div className="flex justify-between items-center text-white mb-4 mt-2">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition"><ArrowLeft size={24}/></button>
        <div className="flex space-x-1">
            {questions.map((_, idx) => (
                <div key={idx} className={`h-1.5 w-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-white' : idx < currentIndex ? 'bg-white/50' : 'bg-white/20'}`}/>
            ))}
        </div>
        <div className="flex items-center space-x-1 min-w-[3rem] justify-end">
            {streak > 1 && <div className="flex items-center text-yellow-400 font-bold animate-bounce-short"><Zap size={18} fill="currentColor" /><span className="ml-1">{streak}</span></div>}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-[#0057A0] text-white rounded-3xl p-6 md:p-8 shadow-xl mb-4 flex-grow-0 min-h-[200px] flex flex-col justify-center items-center text-center relative z-10 border border-white/10">
        {config.isChallengeMode && (
             <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1 ${timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-700'}`}>
                 <Clock size={14} />{timeLeft}s
             </div>
        )}
        <span className="absolute top-4 left-4 text-[10px] font-extrabold text-blue-200 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-md">{currentQ.category}</span>
        <h2 className="text-lg md:text-xl font-heading font-extrabold leading-snug mt-4">{currentQ.text}</h2>
      </div>

      {/* Timeout Banner */}
      {isAnswered && selectedOption === -1 && (
         <div className="bg-red-500 text-white text-center py-2 px-4 rounded-xl mb-4 font-bold uppercase tracking-widest animate-bounce-short shadow-lg border border-white/20">
            CLOCK RUN OUT!
         </div>
      )}

      <div className="space-y-3 mb-4">
        {currentQ.options.map((opt, idx) => {
           let style = "bg-white/90 text-slate-700 hover:bg-white";
           let iconStyle = "border-gray-300 text-gray-400";
           if (isAnswered) {
               if (idx === currentQ.correctIndex) {
                   style = "bg-green-500 text-white border-green-500 shadow-lg transform scale-[1.02]";
                   iconStyle = "border-white text-white";
               } else if (selectedOption === idx) {
                   style = "bg-red-500 text-white border-red-500 opacity-90";
                   iconStyle = "border-white text-white";
               } else {
                   style = "bg-white/40 text-slate-800 opacity-50";
               }
           } else if (selectedOption === idx) {
               style = "bg-[#0057A0] text-white";
               iconStyle = "border-white text-white";
           }
           return (
            <button key={idx} disabled={isAnswered} onClick={() => handleAnswer(idx)} className={`w-full p-4 rounded-2xl text-left font-bold text-base transition-all duration-300 shadow-sm border-b-4 border-transparent active:scale-[0.98] flex items-center ${style}`}>
                <div className={`w-8 h-8 rounded-lg border-2 flex-shrink-0 flex items-center justify-center mr-4 font-bold text-sm transition-colors ${iconStyle}`}>{String.fromCharCode(65 + idx)}</div>
                <span className="leading-tight">{opt}</span>
                {isAnswered && idx === currentQ.correctIndex && <Check className="ml-auto" />}
                {isAnswered && selectedOption === idx && idx !== currentQ.correctIndex && <X className="ml-auto" />}
            </button>
           )
        })}
      </div>

      {isAnswered && (
          <div className="animate-slide-up bg-[#003D73] p-4 rounded-2xl border border-white/20 text-white shadow-lg mt-auto">
             <div className="flex items-start gap-3 mb-3">
                <div className="bg-yellow-400/20 p-1.5 rounded-lg text-yellow-300 flex-shrink-0 mt-0.5"><Lightbulb size={18} /></div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase text-blue-200 tracking-wider mb-0.5">Did you know?</p>
                    <p className="text-sm leading-snug text-white/90">{currentQ.fact}</p>
                </div>
             </div>
             <Button fullWidth onClick={nextQuestion} className="bg-[#0057A0] text-white hover:bg-[#0057A0]/80 border-b-4 border-black/20 hover:border-black/30">
                 {currentIndex === questions.length - 1 ? 'Finish Game' : 'Next Question'}
             </Button>
          </div>
      )}
    </div>
  );
};

const ResultScreen: React.FC<{ result: GameResult, onHome: () => void }> = ({ result, onHome }) => {
  
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  const [expandedReview, setExpandedReview] = useState<boolean>(false);
  
  let message = "Good effort!";
  if (percentage >= 90) message = "Perlan Expert!";
  else if (percentage >= 70) message = "Great Knowledge!";
  else if (percentage >= 50) message = "Keep Exploring!";

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto p-6 text-white items-center justify-center pb-12">
        <div className="bg-white/10 rounded-full p-6 mb-6 animate-bounce-short"><Trophy size={48} className="text-yellow-400" /></div>
        <h1 className="text-4xl font-heading font-bold mb-2 text-center">{message}</h1>
        <p className="text-blue-200 mb-8 text-center">You scored {result.score} out of {result.totalQuestions}</p>

        <div className="w-full bg-[#003D73] rounded-3xl p-8 shadow-xl mb-6 text-center border border-blue-400/30">
             <div className="text-7xl font-black text-white mb-4 tracking-tighter drop-shadow-md">{percentage}%</div>
             <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                 <div className="flex flex-col items-center">
                     <span className="text-3xl font-bold text-white">{result.streakMax}</span>
                     <span className="text-xs text-blue-200 uppercase font-bold tracking-wider">Best Streak</span>
                 </div>
                 <div className="flex flex-col items-center border-l border-white/10">
                     <span className="text-3xl font-bold text-white capitalize">{result.config.difficulty}</span>
                     <span className="text-xs text-blue-200 uppercase font-bold tracking-wider">Level</span>
                 </div>
             </div>
        </div>

        <div className="w-full mb-6">
             <button onClick={() => setExpandedReview(!expandedReview)} className="w-full bg-[#0057A0] hover:bg-[#003D73] p-4 rounded-xl flex justify-between items-center transition text-white border border-white/20">
                 <span className="font-bold">Review Answers</span>
                 {expandedReview ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
             </button>

             {expandedReview && (
                 <div className="mt-4 space-y-4 animate-fade-in max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {result.answers.map((ans, idx) => {
                        const allQs = getQuestions();
                        const q = allQs.find(q => q.id === ans.questionId);
                        if (!q) return null;
                        
                        const userAnswerText = ans.selectedOptionIndex >= 0 ? q.options[ans.selectedOptionIndex] : "Time Ran Out";
                        const correctAnswerText = q.options[q.correctIndex];
                        const isTimeOut = ans.selectedOptionIndex === -1;

                        return (
                            <div key={idx} className="bg-[#003D73] text-white p-5 rounded-2xl text-sm shadow-sm border border-white/10 space-y-3">
                                <div className="flex gap-3">
                                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${ans.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {idx + 1}
                                    </div>
                                    <p className="font-bold text-base text-white leading-snug">{q.text}</p>
                                </div>

                                <div className="bg-black/20 rounded-xl p-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <div className="min-w-[80px] text-xs font-bold uppercase tracking-wide text-white/50 mt-0.5">You Chose</div>
                                        <div className={`font-bold ${ans.isCorrect ? 'text-green-400' : isTimeOut ? 'text-orange-400 flex items-center' : 'text-red-400'}`}>
                                            {isTimeOut && <Clock size={14} className="inline mr-1" />}
                                            {userAnswerText}
                                            {ans.isCorrect && <Check size={14} className="inline ml-2"/>}
                                            {!ans.isCorrect && !isTimeOut && <X size={14} className="inline ml-2"/>}
                                        </div>
                                    </div>
                                    
                                    {!ans.isCorrect && (
                                        <div className="flex items-start gap-2 border-t border-white/5 pt-2">
                                            <div className="min-w-[80px] text-xs font-bold uppercase tracking-wide text-white/50 mt-0.5">Correct</div>
                                            <div className="font-bold text-green-400">
                                                {correctAnswerText} <Check size={14} className="inline ml-2"/>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 text-xs text-blue-200 italic bg-white/5 p-3 rounded-lg border border-white/5">
                                    <Lightbulb size={14} className="flex-shrink-0 text-yellow-400"/>
                                    <span>{q.fact}</span>
                                </div>
                            </div>
                        )
                    })}
                 </div>
             )}
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
            <Button onClick={onHome} className="shadow-lg bg-[#0057A0] text-white border-[#003D73]">Home</Button>
            <Button onClick={onHome} className="shadow-lg bg-[#0057A0] text-white border-[#003D73]">Play Again</Button>
        </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [stats, setStats] = useState<any[]>([]);
  const [allResults, setAllResults] = useState<GameResult[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [learningModules, setLearningModules] = useState<LearningModule[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'questions' | 'learning'>('stats');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genCategory, setGenCategory] = useState<Category>(Category.NorthernLights);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Manual Add State
  const [newQ, setNewQ] = useState<Partial<Question>>({
      text: '', options: ['', '', ''], correctIndex: 0, fact: '', difficulty: Difficulty.Medium, category: Category.NorthernLights
  });

  // Learning Editor State
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  useEffect(() => {
    setStats(getAllStats());
    setQuestions(getQuestions());
    setAllResults(getAllResults());
    setLearningModules(getLearningModules());
  }, []);

  const refreshLearning = () => {
      setLearningModules(getLearningModules());
  }

  const handleDeleteQuestion = async (id: string) => {
      if (confirm("Are you sure?")) {
          await deleteQuestion(id);
          setQuestions(getQuestions());
      }
  };

  const handleManualAdd = async () => {
      if (!newQ.text || !newQ.options?.[0] || !newQ.options?.[1] || !newQ.options?.[2] || !newQ.fact) {
          alert("Please fill in all fields");
          return;
      }
      await addQuestion({
          id: uuidv4(),
          text: newQ.text,
          options: newQ.options,
          correctIndex: newQ.correctIndex || 0,
          fact: newQ.fact,
          category: newQ.category || Category.General,
          difficulty: newQ.difficulty || Difficulty.Medium
      });
      setQuestions(getQuestions());
      setNewQ({ text: '', options: ['', '', ''], correctIndex: 0, fact: '', difficulty: Difficulty.Medium, category: Category.NorthernLights });
      alert("Question added!");
  };

  const handleGenerate = async () => {
      setIsGenerating(true);
      try {
          const newQs = await generateQuestionsWithAI(genCategory, Difficulty.Medium, 5);
          for(const q of newQs) {
            await addQuestion(q);
          }
          setQuestions(getQuestions());
          alert(`Added ${newQs.length} new questions!`);
      } catch (e) {
          alert("Error generating questions.");
      } finally {
          setIsGenerating(false);
      }
  };

  const categoryStats = allResults.reduce((acc, curr) => {
      const cat = curr.config.category;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  const pieData = Object.keys(categoryStats).map(key => ({ name: key, value: categoryStats[key] }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  const filteredQuestions = questions.filter(q => {
    const matchesCategory = filterCategory === 'All' || q.category === filterCategory;
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const inputClasses = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-[#0057A0] focus:ring-4 focus:ring-[#0057A0]/10 transition-all placeholder:text-slate-400 appearance-none";
  const labelClasses = "block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1";

  // --- Learning Editor Logic ---
  const handleCreateModule = async () => {
      const newMod: LearningModule = {
          id: uuidv4(),
          category: Category.General,
          description: "New Learning Module",
          units: []
      };
      const updated = [...learningModules, newMod];
      setLearningModules(updated);
      await saveLearningModules(updated);
      setEditingModuleId(newMod.id);
  };

  const handleDeleteModule = async (id: string) => {
      if (confirm("Delete this entire module?")) {
        const updated = learningModules.filter(m => m.id !== id);
        setLearningModules(updated);
        if(editingModuleId === id) setEditingModuleId(null);
        await deleteLearningModuleFromCloud(id);
        await saveLearningModules(updated); // Saves the remaining array to local
      }
  }

  const updateModule = async (mod: LearningModule) => {
      const updated = learningModules.map(m => m.id === mod.id ? mod : m);
      setLearningModules(updated);
      // We only need to save THIS module to the cloud
      await saveLearningModules([mod]); 
  }

  const editingModule = learningModules.find(m => m.id === editingModuleId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10 font-sans">
        <div className="bg-white border-b px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2 text-[#0057A0]"><Building2 className="fill-current" /><h1 className="text-xl font-heading font-bold">Manager Board</h1></div>
            <button onClick={onLogout} className="text-gray-500 hover:text-red-500 font-medium text-sm">Log Out</button>
        </div>

        <div className="max-w-6xl mx-auto p-6">
            <div className="flex p-1 bg-gray-200 rounded-xl w-fit mb-8">
                <button onClick={() => setActiveTab('stats')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-white text-[#0057A0] shadow-sm' : 'text-gray-500'}`}>Overview</button>
                <button onClick={() => setActiveTab('questions')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'questions' ? 'bg-white text-[#0057A0] shadow-sm' : 'text-gray-500'}`}>Question Bank</button>
                <button onClick={() => setActiveTab('learning')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'learning' ? 'bg-white text-[#0057A0] shadow-sm' : 'text-gray-500'}`}>Course Editor</button>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                     {/* (Stats View Code - same as before) */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Games</p>
                            <p className="text-3xl font-bold text-slate-800 mt-1">{allResults.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unique Players</p>
                             <p className="text-3xl font-bold text-slate-800 mt-1">{stats.length}</p>
                        </div>
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Score</p>
                             <p className="text-3xl font-bold text-slate-800 mt-1">{allResults.length > 0 ? Math.round(allResults.reduce((acc, cur) => acc + cur.score, 0) / allResults.length) : 0}/10</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <h2 className="font-bold text-lg mb-4">Popular Categories</h2>
                         <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><RePie><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /></RePie></ResponsiveContainer></div>
                    </div>
                </div>
            )}

            {activeTab === 'questions' && (
                <div className="space-y-6 animate-fade-in">
                     {/* (Manual Entry Form & Question List - same as before) */}
                     <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-100 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0057A0] to-[#003D73] rounded-t-3xl"></div>
                        <h2 className="font-heading font-bold text-2xl mb-6 text-slate-800 flex items-center gap-3 pt-2">
                            <div className="bg-blue-100 p-2 rounded-xl text-[#0057A0]">
                                <PlusCircle size={24} />
                            </div>
                            Add New Question
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <CustomSelect label="Category" value={newQ.category || Category.NorthernLights} options={Object.values(Category).map(c => ({ label: c, value: c }))} onChange={(val) => setNewQ({...newQ, category: val})} zIndex={60} />
                            </div>
                            <div>
                                <CustomSelect label="Difficulty" value={newQ.difficulty || Difficulty.Medium} options={Object.values(Difficulty).map(d => ({ label: d, value: d }))} onChange={(val) => setNewQ({...newQ, difficulty: val})} zIndex={50} />
                            </div>
                        </div>
                        <div className="mb-6"><label className={labelClasses}>Question Text</label><input className={inputClasses} placeholder="e.g. What is the capital of Iceland?" value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} /></div>
                        <div className="mb-6"><label className={labelClasses}>Answer Options</label><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[0,1,2].map(i => (<div key={i} className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#0057A0] text-sm">{String.fromCharCode(65+i)}</span><input className={`${inputClasses} pl-10`} placeholder={`Option ${String.fromCharCode(65+i)}`} value={newQ.options?.[i]} onChange={e => {const ops = [...(newQ.options || [])]; ops[i] = e.target.value; setNewQ({...newQ, options: ops})}} /></div>))}</div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div><CustomSelect label="Correct Answer" value={newQ.correctIndex || 0} options={[{ label: 'Option A', value: 0 }, { label: 'Option B', value: 1 }, { label: 'Option C', value: 2 }]} onChange={(val) => setNewQ({...newQ, correctIndex: Number(val)})} zIndex={40} /></div><div><label className={labelClasses}>Did You Know?</label><input className={inputClasses} placeholder="Short interesting fact..." value={newQ.fact} onChange={e => setNewQ({...newQ, fact: e.target.value})} /></div></div>
                        <Button fullWidth onClick={handleManualAdd} className="shadow-lg text-lg bg-[#0057A0] hover:bg-[#003D73]">Save Question</Button>
                     </div>

                     <div className="bg-gradient-to-br from-[#0057A0] to-[#003D73] p-6 rounded-2xl text-white shadow-lg relative overflow-visible z-30">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div><h2 className="font-bold text-xl">AI Question Generator</h2><p className="text-blue-100 text-sm">Generate new questions instantly.</p></div>
                            <div className="flex gap-2 items-center"><div className="w-48"><CustomSelect value={genCategory} options={Object.values(Category).map(c => ({ label: c, value: c }))} onChange={(val) => setGenCategory(val)} zIndex={100} /></div><Button onClick={handleGenerate} disabled={isGenerating} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 border-yellow-500 font-bold shadow-md whitespace-nowrap h-[50px]">{isGenerating ? "Generating..." : "Generate 5"}</Button></div>
                        </div>
                     </div>

                     <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                            <div><h2 className="font-heading font-bold text-2xl text-slate-800">Question Database</h2><p className="text-slate-500 font-medium mt-1">Total Questions: <span className="text-[#0057A0] font-bold">{filteredQuestions.length}</span></p></div>
                            <div className="flex flex-col md:flex-row w-full lg:w-auto gap-4">
                                <div className="relative flex-1 md:w-72"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Search questions..." className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-700 font-semibold focus:bg-white focus:border-[#0057A0] focus:ring-4 focus:ring-[#0057A0]/10 transition-all outline-none placeholder:text-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                                <div className="relative md:w-56 z-20"><CustomSelect value={filterCategory} options={[{ label: 'All Categories', value: 'All' }, ...Object.values(Category).map(c => ({ label: c, value: c }))]} onChange={(val) => setFilterCategory(val)} zIndex={20} /></div>
                            </div>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar-blue">
                            {filteredQuestions.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-slate-50"><Search size={48} className="mb-4 opacity-20" /><p className="font-medium text-lg">No questions found</p></div> : filteredQuestions.map((q) => (<div key={q.id} className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col sm:flex-row gap-4 justify-between items-start"><div className="flex-1"><div className="flex flex-wrap gap-2 mb-3"><span className="px-3 py-1 bg-blue-50 text-[#0057A0] text-[10px] font-extrabold uppercase rounded-full tracking-wider">{q.category}</span><span className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full tracking-wider ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-600' : q.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>{q.difficulty}</span></div><h3 className="font-bold text-slate-800 text-lg mb-2 leading-snug">{q.text}</h3><div className="flex items-center gap-2 text-sm font-medium text-slate-500"><Check size={16} className="text-green-500" /><span>Answer:</span><span className="text-slate-900 font-bold">{q.options[q.correctIndex]}</span></div></div><button onClick={() => handleDeleteQuestion(q.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all self-end sm:self-start"><Trash2 size={20}/></button></div>))}
                        </div>
                     </div>
                </div>
            )}

            {activeTab === 'learning' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Block */}
                     <div className="bg-gradient-to-br from-[#0057A0] to-[#003D73] p-8 rounded-3xl shadow-lg text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="font-heading font-bold text-2xl mb-2 flex items-center gap-2">
                                <BookOpen size={28} className="text-blue-200"/> Learning Modules
                            </h2>
                            <p className="text-blue-100">Manage courses, flashcards, and learning paths.</p>
                        </div>
                     </div>

                    {/* Create Module Button */}
                    <div className="flex justify-end">
                        <Button onClick={handleCreateModule} className="bg-[#30C050] border-green-700 hover:bg-green-600 shadow-md text-lg px-6">
                            <PlusCircle className="mr-2" size={20}/> Create New Module
                        </Button>
                    </div>

                    {/* List of Modules */}
                    <div className="grid gap-6">
                        {learningModules.map(mod => (
                            <div key={mod.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-visible group">
                                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50">
                                    <div className="flex items-center gap-5 flex-1">
                                        <div className="bg-blue-50 p-4 rounded-2xl text-[#0057A0] shadow-sm group-hover:scale-105 transition-transform">
                                            <CategoryIcon category={mod.category} size={32} />
                                        </div>
                                        {editingModuleId === mod.id ? (
                                            <div className="space-y-3 flex-1 max-w-md">
                                                <CustomSelect 
                                                    value={mod.category} 
                                                    options={Object.values(Category).map(c => ({label:c, value:c}))} 
                                                    onChange={(v) => updateModule({...mod, category: v})} 
                                                    zIndex={60}
                                                />
                                                <input 
                                                    className={inputClasses}
                                                    value={mod.description}
                                                    onChange={(e) => updateModule({...mod, description: e.target.value})}
                                                    placeholder="Module Description"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-800 mb-1">{mod.category}</h3>
                                                <p className="text-slate-500 text-sm font-medium mb-2">{mod.description}</p>
                                                <span className="text-[10px] font-extrabold text-[#0057A0] bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">{mod.units.length} Learning Units</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 self-end md:self-auto">
                                        <Button size="sm" variant={editingModuleId === mod.id ? "success" : "secondary"} onClick={() => setEditingModuleId(editingModuleId === mod.id ? null : mod.id)}>
                                            {editingModuleId === mod.id ? "Done" : "Edit Content"}
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDeleteModule(mod.id)}><Trash2 size={16}/></Button>
                                    </div>
                                </div>

                                {/* Expanded Editor */}
                                {editingModuleId === mod.id && (
                                    <div className="p-8 bg-slate-50 rounded-b-3xl border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-xs font-bold text-[#0057A0] uppercase tracking-widest flex items-center gap-2">
                                                <BrainCircuit size={16}/> Learning Path Structure
                                            </h4>
                                            <Button size="sm" variant="outline" className="border-slate-300 text-slate-600 hover:bg-white bg-white shadow-sm" onClick={() => {
                                                const newUnit: LearningUnit = {
                                                    id: uuidv4(),
                                                    title: "New Unit",
                                                    duration: "1 min",
                                                    type: 'text',
                                                    content: ""
                                                };
                                                updateModule({...mod, units: [...mod.units, newUnit]});
                                            }}>
                                                + Add Step
                                            </Button>
                                        </div>

                                        <div className="space-y-6">
                                            {mod.units.length === 0 && (
                                                <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                                    <p>No units yet. Add a step to begin.</p>
                                                </div>
                                            )}
                                            {mod.units.map((unit, idx) => (
                                                <div key={unit.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors relative group/unit">
                                                    <div className="absolute -left-3 top-8 w-6 h-6 bg-white border-2 border-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-300">{idx + 1}</div>
                                                    
                                                    <div className="flex flex-col gap-6">
                                                        {/* Unit Header Controls */}
                                                        <div className="flex flex-col md:flex-row gap-4 items-start">
                                                            <div className="flex-1 w-full space-y-4">
                                                                <div className="flex gap-4">
                                                                    <div className="flex-1">
                                                                        <label className={labelClasses}>Unit Title</label>
                                                                        <input 
                                                                            className={inputClasses}
                                                                            value={unit.title}
                                                                            onChange={(e) => {
                                                                                const newUnits = [...mod.units];
                                                                                newUnits[idx] = { ...unit, title: e.target.value };
                                                                                updateModule({ ...mod, units: newUnits });
                                                                            }}
                                                                            placeholder="e.g. Intro to Glaciers"
                                                                        />
                                                                    </div>
                                                                    <div className="w-32">
                                                                        <label className={labelClasses}>Duration</label>
                                                                        <input 
                                                                            className={inputClasses}
                                                                            value={unit.duration}
                                                                            onChange={(e) => {
                                                                                const newUnits = [...mod.units];
                                                                                newUnits[idx] = { ...unit, duration: e.target.value };
                                                                                updateModule({ ...mod, units: newUnits });
                                                                            }}
                                                                            placeholder="2 min"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="w-full">
                                                                    <CustomSelect 
                                                                        label="Content Type"
                                                                        value={unit.type}
                                                                        options={[
                                                                            {label: 'Read (Text)', value: 'text'},
                                                                            {label: 'Flashcards', value: 'flashcards'},
                                                                            {label: 'Quiz', value: 'quiz'}
                                                                        ]}
                                                                        onChange={(val) => {
                                                                            const newUnits = [...mod.units];
                                                                            newUnits[idx] = { ...unit, type: val };
                                                                            updateModule({ ...mod, units: newUnits });
                                                                        }}
                                                                        zIndex={40 - idx}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Reorder Controls */}
                                                            <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                                                <button className="p-2 hover:bg-white hover:text-[#0057A0] hover:shadow-sm rounded-lg text-slate-400 transition-all" onClick={() => {
                                                                    if (idx === 0) return;
                                                                    const newUnits = [...mod.units];
                                                                    [newUnits[idx], newUnits[idx-1]] = [newUnits[idx-1], newUnits[idx]];
                                                                    updateModule({...mod, units: newUnits});
                                                                }}><ArrowUp size={18}/></button>
                                                                <button className="p-2 hover:bg-white hover:text-[#0057A0] hover:shadow-sm rounded-lg text-slate-400 transition-all" onClick={() => {
                                                                    if (idx === mod.units.length - 1) return;
                                                                    const newUnits = [...mod.units];
                                                                    [newUnits[idx], newUnits[idx+1]] = [newUnits[idx+1], newUnits[idx]];
                                                                    updateModule({...mod, units: newUnits});
                                                                }}><ArrowDown size={18}/></button>
                                                                <div className="w-px bg-slate-200 mx-1 my-1"></div>
                                                                <button className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-300 transition-all" onClick={() => {
                                                                    const newUnits = mod.units.filter((_, i) => i !== idx);
                                                                    updateModule({...mod, units: newUnits});
                                                                }}><Trash2 size={18}/></button>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Content Editor Area */}
                                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                                                            {unit.type === 'text' && (
                                                                <div>
                                                                    <label className={labelClasses}>Reading Content</label>
                                                                    <textarea 
                                                                        className={`${inputClasses} h-32 resize-none`}
                                                                        value={unit.content || ''}
                                                                        onChange={(e) => {
                                                                            const newUnits = [...mod.units];
                                                                            newUnits[idx] = { ...unit, content: e.target.value };
                                                                            updateModule({ ...mod, units: newUnits });
                                                                        }}
                                                                        placeholder="Enter the educational text here..."
                                                                    />
                                                                </div>
                                                            )}
                                                            {unit.type === 'flashcards' && (
                                                                <div className="space-y-4">
                                                                    <label className={labelClasses}>Flashcards Deck</label>
                                                                    {(unit.flashcards || []).map((card, cIdx) => (
                                                                        <div key={cIdx} className="flex flex-col md:flex-row gap-3 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                                            <div className="flex-1 w-full">
                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Front</span>
                                                                                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium" placeholder="Question/Term" value={card.front} onChange={(e) => {
                                                                                    const newUnits = [...mod.units];
                                                                                    const newCards = [...(unit.flashcards || [])];
                                                                                    newCards[cIdx] = { ...card, front: e.target.value };
                                                                                    newUnits[idx] = { ...unit, flashcards: newCards };
                                                                                    updateModule({...mod, units: newUnits});
                                                                                }}/>
                                                                            </div>
                                                                            <div className="flex-1 w-full">
                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Back</span>
                                                                                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium" placeholder="Answer/Definition" value={card.back} onChange={(e) => {
                                                                                     const newUnits = [...mod.units];
                                                                                     const newCards = [...(unit.flashcards || [])];
                                                                                     newCards[cIdx] = { ...card, back: e.target.value };
                                                                                     newUnits[idx] = { ...unit, flashcards: newCards };
                                                                                     updateModule({...mod, units: newUnits});
                                                                                }}/>
                                                                            </div>
                                                                            <button className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg mt-5 transition-colors" onClick={() => {
                                                                                 const newUnits = [...mod.units];
                                                                                 const newCards = (unit.flashcards || []).filter((_, i) => i !== cIdx);
                                                                                 newUnits[idx] = { ...unit, flashcards: newCards };
                                                                                 updateModule({...mod, units: newUnits});
                                                                            }}><X size={18}/></button>
                                                                        </div>
                                                                    ))}
                                                                    <Button size="sm" variant="secondary" onClick={() => {
                                                                        const newUnits = [...mod.units];
                                                                        const newCards = [...(unit.flashcards || []), { front: '', back: '' }];
                                                                        newUnits[idx] = { ...unit, flashcards: newCards };
                                                                        updateModule({...mod, units: newUnits});
                                                                    }}>+ Add Flashcard</Button>
                                                                </div>
                                                            )}
                                                            {unit.type === 'quiz' && (
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className={labelClasses}>Quiz Question</label>
                                                                        <input className={inputClasses} placeholder="Enter question..." value={unit.quiz?.question || ''} onChange={(e) => {
                                                                            const newUnits = [...mod.units];
                                                                            newUnits[idx] = { ...unit, quiz: { ...(unit.quiz || {options:['','',''], correctIndex:0}), question: e.target.value } as any };
                                                                            updateModule({...mod, units: newUnits});
                                                                        }}/>
                                                                    </div>
                                                                    <div>
                                                                        <label className={labelClasses}>Options</label>
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                            {[0,1,2].map(i => (
                                                                                <div key={i} className="relative">
                                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0057A0]">{String.fromCharCode(65+i)}</span>
                                                                                    <input className={`${inputClasses} pl-8 py-2 text-sm`} placeholder={`Option`} value={unit.quiz?.options?.[i] || ''} onChange={(e) => {
                                                                                        const newUnits = [...mod.units];
                                                                                        const ops = [...(unit.quiz?.options || ['','',''])];
                                                                                        ops[i] = e.target.value;
                                                                                        newUnits[idx] = { ...unit, quiz: { ...(unit.quiz || {question:'', correctIndex:0}), options: ops } as any };
                                                                                        updateModule({...mod, units: newUnits});
                                                                                    }}/>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-48">
                                                                        <CustomSelect 
                                                                            label="Correct Answer"
                                                                            value={unit.quiz?.correctIndex || 0} 
                                                                            options={[{ label: 'Option A', value: 0 }, { label: 'Option B', value: 1 }, { label: 'Option C', value: 2 }]} 
                                                                            onChange={(val) => {
                                                                                const newUnits = [...mod.units];
                                                                                newUnits[idx] = { ...unit, quiz: { ...(unit.quiz || {question:'', options:['','','']}), correctIndex: parseInt(val) } as any };
                                                                                updateModule({...mod, units: newUnits});
                                                                            }}
                                                                            zIndex={20}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

const AdminAuth: React.FC<{ onSuccess: () => void, onBack: () => void }> = ({ onSuccess, onBack }) => {
    const [pwd, setPwd] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState(false);
    const handleLogin = () => { if (pwd === 'perlan2025') onSuccess(); else { setError(true); setTimeout(() => setError(false), 2000); } };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-sm animate-slide-up border border-blue-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0057A0] shadow-sm">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-slate-800">Manager Access</h2>
                    <p className="text-slate-500 text-sm mt-2">Please enter your password to continue</p>
                </div>
                <div className="relative mb-6">
                    <input 
                        type={showPwd ? "text" : "password"} 
                        placeholder="Password" 
                        className={`w-full bg-slate-50 border-2 px-4 py-3 rounded-xl text-lg focus:outline-none focus:border-[#0057A0] focus:bg-white transition placeholder:text-slate-400 text-slate-800 ${error ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} 
                        value={pwd} 
                        onChange={e => setPwd(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <button onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0057A0] transition-colors">
                        {showPwd ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                </div>
                <Button fullWidth onClick={handleLogin} className="py-3 text-lg shadow-lg bg-[#0057A0] hover:bg-[#003D73]">Unlock Dashboard</Button>
                <button onClick={onBack} className="w-full text-center text-slate-400 text-sm mt-6 hover:text-[#0057A0] font-medium transition-colors">Return to Game</button>
            </div>
        </div>
    )
}

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'game' | 'result' | 'adminAuth' | 'admin' | 'learning'>('home');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [playerName, setPlayerName] = useState(""); 
  
  // NEW: Sync State
  const [isSyncing, setIsSyncing] = useState(true);

  // NEW: Trigger Sync on Load
  useEffect(() => {
    const init = async () => {
      await syncContentFromFirebase();
      setIsSyncing(false);
    };
    init();
  }, []);

  const startGame = (config: GameConfig) => { 
    setPlayerName(config.username);
    setGameConfig(config); 
    setView('game'); 
  };
  const endGame = (result: GameResult) => { setLastResult(result); setView('result'); };
  
  const startLearning = () => {
    setView('learning');
  };

  if (isSyncing) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#0057A0] text-white">
              <Loader2 size={48} className="animate-spin text-yellow-400 mb-4"/>
              <p className="font-heading font-bold text-lg">Syncing with Cloud...</p>
          </div>
      )
  }

  return (
    <div className="font-sans bg-gradient-to-b from-slate-900 via-[#003D73] to-[#0057A0] min-h-screen text-slate-800 selection:bg-perlan-light selection:text-white">
      {view === 'home' && <HomeScreen onStart={startGame} onAdmin={() => setView('adminAuth')} onLearning={startLearning} />}
      {view === 'game' && gameConfig && <GameScreen config={gameConfig} onEnd={endGame} onBack={() => setView('home')} />}
      {view === 'result' && lastResult && <ResultScreen result={lastResult} onHome={() => setView('home')} />}
      {view === 'learning' && <LearningScreen onBack={() => setView('home')} username={playerName || "Staff Member"} />}
      {view === 'adminAuth' && <AdminAuth onSuccess={() => setView('admin')} onBack={() => setView('home')} />}
      {view === 'admin' && <AdminDashboard onLogout={() => setView('home')} />}
    </div>
  );
};

export default App;
