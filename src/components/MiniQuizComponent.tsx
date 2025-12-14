
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

export const MiniQuizComponent: React.FC<{ quiz: {question: string, options: string[], correctIndex: number}, onComplete: () => void }> = ({ quiz, onComplete }) => {
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
