
import React, { useState, useEffect } from 'react';
import {
  Settings, Users, Building2, BookOpen, Download, PieChart,
  Trash2, BrainCircuit, Sparkles, PlusCircle, Search,
  Loader2, Check, ArrowUp, ArrowDown, ChevronDown
} from 'lucide-react';
import {
  PlayerStats, Question, LearningModule, UserProfile,
  Category, Difficulty, LearningUnit
} from '../types';
import Button from '../components/Button';
import {
  getAllStats, getQuestions, getLearningModules, getAllUsers,
  deleteQuestion, addQuestion, deleteUserProfile,
  saveLearningModules, deleteLearningModuleFromCloud
} from '../services/storageService';
import { generateQuestionsWithAI } from '../services/geminiService';
import { AvatarDisplay, CategoryIcon, CustomSelect } from '../components/SharedComponents';

export const AdminDashboard: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'learn' | 'users'>('overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // New Question State
  const [isAdding, setIsAdding] = useState(false);
  const [newQ, setNewQ] = useState<Partial<Question>>({ category: Category.NorthernLights, difficulty: Difficulty.Medium, options: ['', '', ''], correctIndex: 0 });

  // AI State
  const [aiPrompt, setAiPrompt] = useState({ category: Category.NorthernLights, difficulty: Difficulty.Medium, count: 5 });
  const [isGenerating, setIsGenerating] = useState(false);

  // Course Editor State
  const [isEditingModule, setIsEditingModule] = useState<string | null>(null);
  const [newModule, setNewModule] = useState<Partial<LearningModule>>({ category: Category.General, description: '', units: [] });
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  useEffect(() => {
    setStats(getAllStats());
    setQuestions(getQuestions());
    setModules(getLearningModules());

    const fetchUsers = async () => {
        const u = await getAllUsers();
        setUsers(u);
    };
    if (activeTab === 'users' || activeTab === 'overview') fetchUsers();

  }, [activeTab]);

  const handleExportCSV = () => {
      const headers = ["Name", "Email", "Joined", "Total Games", "Total Score", "Avg Score", "Best Category"];
      const rows = users.map(u => {
          const userStats = stats.find(s => s.username === u.displayName) || { totalGames: 0, totalScore: 0, bestCategory: 'N/A' };
          const avg = userStats.totalGames > 0 ? (userStats.totalScore / userStats.totalGames).toFixed(1) : "0";
          return [
              `"${u.displayName}"`,
              `"${u.email}"`,
              `"${new Date(u.createdAt).toLocaleDateString()}"`,
              userStats.totalGames,
              userStats.totalScore,
              avg,
              `"${userStats.bestCategory || 'N/A'}"`
          ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "perlan_staff_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    // Removed window.confirm for instant delete as requested
    // Optimistic Update: Remove immediately from UI
    setQuestions(prev => prev.filter(q => q.id !== id));
    // Delete from Cloud in background
    await deleteQuestion(id);
  };

  const handleSaveNew = async () => {
    if (newQ.text && newQ.options && newQ.fact) {
      await addQuestion({ ...newQ, id: Date.now().toString() } as Question);
      setIsAdding(false);
      setQuestions(getQuestions());
      setNewQ({ category: Category.NorthernLights, difficulty: Difficulty.Medium, options: ['', '', ''], correctIndex: 0 });
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateQuestionsWithAI(aiPrompt.category, aiPrompt.difficulty, aiPrompt.count);
      for (const q of generated) {
        await addQuestion(q);
      }
      setQuestions(getQuestions());
      alert(`Successfully added ${generated.length} questions!`);
    } catch (e) {
      alert("AI Generation failed. Check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUserDelete = async (uid: string) => {
      if(window.confirm("Are you sure you want to remove this user from the list?")) {
          await deleteUserProfile(uid);
          // Refresh list
          const u = await getAllUsers();
          setUsers(u);
      }
  };

  // --- Course Editor Handlers ---
  const handleSaveModule = async () => {
      if (!newModule.category || !newModule.description) return;
      const mod: LearningModule = {
          id: newModule.id || `mod-${Date.now()}`,
          category: newModule.category,
          description: newModule.description,
          units: newModule.units || []
      };

      const updatedModules = isEditingModule
        ? modules.map(m => m.id === mod.id ? mod : m)
        : [...modules, mod];

      await saveLearningModules(updatedModules);
      setModules(updatedModules);
      setIsEditingModule(null);
      setNewModule({ category: Category.General, description: '', units: [] });
  };

  const handleDeleteModule = async (id: string) => {
      if(window.confirm("Delete this entire module?")) {
          await deleteLearningModuleFromCloud(id);
          const updated = modules.filter(m => m.id !== id);
          setModules(updated);
          saveLearningModules(updated);
      }
  }

  const handleAddUnit = () => {
      const newUnit: LearningUnit = { id: `unit-${Date.now()}`, title: "New Unit", duration: "1 min", type: 'text', content: "" };
      setNewModule({ ...newModule, units: [...(newModule.units || []), newUnit] });
      setEditingUnitId(newUnit.id);
  };

  const handleUpdateUnit = (id: string, updates: Partial<LearningUnit>) => {
      const updatedUnits = newModule.units?.map(u => u.id === id ? { ...u, ...updates } : u);
      setNewModule({ ...newModule, units: updatedUnits });
  };

  const handleMoveUnit = (index: number, direction: 'up' | 'down') => {
      if (!newModule.units) return;
      const newUnits = [...newModule.units];
      if (direction === 'up' && index > 0) {
          [newUnits[index], newUnits[index-1]] = [newUnits[index-1], newUnits[index]];
      } else if (direction === 'down' && index < newUnits.length - 1) {
          [newUnits[index], newUnits[index+1]] = [newUnits[index+1], newUnits[index]];
      }
      setNewModule({ ...newModule, units: newUnits });
  };

  const handleDeleteUnit = (index: number) => {
       const newUnits = newModule.units?.filter((_, i) => i !== index);
       setNewModule({ ...newModule, units: newUnits });
  };

  // Filtered Questions
  const filteredQuestions = questions.filter(q => {
      const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || q.category === filterCategory;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-slate-200">
         <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-[#0057A0] p-2 rounded-lg text-white"><Settings size={24} /></div>
                <h1 className="text-xl font-heading font-bold text-slate-800">Manager Board</h1>
            </div>
            <button onClick={onExit} className="text-sm font-bold text-slate-500 hover:text-[#0057A0]">Exit Manager</button>
         </div>

         {/* Tabs */}
         <div className="max-w-5xl mx-auto px-6 flex gap-6 overflow-x-auto custom-scrollbar-blue">
            {[
                { id: 'overview', label: 'Overview', icon: PieChart },
                { id: 'users', label: 'Staff Users', icon: Users },
                { id: 'questions', label: 'Question Bank', icon: Building2 },
                { id: 'learn', label: 'Course Editor', icon: BookOpen }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'overview' | 'questions' | 'learn' | 'users')}
                    className={`flex items-center gap-2 py-4 border-b-4 transition-all font-bold whitespace-nowrap ${activeTab === tab.id ? 'border-[#0057A0] text-[#0057A0]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <tab.icon size={18} /> {tab.label}
                </button>
            ))}
         </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
           <div className="space-y-6 animate-fade-in">
               <div className="flex justify-end">
                   <Button onClick={handleExportCSV} size="sm" className="bg-[#30C050] border-green-600 shadow-md gap-2">
                       <Download size={18} /> Download Report
                   </Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Games</div>
                       <div className="text-4xl font-black text-[#0057A0]">{stats.reduce((acc, s) => acc + s.totalGames, 0)}</div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Avg Score</div>
                       <div className="text-4xl font-black text-[#30C050]">
                         {stats.length > 0 ? (stats.reduce((acc, s) => acc + s.totalScore, 0) / stats.reduce((acc, s) => acc + s.totalGames, 0)).toFixed(1) : 0}
                       </div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                       <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Questions in Bank</div>
                       <div className="text-4xl font-black text-orange-500">{questions.length}</div>
                   </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="font-heading font-bold text-lg mb-6">Player Performance</h3>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                               <tr>
                                   <th className="px-4 py-3 rounded-l-lg">Username</th>
                                   <th className="px-4 py-3">Games</th>
                                   <th className="px-4 py-3">Total Score</th>
                                   <th className="px-4 py-3">Best Streak</th>
                                   <th className="px-4 py-3 rounded-r-lg">Fav Category</th>
                               </tr>
                           </thead>
                           <tbody className="font-medium text-slate-600">
                               {stats.map(s => (
                                   <tr key={s.username} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                       <td className="px-4 py-4 font-bold text-[#0057A0]">{s.username}</td>
                                       <td className="px-4 py-4">{s.totalGames}</td>
                                       <td className="px-4 py-4">{s.totalScore}</td>
                                       <td className="px-4 py-4">{s.streakRecord}</td>
                                       <td className="px-4 py-4">{s.bestCategory}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-heading font-bold text-lg">Registered Staff</h3>
                    <span className="bg-blue-100 text-[#0057A0] px-3 py-1 rounded-full text-xs font-bold">{users.length} Users</span>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                        <tr>
                            <th className="px-6 py-3">Avatar</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3">Last Login</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="font-medium text-slate-600">
                        {users.map(u => (
                            <tr key={u.uid} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="px-6 py-4"><AvatarDisplay avatarId={u.avatarId} size="sm" /></td>
                                <td className="px-6 py-4 font-bold text-[#0057A0]">{u.displayName}</td>
                                <td className="px-6 py-4">{u.email}</td>
                                <td className="px-6 py-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{new Date(u.lastLogin).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleUserDelete(u.uid)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Remove User">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* QUESTION BANK TAB */}
        {activeTab === 'questions' && (
            <div className="space-y-6 animate-fade-in">
                {/* AI Generator */}
                <div className="relative z-30 rounded-3xl shadow-lg">
                    {/* Decoration Layer (Clipped) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0057A0] to-[#003D73] rounded-3xl overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit size={120}/></div>
                    </div>

                    {/* Content Layer (Visible overflow for dropdowns) */}
                    <div className="relative p-8 text-white">
                        <h3 className="text-2xl font-heading font-bold mb-2">AI Question Generator</h3>
                        <p className="text-blue-200 mb-6 max-w-lg">Instantly generate scientifically accurate trivia questions for any category using Gemini AI.</p>

                        <div className="flex flex-col md:flex-row gap-4">
                             <CustomSelect
                               value={aiPrompt.category}
                               options={Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))}
                               onChange={(v) => setAiPrompt({...aiPrompt, category: v as Category})}
                               className="w-full md:w-64"
                               zIndex={50}
                             />
                             <CustomSelect
                               value={aiPrompt.difficulty}
                               options={Object.values(Difficulty).map(d => ({ label: d, value: d }))}
                               onChange={(v) => setAiPrompt({...aiPrompt, difficulty: v as Difficulty})}
                               className="w-full md:w-48"
                               zIndex={40}
                             />
                             <Button onClick={handleGenerateAI} disabled={isGenerating} className="shadow-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 border-yellow-600">
                                 {isGenerating ? <><Loader2 className="animate-spin" size={20}/> Generating...</> : <><Sparkles size={20}/> Generate 5 Questions</>}
                             </Button>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 z-20 relative">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                           type="text"
                           placeholder="Search questions..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:border-[#0057A0]"
                        />
                    </div>
                    <CustomSelect
                        value={filterCategory}
                        options={[{label: 'All Categories', value: 'All'}, ...Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))]}
                        onChange={(val) => setFilterCategory(val as string)}
                        className="w-full md:w-64"
                    />
                     <Button onClick={() => setIsAdding(!isAdding)} className="whitespace-nowrap">
                        {isAdding ? 'Cancel' : 'Add Manual Question'}
                    </Button>
                </div>

                {/* Add Manual Question Form */}
                {isAdding && (
                    <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-blue-50 animate-slide-up">
                        <h3 className="font-bold text-lg text-[#0057A0] mb-4">New Question Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <CustomSelect
                                label="Category"
                                value={newQ.category || ''}
                                options={Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))}
                                onChange={v => setNewQ({...newQ, category: v as Category})}
                            />
                            <CustomSelect
                                label="Difficulty"
                                value={newQ.difficulty || ''}
                                options={Object.values(Difficulty).map(d => ({ label: d, value: d }))}
                                onChange={v => setNewQ({...newQ, difficulty: v as Difficulty})}
                            />
                        </div>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Question Text</label>
                                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0057A0] outline-none font-medium" value={newQ.text || ''} onChange={e => setNewQ({...newQ, text: e.target.value})} placeholder="e.g., What is the capital of Iceland?" />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Answer Options</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {[0, 1, 2].map(idx => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <button onClick={() => setNewQ({...newQ, correctIndex: idx})} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition ${newQ.correctIndex === idx ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-300 hover:border-green-400'}`}>
                                                <Check size={16} />
                                            </button>
                                            <input className={`flex-1 p-3 border rounded-xl focus:border-[#0057A0] outline-none font-medium ${newQ.correctIndex === idx ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200'}`} value={newQ.options?.[idx] || ''} onChange={e => { const newOpts = [...(newQ.options || [])]; newOpts[idx] = e.target.value; setNewQ({...newQ, options: newOpts}); }} placeholder={`Option ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">"Did You Know?" Fact</label>
                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0057A0] outline-none font-medium" rows={2} value={newQ.fact || ''} onChange={e => setNewQ({...newQ, fact: e.target.value})} placeholder="Fun fact to show after answering..." />
                             </div>

                             <Button fullWidth onClick={handleSaveNew} className="mt-2">Save Question to Bank</Button>
                        </div>
                    </div>
                )}

                {/* Question List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-500 text-sm">Total Questions: {filteredQuestions.length}</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar-blue">
                        {filteredQuestions.map(q => (
                            <div key={q.id} className="p-5 hover:bg-slate-50 transition group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-blue-100 text-[#0057A0] text-[10px] font-bold uppercase rounded-lg">{q.category}</span>
                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-lg">{q.difficulty}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition cursor-pointer z-10 relative"><Trash2 size={24}/></button>
                                </div>
                                <p className="font-bold text-slate-800 mb-2">{q.text}</p>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Check size={16} className="text-green-500"/>
                                    <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">{q.options[q.correctIndex]}</span>
                                </div>
                            </div>
                        ))}
                        {filteredQuestions.length === 0 && (
                            <div className="p-10 text-center text-slate-400">No questions found matching your filters.</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* COURSE EDITOR TAB */}
        {activeTab === 'learn' && (
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] animate-fade-in">
                {/* Sidebar: Module List */}
                <div className="w-full md:w-1/3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-[#0057A0] text-white flex justify-between items-center">
                        <h3 className="font-bold">Learning Modules</h3>
                        <button onClick={() => { setIsEditingModule('new'); setNewModule({category: Category.General, description: '', units: []}); }} className="bg-white/20 p-1.5 rounded-lg hover:bg-white/30 transition"><PlusCircle size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar-blue p-2 space-y-2">
                        {modules.map(m => (
                            <div key={m.id} onClick={() => { setIsEditingModule(m.id); setNewModule(m); setEditingUnitId(null); }} className={`p-4 rounded-2xl cursor-pointer border transition-all ${isEditingModule === m.id ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-[#003D73]">{m.category}</p>
                                        <p className="text-xs text-slate-500">{m.units.length} units</p>
                                    </div>
                                    <CategoryIcon category={m.category} size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
                    {!isEditingModule ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-10 text-center">
                            <BookOpen size={64} className="mb-4 opacity-20"/>
                            <p className="font-bold text-lg">Select or create a module to begin editing</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Module Header Edit */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-[#0057A0] font-bold text-lg uppercase tracking-wide">Module Settings</h3>
                                    <div className="flex gap-2">
                                         {isEditingModule !== 'new' && <button onClick={() => handleDeleteModule(isEditingModule)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={20}/></button>}
                                         <Button size="sm" onClick={handleSaveModule} className="bg-[#30C050] border-green-600">Save Module</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <CustomSelect
                                        label="Category"
                                        value={newModule.category || ''}
                                        options={Object.values(Category).filter(c => c !== Category.General).map(c => ({ label: c, value: c }))}
                                        onChange={v => setNewModule({...newModule, category: v as Category})}
                                    />
                                    <div>
                                        <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">Description</label>
                                        <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#0057A0] outline-none" value={newModule.description} onChange={e => setNewModule({...newModule, description: e.target.value})} placeholder="Short description..."/>
                                    </div>
                                </div>
                            </div>

                            {/* Units List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar-blue p-6 bg-slate-50/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-700">Learning Path ({newModule.units?.length || 0} Steps)</h4>
                                    <Button size="sm" variant="secondary" onClick={handleAddUnit}><PlusCircle size={16}/> Add Unit</Button>
                                </div>

                                <div className="space-y-4">
                                    {newModule.units?.map((unit, idx) => (
                                        <div key={unit.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${editingUnitId === unit.id ? 'border-[#0057A0] shadow-md ring-2 ring-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                                            {/* Unit Header */}
                                            <div className="p-4 flex items-center justify-between cursor-pointer bg-white" onClick={() => setEditingUnitId(editingUnitId === unit.id ? null : unit.id)}>
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-slate-100 text-slate-500 font-bold w-8 h-8 flex items-center justify-center rounded-lg">{idx + 1}</div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{unit.title}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{unit.type}</span>
                                                            <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-2 py-0.5 rounded">{unit.duration}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveUnit(idx, 'up'); }} disabled={idx === 0} className="p-1 text-slate-400 hover:text-[#0057A0] disabled:opacity-30"><ArrowUp size={18}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleMoveUnit(idx, 'down'); }} disabled={idx === (newModule.units?.length || 0) - 1} className="p-1 text-slate-400 hover:text-[#0057A0] disabled:opacity-30"><ArrowDown size={18}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteUnit(idx); }} className="p-1 text-slate-400 hover:text-red-500 ml-2"><Trash2 size={18}/></button>
                                                    <ChevronDown size={20} className={`text-slate-300 transition-transform ${editingUnitId === unit.id ? 'rotate-180' : ''}`}/>
                                                </div>
                                            </div>

                                            {/* Unit Editor Body */}
                                            {editingUnitId === unit.id && (
                                                <div className="p-4 border-t border-slate-100 bg-slate-50">
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title</label>
                                                            <input className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={unit.title} onChange={e => handleUpdateUnit(unit.id, {title: e.target.value})} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duration</label>
                                                            <input className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={unit.duration} onChange={e => handleUpdateUnit(unit.id, {duration: e.target.value})} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                                                            <div className="flex gap-2">
                                                                {['text', 'flashcards', 'quiz'].map(t => (
                                                                    <button key={t} onClick={() => handleUpdateUnit(unit.id, { type: t as 'text' | 'flashcards' | 'quiz' })} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border ${unit.type === t ? 'bg-[#0057A0] text-white border-[#0057A0]' : 'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Type Specific Editors */}
                                                    {unit.type === 'text' && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Content Text</label>
                                                            <textarea className="w-full p-3 rounded-lg border border-slate-200 text-sm h-32" value={unit.content || ''} onChange={e => handleUpdateUnit(unit.id, {content: e.target.value})} placeholder="Enter the educational text here..." />
                                                        </div>
                                                    )}

                                                    {unit.type === 'flashcards' && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Flashcards</label>
                                                            <div className="space-y-2">
                                                                {unit.flashcards?.map((fc, fcIdx) => (
                                                                    <div key={fcIdx} className="flex gap-2 items-start">
                                                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                                                            <input className="p-2 border rounded-lg text-xs" placeholder="Front" value={fc.front} onChange={e => {
                                                                                const newCards = [...(unit.flashcards || [])];
                                                                                newCards[fcIdx].front = e.target.value;
                                                                                handleUpdateUnit(unit.id, {flashcards: newCards});
                                                                            }} />
                                                                            <input className="p-2 border rounded-lg text-xs" placeholder="Back" value={fc.back} onChange={e => {
                                                                                const newCards = [...(unit.flashcards || [])];
                                                                                newCards[fcIdx].back = e.target.value;
                                                                                handleUpdateUnit(unit.id, {flashcards: newCards});
                                                                            }} />
                                                                        </div>
                                                                        <button onClick={() => {
                                                                            const newCards = unit.flashcards?.filter((_, i) => i !== fcIdx);
                                                                            handleUpdateUnit(unit.id, {flashcards: newCards});
                                                                        }} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => handleUpdateUnit(unit.id, { flashcards: [...(unit.flashcards || []), {front: '', back: ''}] })} className="text-xs font-bold text-[#0057A0] hover:underline">+ Add Flashcard</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {unit.type === 'quiz' && (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Question</label>
                                                                <input className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={unit.quiz?.question || ''} onChange={e => handleUpdateUnit(unit.id, { quiz: { ...(unit.quiz || { options: [], correctIndex: 0 }), question: e.target.value } })} placeholder="Quiz Question..." />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Options (Select correct)</label>
                                                                <div className="space-y-2">
                                                                    {[0,1,2,3].map(oIdx => (
                                                                        <div key={oIdx} className="flex gap-2">
                                                                            <button onClick={() => handleUpdateUnit(unit.id, { quiz: { ...(unit.quiz || { question: '', options: [] }), correctIndex: oIdx } })} className={`w-6 h-6 rounded-full border flex items-center justify-center ${unit.quiz?.correctIndex === oIdx ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                                                                                <Check size={12}/>
                                                                            </button>
                                                                            <input className="flex-1 p-2 border rounded-lg text-xs" placeholder={`Option ${oIdx+1}`} value={unit.quiz?.options?.[oIdx] || ''} onChange={e => {
                                                                                const newOpts = [...(unit.quiz?.options || [])];
                                                                                newOpts[oIdx] = e.target.value;
                                                                                handleUpdateUnit(unit.id, { quiz: { ...(unit.quiz || { question: '', correctIndex: 0 }), options: newOpts } });
                                                                            }} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
