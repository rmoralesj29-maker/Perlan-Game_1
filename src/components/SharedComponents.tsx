
import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Settings, Trophy, Users, ArrowLeft, Check, X, Clock,
  Thermometer, Mountain, Wind, Bird, History, Droplets,
  Building2, Gift, BrainCircuit, Zap, Award, Lock, Lightbulb,
  ChevronDown, Trash2, Eye, EyeOff, PieChart, BarChart2, Filter, ChevronUp, Sparkles, PlusCircle, Search, AlertCircle, BookOpen, ChevronRight, CheckCircle, RotateCcw, Edit2, ArrowUp, ArrowDown, Save, ChevronLeft, Loader2, LogOut, Mail, User as UserIcon, Download
} from 'lucide-react';
import { Category, AVATARS } from '../types';

export const CategoryIcon = ({ category, size=24 }: { category: Category, size?: number }) => {
  switch (category) {
    case Category.NorthernLights: return <Zap size={size} className="text-purple-400" />;
    case Category.Volcanoes: return <Mountain size={size} className="text-red-400" />;
    case Category.Glaciers: return <Thermometer size={size} className="text-blue-200" />;
    case Category.Wildlife: return <Bird size={size} className="text-green-400" />;
    case Category.History: return <History size={size} className="text-yellow-600" />;
    case Category.Water: return <Droplets size={size} className="text-blue-400" />;
    case Category.Perlan: return <Building2 size={size} className="text-gray-400" />;
    case Category.Christmas: return <Gift size={size} className="text-red-500" />;
    default: return <BrainCircuit size={size} className="text-white" />;
  }
};

export const AvatarDisplay = ({ avatarId, size = "md" }: { avatarId?: string, size?: "sm" | "md" | "lg" | "xl" }) => {
    const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
    const sizeClasses = {
        sm: "w-8 h-8 text-lg",
        md: "w-12 h-12 text-2xl",
        lg: "w-16 h-16 text-3xl",
        xl: "w-24 h-24 text-5xl"
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-white shadow-md border-2 border-white/50 overflow-hidden`}>
            {avatar.icon}
        </div>
    );
};

interface SelectOption {
    label: string;
    value: string | number;
}

export const CustomSelect = ({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  className = "",
  zIndex = 50
}: {
  label?: string;
  value: string | number;
  options: SelectOption[];
  onChange: (val: string | number) => void;
  placeholder?: string;
  className?: string;
  zIndex?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ zIndex: isOpen ? zIndex + 10 : zIndex }}>
      {label && <label className="block text-xs font-bold text-[#0057A0] uppercase tracking-wider mb-2 ml-1">{label}</label>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 font-bold text-left flex justify-between items-center focus:outline-none focus:border-[#0057A0] focus:ring-2 focus:ring-[#0057A0]/10 transition-all hover:bg-white shadow-sm"
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={`transition-transform duration-300 text-[#0057A0] ${isOpen ? 'rotate-180' : ''}`} size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar-blue border-2 border-blue-50 animate-slide-up overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-6 py-3 text-sm font-bold transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center
                ${value === opt.value ? 'bg-blue-50 text-[#0057A0]' : 'text-slate-600 hover:bg-gray-50 hover:text-[#0057A0]'}
              `}
            >
              {opt.label}
              {value === opt.value && <Check size={16} className="text-[#0057A0]" />}
            </button>
          ))}
          <div className="h-4 bg-gradient-to-t from-white to-transparent pointer-events-none sticky bottom-0" />
        </div>
      )}
    </div>
  );
};
