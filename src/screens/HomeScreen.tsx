
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Trophy, BookOpen, Lock, LogOut, ChevronDown, Check, Clock, Zap } from 'lucide-react';
import { Category, Difficulty, GameConfig, UserProfile } from '../types';
import Button from '../components/Button';
import { LeaderboardModal } from '../components/LeaderboardModal';
import { AvatarDisplay } from '../components/SharedComponents';
import { getAllUsers } from '../services/storageService';

export const HomeScreen: React.FC<{ user: User, onStart: (config: GameConfig) => void, onAdmin: () => void, onLearning: () => void, onLogout: () => void }> = ({ user, onStart, onAdmin, onLearning, onLogout }) => {
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
