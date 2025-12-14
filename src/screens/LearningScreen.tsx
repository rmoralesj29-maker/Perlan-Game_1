
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Sparkles, BrainCircuit, BookOpen, X } from 'lucide-react';
import { LearningModule, UserProgress } from '../types';
import Button from '../components/Button';
import { getLearningModules, getUserProgress, saveUserProgress } from '../services/storageService';
import { CategoryIcon } from '../components/SharedComponents';
import { FlashcardComponent } from '../components/FlashcardComponent';
import { MiniQuizComponent } from '../components/MiniQuizComponent';

export const LearningScreen: React.FC<{ onBack: () => void, username?: string }> = ({ onBack, username = "Guest" }) => {
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
