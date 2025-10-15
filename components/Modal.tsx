import React, { ReactNode } from 'react';
import { CloseIcon } from './icons.tsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="modal-glass rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col relative animate-modal-pop-in subtle-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg tracking-widest text-gray-200 uppercase font-light">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;