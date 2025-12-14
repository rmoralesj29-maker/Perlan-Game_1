
import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Button from '../components/Button';

export const AdminAuth: React.FC<{ onUnlock: () => void, onBack: () => void }> = ({ onUnlock, onBack }) => {
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const checkPass = () => {
    // UPDATED PASSWORD as per instructions
    if (pass === 'perlan2026') onUnlock();
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
