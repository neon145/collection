import { useState, useEffect, useRef } from 'react';
import { Mineral, HomeComponent } from '../types.ts';
import { MineralCardProps } from './MineralCard.tsx';
import { ArrowLeftIcon, ArrowRightIcon, EditIcon, TrashIcon } from './icons.tsx';

type HeroCarouselProps = Omit<MineralCardProps, 'mineral'> & {
    component: HomeComponent;
    minerals: Mineral[];
};

const HeroCarousel: React.FC<HeroCarouselProps> = ({ component, minerals, onSelect, onEdit, onDelete, isCurator }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<number | null>(null);

    const speed = (component.speed || 8) * 1000;

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    useEffect(() => {
        resetTimeout();
        timeoutRef.current = window.setTimeout(
            () => setCurrentIndex((prevIndex) => (prevIndex + 1) % minerals.length),
            speed
        );
        return () => resetTimeout();
    }, [currentIndex, minerals.length, speed]);

    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    };

    const prevSlide = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? minerals.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };
    
    const nextSlide = () => {
        const isLastSlide = currentIndex === minerals.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    if (!minerals || minerals.length === 0) return null;
    
    return (
        <div className="relative h-[70vh] rounded-lg overflow-hidden glass-card">
            <div className="w-full h-full relative">
                {minerals.map((mineral, index) => (
                    <div
                        key={mineral.id}
                        className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
                        style={{ transform: `translateX(${(index - currentIndex) * 100}%)` }}
                    >
                        <div className="w-full h-full cursor-pointer" onClick={() => onSelect(mineral)}>
                             <img 
                                src={mineral.imageUrls[0]} 
                                alt={mineral.name} 
                                className="w-full h-full object-cover" 
                                style={{ animation: component.animation?.type === 'zoom-in' ? `slowZoomIn ${component.animation.duration || '20s'} ease-in-out infinite alternate` : 'none' }} 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end p-4 md:p-12">
                                <div>
                                    <h2 className="text-3xl md:text-6xl font-semibold tracking-widest uppercase text-shadow-strong" style={{fontWeight: 500}}>{mineral.name}</h2>
                                    <p className="mt-2 text-md md:text-lg text-gray-300 max-w-2xl text-shadow-strong">{mineral.description.substring(0, 150)}...</p>
                                </div>
                            </div>
                        </div>
                        {isCurator && (
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(mineral); }} className="p-2 bg-black/50 rounded-full hover:bg-purple-600"><EditIcon className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(mineral.id); }} className="p-2 bg-black/50 rounded-full hover:bg-red-600"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 glass-button rounded-full !p-2"><ArrowLeftIcon className="w-6 h-6" /></button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 glass-button rounded-full !p-2"><ArrowRightIcon className="w-6 h-6" /></button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {minerals.map((_, index) => (
                    <button key={index} onClick={() => goToSlide(index)} className={`w-3 h-3 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}></button>
                ))}
            </div>
        </div>
    );
};

export default HeroCarousel;