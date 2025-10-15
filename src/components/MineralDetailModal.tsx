import React, { useState, useEffect } from 'react';
import { Mineral } from '../types.ts';
import Modal from './Modal.tsx';
import { ArrowLeftIcon, ArrowRightIcon } from './icons.tsx';

export type MineralDetailModalProps = {
  mineral: Mineral | null;
  isOpen: boolean;
  onClose: () => void;
};

const MineralDetailModal: React.FC<MineralDetailModalProps> = ({ mineral, isOpen, onClose }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentImageIndex(0);
        }
    }, [isOpen]);
    
    if (!mineral) return null;

    const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % mineral.imageUrls.length);
    const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + mineral.imageUrls.length) % mineral.imageUrls.length);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mineral.name}>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="relative aspect-square md:aspect-auto">
                    <img src={mineral.imageUrls[currentImageIndex]} alt={`${mineral.name} - image ${currentImageIndex + 1}`} className="w-full h-full object-cover rounded-lg" />
                     {mineral.imageUrls.length > 1 && (
                        <>
                            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-purple-600 transition-colors" aria-label="Previous image"><ArrowLeftIcon className="w-5 h-5" /></button>
                            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-purple-600 transition-colors" aria-label="Next image"><ArrowRightIcon className="w-5 h-5" /></button>
                        </>
                    )}
                </div>
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">{mineral.description}</p>
                    <div className="text-sm border-t border-white/10 pt-4 space-y-2">
                        <p><strong>Type:</strong> {mineral.type}</p>
                        <p><strong>Location:</strong> {mineral.location}</p>
                        <p><strong>Rarity:</strong> <span className={`px-2 py-0.5 rounded-full text-xs ${mineral.rarity === 'Exceptional' || mineral.rarity === 'Very Rare' ? 'bg-purple-500/30 text-purple-200' : 'bg-gray-500/30 text-gray-300'}`}>{mineral.rarity}</span></p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default MineralDetailModal;