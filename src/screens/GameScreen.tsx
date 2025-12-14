
import React, { useState, useEffect } from 'react';
import { Clock, Zap, Check, X, Lightbulb, ChevronRight } from 'lucide-react';
import { Category, GameConfig, GameResult, PlayerAnswer, Question } from '../types';
import Button from '../components/Button';
import { getQuestions, saveGameResult } from '../services/storageService';
import { CategoryIcon } from '../components/SharedComponents';

export const GameScreen: React.FC<{ config: GameConfig, onEnd: (result: GameResult) => void }> = ({ config, onEnd }) => {
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
