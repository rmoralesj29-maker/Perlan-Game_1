
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Settings, Trophy, Users, ArrowLeft, Check, X, Clock, 
  Thermometer, Mountain, Wind, Bird, History, Droplets, 
  Building2, Gift, BrainCircuit, Zap, Award, Lock, Lightbulb,
  ChevronDown, Trash2, Eye, EyeOff, PieChart, BarChart2, Filter, ChevronUp, Sparkles, PlusCircle, Search, AlertCircle, BookOpen, ChevronRight, CheckCircle, RotateCcw, Edit2, ArrowUp, ArrowDown, Save, ChevronLeft, Loader2, LogOut, Mail, User as UserIcon, Download
} from 'lucide-react';
import { Category, Difficulty, GameConfig, GameResult, Question, PlayerAnswer, PlayerStats, LearningModule, LearningUnit, UserProgress, Flashcard, LearningQuiz, UserProfile, AVATARS } from './types';
import Button from './components/Button';
import { getQuestions, saveGameResult, getAllStats, addQuestion, deleteQuestion, getAllResults, getUserProgress, saveUserProgress, getLearningModules, saveLearningModules, deleteLearningModuleFromCloud, syncContentFromFirebase, getAllUsers, deleteUserProfile } from './services/storageService';
import { generateQuestionsWithAI } from './services/geminiService';
import { loginUser, registerUser, logoutUser, resetPassword, subscribeToAuthChanges } from './services/authService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePie, Pie } from 'recharts';
import { v4 as uuidv4 } from 'uuid';
import { User } from 'firebase/auth';
import Modal from './components/Modal';

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

const AvatarDisplay = ({ avatarId, size = "md" }: { avatarId?: string, size?: "sm" | "md" | "lg" | "xl" }) => {
    const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
    const sizeClasses = {
        sm: "w-8 h-8 text-lg",
        md: "w-12 h-12 text-2xl",
        lg: "w-16 h-16 text-3xl",
        xl: "w-24 h-24 text-5xl"
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-white shadow-md border-2 border-white/50 overflow-hidden`}>
            {avatar.icon}
        </div>
    );
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
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      const allStats = getAllStats();
      setStats(allStats.sort((a, b) => b.totalScore - a.totalScore).slice(0, 10));
      getAllUsers().then(setUsers);
    }
  }, [isOpen]);

  const getUserAvatar = (username: string) => {
      // Since stats currently store username (legacy), we try to find the user profile by display name
      // In a refactor, we should store UID in stats, but for now matching name is fine
      const user = users.find(u => u.displayName === username);
      return user?.avatarId || 'puffin';
  };

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
                      w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-slate-900 mr-3 flex-shrink-0
                      ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : index === 2 ? 'bg-orange-400' : 'bg-white/20 text-white'}
                    `}>
                      {index + 1}
                    </div>
                    <div className="mr-3">
                         <AvatarDisplay avatarId={getUserAvatar(player.username)} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{player.username}</p>
                      <p className="text-blue-300 text-xs">{player.totalGames} Games</p>
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
        const newProgress = { ...progress, completedUnitIds: [...progress.completedUnitIds, unitId] };
        setProgress(newProgress);
        saveUserProgress(newProgress);
    };

    return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto text-white relative pb-8">
       <div className="p-6 flex items-center gap-4">
          <button onClick={activeModule ? () => setActiveModule(null) : onBack} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition backdrop-blur-md">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-heading font-bold text-2xl">{activeModule ? activeModule.category : "Learn"}</h1>
       </div>

       {!activeModule && (
         <div className="px-6 space-y-4 animate-fade-in">
            {modules.map((mod) => {
               const totalUnits = mod.units.length;
               const completedCount = mod.units.filter(u => progress.completedUnitIds.includes(u.id)).length;
               const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

               return (
                 <button key={mod.id} onClick={() => setActiveModule(mod)} className="w-full bg-white text-left rounded-3xl p-5 shadow-lg border-b-4 border-blue-100 active:border-b-0 active:translate-y-1 transition-all relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-blue-50 p-3 rounded-2xl text-[#0057A0]">
                            <CategoryIcon category={mod.category} size={28} />
                        </div>
                        <span className="text-xs font-extrabold bg-blue-100 text-[#0057A0] px-2 py-1 rounded-lg">{completedCount}/{totalUnits}</span>
                    </div>
                    <h3 className="text-[#003D73] font-bold text-xl mb-1">{mod.category}</h3>
                    <p className="text-slate-500 text-sm font-medium mb-4 line-clamp-2">{mod.description}</p>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden"><div className="bg-[#30C050] h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} /></div>
                 </button>
               )
            })}
         </div>
       )}

       {activeModule && (
          <div className="flex-1 relative overflow-y-auto custom-scrollbar pb-20">
              <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-white/10 -translate-x-1/2 z-0"></div>
              <div className="px-6 pt-8 space-y-12">
                  {activeModule.units.map((unit, idx) => {
                    const isCompleted = progress.completedUnitIds.includes(unit.id);
                    const isLocked = idx > 0 && !progress.completedUnitIds.includes(activeModule.units[idx - 1].id);
                    const isExpanded = expandedUnit === unit.id;
                    const isLeft = idx % 2 === 0;
                    return (
                      <div key={unit.id} className={`relative flex ${isLeft ? 'justify-start' : 'justify-end'} ${isLocked ? 'opacity-60 grayscale' : ''}`}>
                         <div className={`relative z-10 flex flex-col items-center ${isLeft ? 'mr-auto ml-4' : 'ml-auto mr-4'}`}>
                             <button disabled={isLocked} onClick={() => setExpandedUnit(isExpanded ? null : unit.id)} className={`w-20 h-20 rounded-full border-[6px] flex items-center justify-center shadow-xl transition-all ${isCompleted ? 'bg-[#30C050] border-[#24963d] text-white' : 'bg-white border-blue-200 text-gray-300'} ${!isLocked && !isCompleted ? 'hover:scale-110 active:scale-95 animate-bounce-short' : ''} ${isExpanded ? 'ring-4 ring-white/50' : ''}`}>
                                {isCompleted ? <Check size={36} strokeWidth={4} /> : unit.type === 'flashcards' ? <Sparkles size={32} className="text-[#0057A0]"/> : unit.type === 'quiz' ? <BrainCircuit size={32} className="text-[#0057A0]"/> : <BookOpen size={32} className={isLocked ? "text-gray-300" : "text-[#0057A0]"} />}
                             </button>
                             <div className="mt-3 bg-[#003D73] px-4 py-1.5 rounded-xl shadow-md border border-white/10"><p className="text-xs font-bold text-white uppercase tracking-wide">{unit.title}</p></div>
                         </div>
                         {isExpanded && !isLocked && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up relative max-h-[80vh] overflow-y-auto custom-scrollbar-blue">
                                    <button onClick={() => setExpandedUnit(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
                                    <div className="flex items-center gap-2 mb-4 text-[#0057A0]">{unit.type === 'flashcards' ? <Sparkles size={20}/> : unit.type === 'quiz' ? <BrainCircuit size={20}/> : <BookOpen size={20}/>}<span className="text-sm font-bold uppercase tracking-wide">{unit.type === 'text' ? 'Read' : unit.type === 'flashcards' ? 'Practice' : 'Quiz'} • {unit.duration}</span></div>
                                    <h2 className="text-2xl font-heading font-bold text-slate-800 mb-6">{unit.title}</h2>
                                    {unit.type === 'text' && (<><p className="text-lg leading-relaxed font-medium text-slate-600 mb-8">{unit.content}</p><Button fullWidth variant={isCompleted ? 'success' : 'primary'} onClick={() => { handleCompleteUnit(unit.id); setExpandedUnit(null); }} disabled={isCompleted}>{isCompleted ? "Completed" : "Mark Complete"}</Button></>)}
                                    {unit.type === 'flashcards' && unit.flashcards && (<FlashcardComponent cards={unit.flashcards} onComplete={() => { handleCompleteUnit(unit.id); setExpandedUnit(null); }} />)}
                                    {unit.type === 'quiz' && unit.quiz && (<MiniQuizComponent quiz={unit.quiz} onComplete={() => { handleCompleteUnit(unit.id); setExpandedUnit(null); }} />)}
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

// --- AUTH SCREEN ---

const AuthScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('puffin');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password) { setError("Please fill in all fields"); return; }
        if (!isLogin && !name) { setError("Please enter your name"); return; }
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                const user = await loginUser(email, password);
                onLogin(user);
            } else {
                const user = await registerUser(email, password, name, selectedAvatar);
                onLogin(user);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if(!email) { setError("Please enter your email first"); return; }
        try {
            await resetPassword(email);
            setResetSent(true);
            setError("");
        } catch(err: any) {
            setError(err.message);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-slide-up relative overflow-hidden">
                <div className="text-center mb-8">
                    <h1 className="font-heading font-extrabold text-3xl text-[#0057A0] mb-2">Perlan Game</h1>
                    <p className="text-slate-500 font-medium">Staff Training Portal</p>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                    <button onClick={() => { setIsLogin(true); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-white text-[#0057A0] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Sign In</button>
                    <button onClick={() => { setIsLogin(false); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-white text-[#0057A0] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Create Account</button>
                </div>

                <div className="space-y-4">
                    {!isLogin && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-1 ml-1">Full Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-[#0057A0] transition" placeholder="John Doe" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Choose Avatar</label>
                                <div className="flex justify-between gap-2">
                                    {AVATARS.map(avatar => (
                                        <button 
                                            key={avatar.id} 
                                            onClick={() => setSelectedAvatar(avatar.id)}
                                            className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center border-2 transition-all hover:scale-110 ${selectedAvatar === avatar.id ? 'border-[#0057A0] bg-blue-50 scale-110 shadow-md' : 'border-transparent bg-slate-50 grayscale hover:grayscale-0'}`}
                                            title={avatar.label}
                                        >
                                            {avatar.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-1 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-[#0057A0] transition" placeholder="name@perlan.is" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-1 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-[#0057A0] transition" placeholder="••••••••" />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0057A0] transition-colors"
                            >
                                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                    </div>
                </div>

                {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={16}/>{error}</div>}
                {resetSent && <div className="mt-4 p-3 bg-green-50 text-green-600 text-sm font-bold rounded-xl flex items-center gap-2"><CheckCircle size={16}/> Reset email sent! Check your inbox.</div>}

                <Button fullWidth onClick={handleSubmit} className="mt-6 shadow-lg text-lg bg-[#0057A0]" disabled={loading}>
                    {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </Button>

                {isLogin && (
                    <button onClick={handleReset} className="w-full text-center text-slate-400 text-sm mt-4 hover:text-[#0057A0] font-medium transition-colors">
                        Forgot Password?
                    </button>
                )}
            </div>
        </div>
    );
};

// --- MAIN SCREENS ---

const HomeScreen: React.FC<{ user: User, onStart: (config: GameConfig) => void, onAdmin: () => void, onLearning: () => void, onLogout: () => void }> = ({ user, onStart, onAdmin, onLearning, onLogout }) => {
  const [categoryMode, setCategoryMode] = useState<'general' | 'specific' | null>(null);
  const [category, setCategory] = useState<Category>(Category.NorthernLights);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [challenge, setChallenge] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch extra user details (like avatar)
  useEffect(() => {
      const fetchProfile = async () => {
          const allUsers = await getAllUsers();
          const profile = allUsers.find(u => u.uid === user.uid);
          setUserProfile(profile || null);
      };
      fetchProfile();
  }, [user]);

  const handleStart = () => {
    const selectedCategory = categoryMode === 'general' ? Category.General : category;
    onStart({ username: user.displayName || 'Player', category: selectedCategory, difficulty, isChallengeMode: challenge });
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

        {/* Profile Card */}
        <div className="w-full bg-white/10 p-4 rounded-3xl border border-white/20 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
                <AvatarDisplay avatarId={userProfile?.avatarId} />
                <div>
                    <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">Welcome,</p>
                    <p className="text-lg font-bold text-white leading-none">{user.displayName}</p>
                </div>
            </div>
            <button onClick={onLogout} className="p-2 bg-white/10 rounded-full hover:bg-red-500/80 transition text-white/70 hover:text-white">
                <LogOut size={18} />
            </button>
        </div>

        <div className="w-full space-y-5 bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-xl">
          
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
                    <p className="text-xs text-blue-200">15s per question</p>
                </div>
             </div>
             <div className={`w-12 h-7 rounded-full p-1 transition-colors ${challenge ? 'bg-[#30C050]' : 'bg-black/30'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${challenge ? 'translate-x-5' : 'translate-x-0'}`} />
             </div>
          </button>

          <Button fullWidth size="lg" onClick={handleStart} disabled={!categoryMode} className="shadow-xl text-lg mt-2">
            Start Game
          </Button>
        </div>
      </div>
      
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </div>
  );
};

const GameScreen: React.FC<{ config: GameConfig, onEnd: (result: GameResult) => void }> = ({ config, onEnd }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isReady, setIsReady] = useState(false);

  // Load Questions
  useEffect(() => {
    const load = () => {
      const allQuestions = getQuestions();
      let filtered = config.category === Category.General 
        ? allQuestions 
        : allQuestions.filter(q => q.category === config.category);
      
      // If not enough questions, fallback to all
      if (filtered.length < 10) filtered = allQuestions;
      
      // Shuffle and pick 10
      const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
      setQuestions(shuffled);
    };
    load();
  }, [config]);

  // Shuffle Options for current question
  useEffect(() => {
    if (questions[currentIndex]) {
       const indices = [0, 1, 2];
       setShuffledOptions(indices.sort(() => 0.5 - Math.random()));
    }
  }, [currentIndex, questions]);

  // 3-2-1 Countdown
  useEffect(() => {
    if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    } else {
        setIsReady(true);
    }
  }, [countdown]);

  // Game Timer
  useEffect(() => {
    if (!isReady || isAnswered || !config.isChallengeMode) return;
    if (timeLeft === 0) {
       handleAnswer(-1); // Time ran out
       return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isAnswered, config.isChallengeMode, isReady]);

  const handleAnswer = (shuffledIndex: number) => {
    if (isAnswered) return;
    
    // If shuffledIndex is -1, it means timeout
    const originalIndex = shuffledIndex === -1 ? -1 : shuffledOptions[shuffledIndex];
    
    setSelectedOption(shuffledIndex);
    setIsAnswered(true);
    
    const currentQ = questions[currentIndex];
    const isCorrect = originalIndex === currentQ.correctIndex;
    
    if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > maxStreak) setMaxStreak(newStreak);
    } else {
        setStreak(0);
    }

    setAnswers([...answers, {
      questionId: currentQ.id,
      selectedOptionIndex: originalIndex, // Store the REAL index for data integrity
      isCorrect,
      timeTaken: 15 - timeLeft
    }]);

    // Show feedback briefly before next question
    setShowFeedback(true);
  };

  const handleNext = () => {
      setShowFeedback(false);
      setIsAnswered(false);
      setSelectedOption(null);
      setTimeLeft(15);
      
      if (currentIndex < 9) {
          setCurrentIndex(currentIndex + 1);
      } else {
          const result: GameResult = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              username: config.username,
              config,
              score: answers.filter(a => a.isCorrect).length + (answers[answers.length -1].isCorrect ? 1 : 0), // Add current answer if correct
              totalQuestions: 10,
              answers: [...answers], // Note: 'answers' state might not have updated yet in this closure, but for simplicity in this mock
              streakMax: maxStreak
          };
          // Re-calculate score accurately to be safe
          const finalScore = answers.reduce((acc, curr) => acc + (curr.isCorrect ? 1 : 0), 0) + (questions[currentIndex].correctIndex === (selectedOption === -1 ? -1 : shuffledOptions[selectedOption!]) ? 1 : 0);
          result.score = finalScore;
          
          // Update last answer in result
          const lastAnswer = {
               questionId: questions[currentIndex].id,
               selectedOptionIndex: selectedOption === -1 ? -1 : shuffledOptions[selectedOption!],
               isCorrect: questions[currentIndex].correctIndex === (selectedOption === -1 ? -1 : shuffledOptions[selectedOption!]),
               timeTaken: 15 - timeLeft
          };
          result.answers = [...answers, lastAnswer];
          
          saveGameResult(result);
          onEnd(result);
      }
  };

  if (!isReady) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#003D73]">
              <div className="text-center animate-bounce-short">
                  <div className="text-8xl font-black text-white mb-4 font-heading">{countdown > 0 ? countdown : "GO!"}</div>
                  <p className="text-blue-200 text-xl font-bold uppercase tracking-widest">Get Ready</p>
              </div>
          </div>
      )
  }

  if (questions.length === 0) return <div className="p-10 text-white">Loading...</div>;

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto p-6 relative text-white">
      {/* Header Stats */}
      <div className="flex justify-between items-center mb-6 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full border-[3px] border-white flex items-center justify-center font-bold bg-[#0057A0]">
                {currentIndex + 1}
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-blue-200">Question</span>
                <span className="text-xs font-bold text-white/80">of 10</span>
             </div>
         </div>
         
         {config.isChallengeMode && (
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-lg ${timeLeft < 5 ? 'bg-red-500/20 text-red-300 border border-red-500/50' : 'bg-blue-900/30 text-blue-200'}`}>
                <Clock size={18} /> {timeLeft}s
             </div>
         )}

         <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400/20 rounded-xl border border-yellow-400/30">
             <Zap size={18} className="text-yellow-400 fill-yellow-400" />
             <span className="font-bold text-yellow-100">{streak}</span>
         </div>
      </div>

      {/* Question Card */}
      <div className="bg-[#0057A0] rounded-3xl p-6 shadow-xl mb-6 border-4 border-white/20 relative overflow-hidden min-h-[200px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CategoryIcon category={currentQ.category} size={100}/></div>
          
          <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-4">
             <span>{currentQ.category}</span>
             <span>•</span>
             <span>{currentQ.difficulty}</span>
          </div>
          
          <h2 className="text-2xl font-heading font-bold leading-tight relative z-10">{currentQ.text}</h2>
      </div>

      {/* Options */}
      <div className="space-y-3 flex-1">
         {shuffledOptions.map((originalIdx, renderIdx) => {
             const isSelected = selectedOption === renderIdx;
             const isCorrect = originalIdx === currentQ.correctIndex;
             let stateStyle = "bg-white text-slate-700 border-b-4 border-slate-200 hover:bg-gray-50"; // Default

             if (isAnswered) {
                 if (isCorrect) stateStyle = "bg-[#30C050] text-white border-b-4 border-green-700"; // Correct
                 else if (isSelected) stateStyle = "bg-[#E63946] text-white border-b-4 border-red-800"; // Wrong selection
                 else stateStyle = "bg-white/50 text-slate-400 border-b-4 border-transparent"; // Others dimmed
             }

             return (
                 <button
                    key={renderIdx}
                    disabled={isAnswered}
                    onClick={() => handleAnswer(renderIdx)}
                    className={`w-full p-4 rounded-2xl text-left font-bold text-lg transition-all duration-200 active:scale-[0.98] shadow-sm flex justify-between items-center ${stateStyle}`}
                 >
                    <span>{currentQ.options[originalIdx]}</span>
                    {isAnswered && isCorrect && <Check size={24} />}
                    {isAnswered && isSelected && !isCorrect && <X size={24} />}
                 </button>
             )
         })}
      </div>

      {/* Feedback Overlay (Non-invasive) */}
      {showFeedback && (
        <div className="absolute bottom-6 left-6 right-6 animate-slide-up z-20">
            {selectedOption === -1 && (
                <div className="mb-3 bg-[#E63946] text-white p-3 rounded-2xl font-bold text-center shadow-lg animate-bounce-short flex items-center justify-center gap-2">
                    <Clock size={20}/> CLOCK RUN OUT!
                </div>
            )}

            <div className="bg-white rounded-3xl p-5 shadow-2xl border-b-8 border-blue-100 flex flex-col gap-4">
               <div className="flex items-start gap-3">
                  <div className="bg-yellow-100 p-2 rounded-full mt-1"><Lightbulb size={20} className="text-yellow-600" /></div>
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Did you know?</p>
                      <p className="text-slate-700 font-medium text-sm leading-relaxed">{currentQ.fact}</p>
                  </div>
               </div>
               <Button onClick={handleNext} fullWidth>
                  {currentIndex < 9 ? "Next Question" : "Finish Game"} <ChevronRight size={18} />
               </Button>
            </div>
        </div>
      )}
    </div>
  );
};

const ResultScreen: React.FC<{ result: GameResult, onHome: () => void }> = ({ result, onHome }) => {
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    const allQuestions = getQuestions(); // To fetch text for review

    return (
        <div className="min-h-screen flex flex-col max-w-md mx-auto p-6 text-white text-center">
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
                    <div className="relative bg-white text-[#0057A0] w-40 h-40 rounded-full flex items-center justify-center shadow-2xl border-8 border-blue-200">
                        <div>
                            <span className="text-5xl font-black font-heading">{percentage}%</span>
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mt-1">Score</p>
                        </div>
                    </div>
                    {percentage === 100 && <div className="absolute -top-4 -right-4 bg-yellow-400 text-slate-900 p-2 rounded-full shadow-lg animate-bounce"><Trophy size={32}/></div>}
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-heading font-black">{percentage >= 80 ? "Outstanding!" : percentage >= 50 ? "Good Job!" : "Keep Learning!"}</h2>
                    <p className="text-blue-200 text-lg">You got <span className="text-white font-bold">{result.score}</span> out of {result.totalQuestions} correct</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                        <div className="text-yellow-400 font-bold text-2xl mb-1">{result.streakMax}</div>
                        <div className="text-xs uppercase font-bold text-blue-200">Best Streak</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                        <div className="text-green-400 font-bold text-2xl mb-1">+{result.score * 10}</div>
                        <div className="text-xs uppercase font-bold text-blue-200">XP Earned</div>
                    </div>
                </div>
                
                <div className="w-full text-left">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><History size={20}/> Review Answers</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {result.answers.map((ans, idx) => {
                            const q = allQuestions.find(q => q.id === ans.questionId);
                            if (!q) return null;
                            const userChoice = ans.selectedOptionIndex === -1 ? "Time Ran Out" : q.options[ans.selectedOptionIndex];
                            const correctChoice = q.options[q.correctIndex];

                            return (
                                <div key={idx} className="bg-[#003D73]/80 p-4 rounded-2xl border border-white/10 text-sm">
                                    <p className="font-bold text-white mb-2">{idx + 1}. {q.text}</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ans.isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                            {ans.isCorrect ? <Check size={16}/> : (ans.selectedOptionIndex === -1 ? <Clock size={16}/> : <X size={16}/>)}
                                            <span className="font-medium">You: <span className="font-bold">{userChoice}</span></span>
                                        </div>
                                        {!ans.isCorrect && (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-300">
                                                <Check size={16}/>
                                                <span className="font-medium">Answer: <span className="font-bold">{correctChoice}</span></span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-white/10 flex gap-2 items-start">
                                        <Lightbulb size={14} className="text-yellow-400 shrink-0 mt-0.5"/>
                                        <p className="text-blue-200 text-xs italic">{q.fact}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <Button fullWidth onClick={onHome} className="shadow-xl text-lg bg-[#0057A0] border-white/20">
                    Back to Home
                </Button>
            </div>
        </div>
    );
};

// --- ADMIN DASHBOARD ---

const AdminAuth: React.FC<{ onUnlock: () => void, onBack: () => void }> = ({ onUnlock, onBack }) => {
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const checkPass = () => {
    if (pass === 'perlan2025') onUnlock();
    else alert("Incorrect Password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white w-full max-w-sm p-8 rounded-3xl text-center shadow-2xl animate-slide-up relative border-2 border-blue-50">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-[#0057A0]">
            <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-[#0057A0] mb-2 font-heading">Manager Access</h2>
        <p className="text-slate-500 text-sm mb-6">Enter secure password to continue</p>
        
        <div className="relative mb-6">
            <input 
                type={showPass ? "text" : "password"}
                value={pass} 
                onChange={e => setPass(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-lg text-center font-bold text-slate-800 focus:outline-none focus:border-[#0057A0] focus:ring-4 focus:ring-blue-50 transition-all pr-12"
                placeholder="Password"
            />
            <button 
                type="button"
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0057A0] transition-colors"
            >
                {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
            </button>
        </div>
        
        <Button onClick={checkPass} fullWidth className="shadow-lg">Unlock Dashboard</Button>
        <button onClick={onBack} className="mt-6 text-slate-400 text-sm font-bold hover:text-[#0057A0] transition">Return to Game</button>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'learn' | 'users'>('overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // New Question State
  const [isAdding, setIsAdding] = useState(false);
  const [newQ, setNewQ] = useState<Partial<Question>>({ category: Category.NorthernLights, difficulty: Difficulty.Medium, options: ['', '', ''], correctIndex: 0 });

  // AI State
  const [aiPrompt, setAiPrompt] = useState({ category: Category.NorthernLights, difficulty: Difficulty.Medium, count: 5 });
  const [isGenerating, setIsGenerating] = useState(false);

  // Course Editor State
  const [isEditingModule, setIsEditingModule] = useState<string | null>(null);
  const [newModule, setNewModule] = useState<Partial<LearningModule>>({ category: Category.General, description: '', units: [] });
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  useEffect(() => {
    setStats(getAllStats());
    setQuestions(getQuestions());
    setModules(getLearningModules());
    
    const fetchUsers = async () => {
        const u = await getAllUsers();
        setUsers(u);
    };
    if (activeTab === 'users' || activeTab === 'overview') fetchUsers();

  }, [activeTab]);

  const handleExportCSV = () => {
      const headers = ["Name", "Email", "Joined", "Total Games", "Total Score", "Avg Score", "Best Category"];
      const rows = users.map(u => {
          const userStats = stats.find(s => s.username === u.displayName) || { totalGames: 0, totalScore: 0, bestCategory: 'N/A' };
          const avg = userStats.totalGames > 0 ? (userStats.totalScore / userStats.totalGames).toFixed(1) : "0";
          return [
              `"${u.displayName}"`,
              `"${u.email}"`,
              `"${new Date(u.createdAt).toLocaleDateString()}"`,
              userStats.totalGames,
              userStats.totalScore,
              avg,
              `"${userStats.bestCategory || 'N/A'}"`
          ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "perlan_staff_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    // Removed window.confirm for instant delete as requested
    // Optimistic Update: Remove immediately from UI
    setQuestions(prev => prev.filter(q => q.id !== id));
    // Delete from Cloud in background
    await deleteQuestion(id);
  };

  const handleSaveNew = async () => {
    if (newQ.text && newQ.options && newQ.fact) {
      await addQuestion({ ...newQ, id: Date.now().toString() } as Question);
      setIsAdding(false);
      setQuestions(getQuestions());
      setNewQ({ category: Category.NorthernLights, difficulty: Difficulty.Medium, options: ['', '', ''], correctIndex: 0 });
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateQuestionsWithAI(aiPrompt.category, aiPrompt.difficulty, aiPrompt.count);
      for (const q of generated) {
        await addQuestion(q);
      }
      setQuestions(getQuestions());
      alert(`Successfully added ${generated.length} questions!`);
    } catch (e) {
      alert("AI Generation failed. Check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUserDelete = async (uid: string) => {
      if(window.confirm("Are you sure you want to remove this user from the list?")) {
          await deleteUserProfile(uid);
          // Refresh list
          const u = await getAllUsers();
          setUsers(u);
      }
  };

  // --- Course Editor Handlers ---
  const handleSaveModule = async () => {
      if (!newModule.category || !newModule.description) return;
      const mod: LearningModule = {
          id: newModule.id || `mod-${Date.now()}`,
          category: newModule.category,
          description: newModule.description,
          units: newModule.units || []
      };
      
      const updatedModules = isEditingModule 
        ? modules.map(m => m.id === mod.id ? mod : m)
        : [...modules, mod];
      
      await saveLearningModules(updatedModules);
      setModules(updatedModules);
      setIsEditingModule(null);
      setNewModule({ category: Category.General, description: '', units: [] });
  };

  const handleDeleteModule = async (id: string) => {
      if(window.confirm("Delete this entire module?")) {
          await deleteLearningModuleFromCloud(id);
          const updated = modules.filter(m => m.id !== id);
          setModules(updated);
          saveLearningModules(updated);
      }
  }

  const handleAddUnit = () => {
      const newUnit: LearningUnit = { id: `unit-${Date.now()}`, title: "New Unit", duration: "1 min", type: 'text', content: "" };
      setNewModule({ ...newModule, units: [...(newModule.units || []), newUnit] });
      setEditingUnitId(newUnit.id);
  };

  const handleUpdateUnit = (id: string, updates: Partial<LearningUnit>) => {
      const updatedUnits = newModule.units?.map(u => u.id === id ? { ...u, ...updates } : u);
      setNewModule({ ...newModule, units: updatedUnits });
  };

  const handleMoveUnit = (index: number, direction: 'up' | 'down') => {
      if (!newModule.units) return;
      const newUnits = [...newModule.units];
      if (direction === 'up' && index > 0) {
          [newUnits[index], newUnits[index-1]] = [newUnits[index-1], newUnits[index]];
      } else if (direction === 'down' && index < newUnits.length - 1) {
          [newUnits[index], newUnits[index+1]] = [newUnits[index+1], newUnits[index]];
      }
      setNewModule({ ...newModule, units: newUnits });
  };

  const handleDeleteUnit = (index: number) => {
       const newUnits = newModule.units?.filter((_, i) => i !== index);
       setNewModule({ ...newModule, units: newUnits });
  };

  // Filtered Questions
  const filteredQuestions = questions.filter(q => {
      const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || q.category === filterCategory;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-slate-200">
         <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-[#0057A0] p-2 rounded-lg text-white"><Settings size={24} /></div>
                <h1 className="text-xl font-heading font-bold text-slate-800">Manager Board</h1>
            </div>
            <button onClick={onExit} className="text-sm font-bold text-slate-500 hover:text-[#0057A0]">Exit Manager</button>
         </div>
         
         {/* Tabs */}
         <div className="max-w-5xl mx-auto px-6 flex gap-6 overflow-x-auto custom-scrollbar-blue">
            {[
                { id: 'overview', label: 'Overview', icon: PieChart },
                { id: 'users', label: 'Staff Users', icon: Users },
                { id: 'questions', label: 'Question Bank', icon: Building2 },
                { id: 'learn', label: 'Course Editor', icon: BookOpen }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 border-b-4 transition-all font-bold whitespace-nowrap ${activeTab === tab.id ? 'border-[#0057A0] text-[#0057A0]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <tab.icon size={18} /> {tab.label}
                </button>
            ))}
         </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
           <div className="space-y-6 animate-fade-in">
               <div className="flex justify-end">
                   <Button onClick={handleExportCSV} size="sm" className="bg-[#30C050] border-green-600 shadow-md gap-2">
                       <Download size={18} /> Download Report
                   </Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Games</div>
                       <div className="text-4xl font-black text-[#0057A0]">{stats.reduce((acc, s) => acc + s.totalGames, 0)}</div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Avg Score</div>
                       <div className="text-4xl font-black text-[#30C050]">
                         {stats.length > 0 ? (stats.reduce((acc, s) => acc + s.totalScore, 0) / stats.reduce((acc, s) => acc + s.totalGames, 0)).toFixed(1) : 0}
                       </div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Questions in Bank</div>
                       <div className="text-4xl font-black text-orange-500">{questions.length}</div>
                   </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="font-heading font-bold text-lg mb-6">Player Performance</h3>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                               <tr>
                                   <th className="px-4 py-3 rounded-l-lg">Username</th>
                                   <th className="px-4 py-3">Games</th>
                                   <th className="px-4 py-3">Total Score</th>
                                   <th className="px-4 py-3">Best Streak</th>
                                   <th className="px-4 py-3 rounded-r-lg">Fav Category</th>
                               </tr>
                           </thead>
                           <tbody className="font-medium text-slate-600">
                               {stats.map(s => (
                                   <tr key={s.username} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                       <td className="px-4 py-4 font-bold text-[#0057A0]">{s.username}</td>
                                       <td className="px-4 py-4">{s.totalGames}</td>
                                       <td className="px-4 py-4">{s.totalScore}</td>
                                       <td className="px-4 py-4">{s.streakRecord}</td>
                                       <td className="px-4 py-4">{s.bestCategory}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-heading font-bold text-lg">Registered Staff</h3>
                    <span className="bg-blue-100 text-[#0057A0] px-3 py-1 rounded-full text-xs font-bold">{users.length} Users</span>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                        <tr>
                            <th className="px-6 py-3">Avatar</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3">Last Login</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="font-medium text-slate-600">
                        {users.map(u => (
                            <tr key={u.uid} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="px-6 py-4"><AvatarDisplay avatarId={u.avatarId} size="sm" /></td>
                                <td className="px-6 py-4 font-bold text-[#0057A0]">{u.displayName}</td>
                                <td className="px-6 py-4">{u.email}</td>
                                <td className="px-6 py-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{new Date(u.lastLogin).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleUserDelete(u.uid)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Remove User">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* QUESTION BANK TAB */}
        {activeTab === 'questions' && (
            <div className="space-y-6 animate-fade-in">
                {/* AI Generator */}
                <div className="relative z-30 rounded-3xl shadow-lg">
                    {/* Decoration Layer (Clipped) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0057A0] to-[#003D73] rounded-3xl overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit size={120}/></div>
                    </div>
                    
                    {/* Content Layer (Visible overflow for dropdowns) */}
                    <div className="relative p-8 text-white">
                        <h3 className="text-2xl font-heading font-bold mb-2">AI Question Generator</h3>
                        <p className="text-blue-200 mb-6 max-w-lg">Instantly generate scientifically accurate trivia questions for any category using Gemini AI.</p>
                        
                        <div className="flex flex-col md:flex-row gap-4">
                             <CustomSelect 
                               value={aiPrompt.category} 
                               options={Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))}
                               onChange={(v) => setAiPrompt({...aiPrompt, category: v})}
                               className="w-full md:w-64"
                               zIndex={50}
                             />
                             <CustomSelect 
                               value={aiPrompt.difficulty} 
                               options={Object.values(Difficulty).map(d => ({ label: d, value: d }))}
                               onChange={(v) => setAiPrompt({...aiPrompt, difficulty: v})}
                               className="w-full md:w-48"
                               zIndex={40}
                             />
                             <Button onClick={handleGenerateAI} disabled={isGenerating} className="shadow-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 border-yellow-600">
                                 {isGenerating ? <><Loader2 className="animate-spin" size={20}/> Generating...</> : <><Sparkles size={20}/> Generate 5 Questions</>}
                             </Button>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 z-20 relative">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                           type="text" 
                           placeholder="Search questions..." 
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:border-[#0057A0]"
                        />
                    </div>
                    <CustomSelect 
                        value={filterCategory}
                        options={[{label: 'All Categories', value: 'All'}, ...Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))]}
                        onChange={setFilterCategory}
                        className="w-full md:w-64"
                    />
                     <Button onClick={() => setIsAdding(!isAdding)} className="whitespace-nowrap">
                        {isAdding ? 'Cancel' : 'Add Manual Question'}
                    </Button>
                </div>

                {/* Add Manual Question Form */}
                {isAdding && (
                    <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-blue-50 animate-slide-up">
                        <h3 className="font-bold text-lg text-[#0057A0] mb-4">New Question Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <CustomSelect 
                                label="Category"
                                value={newQ.category || ''}
                                options={Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))}
                                onChange={v => setNewQ({...newQ, category: v})}
                            />
                            <CustomSelect 
                                label="Difficulty"
                                value={newQ.difficulty || ''}
                                options={Object.values(Difficulty).map(d => ({ label: d, value: d }))}
                                onChange={v => setNewQ({...newQ, difficulty: v})}
                            />
                        </div>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Question Text</label>
                                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0057A0] outline-none font-medium" value={newQ.text || ''} onChange={e => setNewQ({...newQ, text: e.target.value})} placeholder="e.g., What is the capital of Iceland?" />
                             </div>
                             
                             <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Answer Options</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {[0, 1, 2].map(idx => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <button onClick={() => setNewQ({...newQ, correctIndex: idx})} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition ${newQ.correctIndex === idx ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-300 hover:border-green-400'}`}>
                                                <Check size={16} />
                                            </button>
                                            <input className={`flex-1 p-3 border rounded-xl focus:border-[#0057A0] outline-none font-medium ${newQ.correctIndex === idx ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200'}`} value={newQ.options?.[idx] || ''} onChange={e => { const newOpts = [...(newQ.options || [])]; newOpts[idx] = e.target.value; setNewQ({...newQ, options: newOpts}); }} placeholder={`Option ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">"Did You Know?" Fact</label>
                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0057A0] outline-none font-medium" rows={2} value={newQ.fact || ''} onChange={e => setNewQ({...newQ, fact: e.target.value})} placeholder="Fun fact to show after answering..." />
                             </div>

                             <Button fullWidth onClick={handleSaveNew} className="mt-2">Save Question to Bank</Button>
                        </div>
                    </div>
                )}

                {/* Question List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-500 text-sm">Total Questions: {filteredQuestions.length}</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar-blue">
                        {filteredQuestions.map(q => (
                            <div key={q.id} className="p-5 hover:bg-slate-50 transition group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-blue-100 text-[#0057A0] text-[10px] font-bold uppercase rounded-lg">{q.category}</span>
                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-lg">{q.difficulty}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition cursor-pointer z-10 relative"><Trash2 size={24}/></button>
                                </div>
                                <p className="font-bold text-slate-800 mb-2">{q.text}</p>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Check size={16} className="text-green-500"/>
                                    <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">{q.options[q.correctIndex]}</span>
                                </div>
                            </div>
                        ))}
                        {filteredQuestions.length === 0 && (
                            <div className="p-10 text-center text-slate-400">No questions found matching your filters.</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* COURSE EDITOR TAB */}
        {activeTab === 'learn' && (
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] animate-fade-in">
                {/* Sidebar: Module List */}
                <div className="w-full md:w-1/3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-[#0057A0] text-white flex justify-between items-center">
                        <h3 className="font-bold">Learning Modules</h3>
                        <button onClick={() => { setIsEditingModule('new'); setNewModule({category: Category.General, description: '', units: []}); }} className="bg-white/20 p-1.5 rounded-lg hover:bg-white/30 transition"><PlusCircle size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar-blue p-2 space-y-2">
                        {modules.map(m => (
                            <div key={m.id} onClick={() => { setIsEditingModule(m.id); setNewModule(m); setEditingUnitId(null); }} className={`p-4 rounded-2xl cursor-pointer border transition-all ${isEditingModule === m.id ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-[#003D73]">{m.category}</p>
                                        <p className="text-xs text-slate-500">{m.units.length} units</p>
                                    </div>
                                    <CategoryIcon category={m.category} size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
                    {!isEditingModule ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-10 text-center">
                            <BookOpen size={64} className="mb-4 opacity-20"/>
                            <p className="font-bold text-lg">Select or create a module to begin editing</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Module Header Edit */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-[#0057A0] font-bold text-lg uppercase tracking-wide">Module Settings</h3>
                                    <div className="flex gap-2">
                                         {isEditingModule !== 'new' && <button onClick={() => handleDeleteModule(isEditingModule)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={20}/></button>}
                                         <Button size="sm" onClick={handleSaveModule} className="bg-[#30C050] border-green-600">Save Module</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <CustomSelect 
                                        label="Category"
                                        value={newModule.category || ''}
                                        options={Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))}
                                        onChange={v => setNewModule({...newModule, category: v})}
                                    />
                                    <div>
                                        <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Description</label>
                                        <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#0057A0] outline-none" value={newModule.description} onChange={e => setNewModule({...newModule, description: e.target.value})} placeholder="Short description..."/>
                                    </div>
                                </div>
                            </div>

                            {/* Units List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar-blue p-6 bg-slate-50/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-700">Learning Path ({newModule.units?.length || 0} Steps)</h4>
                                    <Button size="sm" variant="secondary" onClick={handleAddUnit}><PlusCircle size={16}/> Add Unit</Button>
                                </div>
                                
                                <div className="space-y-4">
                                    {newModule.units?.map((unit, idx) => (
                                        <div key={unit.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${editingUnitId === unit.id ? 'border-[#0057A0] shadow-md ring-2 ring-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                                            {/* Unit Header */}
                                            <div className="p-4 flex items-center justify-between cursor-pointer bg-white" onClick={() => setEditingUnitId(editingUnitId === unit.id ? null : unit.id)}>
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-slate-100 text-slate-500 font-bold w-8 h-8 flex items-center justify-center rounded-lg">{idx + 1}</div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{unit.title}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{unit.type}</span>
                                                            <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-2 py-0.5 rounded">{unit.duration}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveUnit(idx, 'up'); }} disabled={idx === 0} className="p-1 text-slate-400 hover:text-[#0057A0] disabled:opacity-30"><ArrowUp size={18}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveUnit(idx, 'down'); }} disabled={idx === (newModule.units?.length || 0) - 1} className="p-1 text-slate-400 hover:text-[#0057A0] disabled:opacity-30"><ArrowDown size={18}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteUnit(idx); }} className="p-1 text-slate-400 hover:text-red-500 ml-2"><Trash2 size={18}/></button>
                                                    <ChevronDown size={20} className={`text-slate-300 transition-transform ${editingUnitId === unit.id ? 'rotate-180' : ''}`}/>
                                                </div>
                                            </div>

                                            {/* Unit Editor Body */}
                                            {editingUnitId === unit.id && (
                                                <div className="p-4 border-t border-slate-100 bg-slate-50">
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title</label>
                                                            <input className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={unit.title} onChange={e => handleUpdateUnit(unit.id, {title: e.target.value})} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duration</label>
                                                            <input className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={unit.duration} onChange={e => handleUpdateUnit(unit.id, {duration: e.target.value})} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                                                            <div className="flex gap-2">
                                                                {['text', 'flashcards', 'quiz'].map(t => (
                                                                    <button key={t} onClick={() => handleUpdateUnit(unit.id, { type: t as any })} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border ${unit.type === t ? 'bg-[#0057A0] text-white border-[#0057A0]' : 'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Type Specific Editors */}
                                                    {unit.type === 'text' && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Content Text</label>
                                                            <textarea className="w-full p-3 rounded-lg border border-slate-200 text-sm h-32" value={unit.content || ''} onChange={e => handleUpdateUnit(unit.id, {content: e.target.value})} placeholder="Enter the educational text here..." />
                                                        </div>
                                                    )}

                                                    {unit.type === 'flashcards' && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Flashcards</label>
                                                            <div className="space-y-2">
                                                                {unit.flashcards?.map((fc, fcIdx) => (
                                                                    <div key={fcIdx} className="flex gap-2 items-start">
                                                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                                                            <input className="p-2 border rounded-lg text-xs" placeholder="Front" value={fc.front} onChange={e => {
                                                                                const newCards = [...(unit.flashcards || [])];
                                                                                newCards[fcIdx].front = e.target.value;
                                                                                handleUpdateUnit(unit.id, {flashcards: newCards});
                                                                            }} />
                                                                            <input className="p-2 border rounded-lg text-xs" placeholder="Back" value={fc.back} onChange={e => {
                                                                                const newCards = [...(unit.flashcards || [])];
                                                                                newCards[fcIdx].back = e.target.value;
                                                                                handleUpdateUnit(unit.id, {flashcards: newCards});
                                                                            }} />
                                                                        </div>
                                                                        <button onClick={() => {
                                                                            const newCards = unit.flashcards?.filter((_, i) => i !== fcIdx);
                                                                            handleUpdateUnit(unit.id, {flashcards: newCards});
                                                                        }} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => handleUpdateUnit(unit.id, { flashcards: [...(unit.flashcards || []), {front: '', back: ''}] })} className="text-xs font-bold text-[#0057A0] hover:underline">+ Add Flashcard</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {unit.type === 'quiz' && (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Question</label>
                                                                <input className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={unit.quiz?.question || ''} onChange={e => handleUpdateUnit(unit.id, { quiz: { ...unit.quiz, question: e.target.value } as any })} placeholder="Quiz Question..." />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Options (Select correct)</label>
                                                                <div className="space-y-2">
                                                                    {[0,1,2,3].map(oIdx => (
                                                                        <div key={oIdx} className="flex gap-2">
                                                                            <button onClick={() => handleUpdateUnit(unit.id, { quiz: { ...unit.quiz, correctIndex: oIdx } as any })} className={`w-6 h-6 rounded-full border flex items-center justify-center ${unit.quiz?.correctIndex === oIdx ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                                                                                <Check size={12}/>
                                                                            </button>
                                                                            <input className="flex-1 p-2 border rounded-lg text-xs" placeholder={`Option ${oIdx+1}`} value={unit.quiz?.options?.[oIdx] || ''} onChange={e => {
                                                                                const newOpts = [...(unit.quiz?.options || [])];
                                                                                newOpts[oIdx] = e.target.value;
                                                                                handleUpdateUnit(unit.id, { quiz: { ...unit.quiz, options: newOpts } as any });
                                                                            }} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [view, setView] = useState<'auth' | 'home' | 'game' | 'result' | 'admin-auth' | 'admin' | 'learn'>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) setView('home');
      else setView('auth');
    });
    return () => unsubscribe();
  }, []);

  // Sync content on load
  useEffect(() => {
    syncContentFromFirebase();
  }, []);

  const handleStartGame = (cfg: GameConfig) => {
    setConfig(cfg);
    setView('game');
  };

  const handleGameEnd = (result: GameResult) => {
    setGameResult(result);
    setView('result');
  };

  const handleLogout = async () => {
      await logoutUser();
      setUser(null);
      setView('auth');
  };

  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-[#0057A0] text-white"><Loader2 className="animate-spin" size={48}/></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003D73] via-[#0057A0] to-[#3382C5] font-sans text-slate-900 overflow-x-hidden">
       {view === 'auth' && <AuthScreen onLogin={(u) => { setUser(u); setView('home'); }} />}
       
       {view === 'home' && user && (
         <HomeScreen 
            user={user}
            onStart={handleStartGame} 
            onAdmin={() => setView('admin-auth')}
            onLearning={() => setView('learn')}
            onLogout={handleLogout}
         />
       )}

       {view === 'game' && config && (
         <GameScreen config={config} onEnd={handleGameEnd} />
       )}

       {view === 'result' && gameResult && (
         <ResultScreen result={gameResult} onHome={() => setView('home')} />
       )}

       {view === 'admin-auth' && (
         <AdminAuth onUnlock={() => setView('admin')} onBack={() => setView('home')} />
       )}

       {view === 'admin' && (
         <AdminDashboard onExit={() => setView('home')} />
       )}

       {view === 'learn' && (
           <LearningScreen onBack={() => setView('home')} username={user?.displayName || 'User'} />
       )}
    </div>
  );
};

export default App;
