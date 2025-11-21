import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?: 'info' | 'correct' | 'wrong';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, type = 'info' }) => {
  if (!isOpen) return null;

  let headerColor = 'bg-perlan-blue';
  if (type === 'correct') headerColor = 'bg-feedback-correct';
  if (type === 'wrong') headerColor = 'bg-feedback-wrong';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        <div className={`${headerColor} p-4 flex justify-between items-center text-white`}>
          <h3 className="font-heading font-bold text-lg">{title}</h3>
          {type === 'info' && (
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                <X size={20} />
            </button>
          )}
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;