
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

import { GameConfig, GameResult } from './types';
import { syncContentFromFirebase } from './services/storageService';
import { subscribeToAuthChanges, logoutUser } from './services/authService';

import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { AdminAuth } from './screens/AdminAuth';
import { AdminDashboard } from './screens/AdminDashboard';
import { LearningScreen } from './screens/LearningScreen';

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
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user && view === 'auth') {
        setView('home');
    } else if (!user && view !== 'auth') {
        setView('auth');
    }
  }, [user, authLoading]); // Intentionally exclude 'view' to avoid resetting user navigation

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
