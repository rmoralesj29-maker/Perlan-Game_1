
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, User as UserIcon } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import Button from '../components/Button';
import { loginUser, registerUser, resetPassword } from '../services/authService';
import { AVATARS } from '../types';

export const AuthScreen: React.FC<{ onLogin: (user: FirebaseUser) => void }> = ({ onLogin }) => {
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
            setError((err as Error).message);
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
            setError((err as Error).message);
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
                        <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Password</label>
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
