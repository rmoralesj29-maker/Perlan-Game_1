
import React from 'react';
import { Trophy, History, Check, Clock, X, Lightbulb } from 'lucide-react';
import { GameResult } from '../types';
import Button from '../components/Button';
import { getQuestions } from '../services/storageService';

export const ResultScreen: React.FC<{ result: GameResult, onHome: () => void }> = ({ result, onHome }) => {
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
