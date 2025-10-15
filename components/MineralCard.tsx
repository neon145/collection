import React from 'react';
import { Mineral } from '../types.ts';
import { EditIcon, TrashIcon } from './icons.tsx';

export type MineralCardProps = {
  mineral: Mineral;
  isCurator: boolean;
  onSelect: (mineral: Mineral) => void;
  onEdit: (mineral: Mineral) => void;
  onDelete: (id: string) => void;
};

const MineralCard: React.FC<MineralCardProps> = ({ mineral, isCurator, onSelect, onEdit, onDelete }) => (
    <div className="relative group glass-card rounded-lg overflow-hidden cursor-pointer animate-fade-in" onClick={() => onSelect(mineral)}>
        <img src={mineral.imageUrls[0]} alt={mineral.name} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4">
            <h3 className="text-lg font-medium tracking-wider text-shadow-strong">{mineral.name}</h3>
            <p className="text-sm text-gray-400">{mineral.type}</p>
        </div>
        {isCurator && (
             <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEdit(mineral); }} className="p-2 bg-black/50 rounded-full hover:bg-purple-600"><EditIcon className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(mineral.id); }} className="p-2 bg-black/50 rounded-full hover:bg-red-600"><TrashIcon className="w-4 h-4" /></button>
            </div>
        )}
    </div>
);

export default MineralCard;
