
import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export const FlashcardComponent: React.FC<{ cards: {front: string, back: string}[], onComplete: () => void }> = ({ cards, onComplete }) => {
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
