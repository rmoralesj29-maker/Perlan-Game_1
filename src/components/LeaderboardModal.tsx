
import React, { useState, useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { PlayerStats, UserProfile } from '../types';
import { getAllStats, getAllUsers } from '../services/storageService';
import { AvatarDisplay } from './SharedComponents';

export const LeaderboardModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
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
