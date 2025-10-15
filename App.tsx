import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Mineral, HomePageLayout, LayoutHistoryEntry, Rarity, AppData } from './types.ts';
import { RARITY_LEVELS } from './constants.ts';
import { PlusIcon, EditIcon, WandIcon, ArrowLeftIcon, ArrowRightIcon, MenuIcon, CloseIcon, TrashIcon } from './components/icons.tsx';
import { CuratorLoginModal, AddEditMineralModal, IdentifyWithAIChatModal, CustomizeUIModal } from './components/CuratorTools.tsx';
import Modal from './components/Modal.tsx';

const App = () => {
    // --- STATE MANAGEMENT ---
    const [appData, setAppData] = useState<AppData>({ minerals: [], homePageLayout: [], layoutHistory: [] });
    const [isLoading, setIsLoading] = useState(true);

    const [isCurator, setIsCurator] = useState(false);
    const [view, setView] = useState<'home' | 'gallery'>('home');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Modal states
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [addEditModalOpen, setAddEditModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [identifyChatModalOpen, setIdentifyChatModalOpen] = useState(false);
    const [customizeUIModalOpen, setCustomizeUIModalOpen] = useState(false);
    
    // Data for modals
    const [mineralToEdit, setMineralToEdit] = useState<Mineral | null>(null);
    const [selectedMineral, setSelectedMineral] = useState<Mineral | null>(null);
    const [identifyImageData, setIdentifyImageData] = useState<{ base64: string; mimeType: string; } | null>(null);
    const [identifiedNameFromAI, setIdentifiedNameFromAI] = useState<string | null>(null);

    // --- DATA PERSISTENCE ---
    const debounceTimeoutRef = useRef<number | null>(null);
    const isInitialMount = useRef(true);
    
    // Load data from the server on initial mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/data');
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                const data = await response.json();
                setAppData(data);
            } catch (error) {
                console.error("Error fetching data from server:", error);
                // You could set an error state here to show a message to the user
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Save data to server whenever appData changes (with debounce)
    useEffect(() => {
        // Don't save on the initial render when appData is first populated from the server
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = window.setTimeout(async () => {
            try {
                await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appData)
                });
            } catch (err) {
                console.error("Failed to save data to server:", err);
            }
        }, 1000);
    }, [appData]);
    
    // Derived state
    const allMineralTypes = useMemo(() => [...new Set(appData.minerals.map(m => m.type))].sort(), [appData]);
    const mineralsOnDisplay = useMemo(() => appData.minerals.filter(m => m.onDisplay), [appData]);

    // --- HANDLERS ---
    const handleLoginSuccess = () => {
        setIsCurator(true);
        setLoginModalOpen(false);
    };

    const handleLogout = () => {
        setIsCurator(false);
    };

    const handleSaveMineral = (mineral: Mineral) => {
        setAppData(prevData => {
            const index = prevData.minerals.findIndex(m => m.id === mineral.id);
            let newMinerals;
            if (index > -1) {
                newMinerals = prevData.minerals.map(m => m.id === mineral.id ? mineral : m);
            } else {
                newMinerals = [...prevData.minerals, mineral];
            }
            return { ...prevData, minerals: newMinerals };
        });
        setAddEditModalOpen(false);
        setMineralToEdit(null);
    };

    const handleDeleteMineral = (mineralId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this specimen?')) {
            setAppData(prevData => {
                const newMinerals = prevData.minerals.filter(m => m.id !== mineralId);
                const newLayout = prevData.homePageLayout
                    .map(component => ({
                        ...component,
                        mineralIds: component.mineralIds.filter(id => id !== mineralId)
                    }))
                    .filter(component => component.mineralIds.length > 0);
                return { ...prevData, minerals: newMinerals, homePageLayout: newLayout };
            });
        }
    };
    
    const handleSaveLayout = ({ layout, summary }: { layout: HomePageLayout, summary: string }) => {
        setAppData(prevData => {
            const newHistory = [...prevData.layoutHistory, { layout, summary, timestamp: Date.now() }];
            return { ...prevData, homePageLayout: layout, layoutHistory: newHistory };
        });
    };

    const handleRestoreLayout = (entry: LayoutHistoryEntry) => {
        setAppData(prevData => {
            return { ...prevData, homePageLayout: entry.layout };
        });
    };

    const openAddModal = () => {
        setMineralToEdit(null);
        setAddEditModalOpen(true);
    };

    const openEditModal = (mineral: Mineral) => {
        setMineralToEdit(mineral);
        setAddEditModalOpen(true);
    };

    const openDetailModal = (mineral: Mineral) => {
        setSelectedMineral(mineral);
        setDetailModalOpen(true);
    };
    
    const openIdentifyChat = (imageData: { base64: string; mimeType: string; }) => {
        setIdentifyImageData(imageData);
        setIdentifyChatModalOpen(true);
    };

    const handleNameSelectFromAI = (name: string) => {
        setIdentifiedNameFromAI(name);
        setIdentifyChatModalOpen(false);
    };

    const navigate = (newView: 'home' | 'gallery') => {
        setView(newView);
        setIsMobileMenuOpen(false);
    };
    
    const { minerals, homePageLayout, layoutHistory } = appData;

    // --- UI RENDERING ---
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-xl tracking-widest uppercase animate-pulse text-gray-400">Loading Collection...</div>
            </div>
        );
    }

    // --- RENDER COMPONENTS ---
    
    const MineralCard = ({ mineral, onSelect, onEdit, onDelete }: { mineral: Mineral, onSelect: (m: Mineral) => void, onEdit?: (m: Mineral) => void, onDelete?: (id: string) => void }) => (
        <div className="relative group glass-card rounded-lg overflow-hidden cursor-pointer animate-fade-in" onClick={() => onSelect(mineral)}>
            <img src={mineral.imageUrls[0]} alt={mineral.name} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-4">
                <h3 className="text-lg font-medium tracking-wider text-shadow-strong">{mineral.name}</h3>
                <p className="text-sm text-gray-400">{mineral.type}</p>
            </div>
            {isCurator && onEdit && onDelete && (
                 <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(mineral); }} className="p-2 bg-black/50 rounded-full hover:bg-purple-600"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(mineral.id); }} className="p-2 bg-black/50 rounded-full hover:bg-red-600"><TrashIcon className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );

    const GalleryView = () => {
        const [searchQuery, setSearchQuery] = useState('');
        const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
        const [typeFilter, setTypeFilter] = useState('all');

        const filteredMinerals = useMemo(() => {
            return minerals.filter(mineral => {
                const searchMatch = searchQuery.toLowerCase() === '' || 
                                    mineral.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    mineral.description.toLowerCase().includes(searchQuery.toLowerCase());
                const rarityMatch = rarityFilter === 'all' || mineral.rarity === rarityFilter;
                const typeMatch = typeFilter === 'all' || mineral.type === typeFilter;
                return searchMatch && rarityMatch && typeMatch;
            });
        }, [minerals, searchQuery, rarityFilter, typeFilter]);

        const curatorHandlers = isCurator ? { onEdit: openEditModal, onDelete: handleDeleteMineral } : {};
        const formFieldClass = "w-full bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none tracking-wider transition-all duration-300 placeholder:text-gray-500 hover:border-white/40 appearance-none";
        
        return (
            <div className="max-w-7xl mx-auto animate-fade-in">
                <h2 className="text-3xl font-light tracking-widest uppercase text-center mb-4">Full Collection</h2>
                
                <div className="p-4 mb-8 glass-card rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={formFieldClass}
                        />
                         <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value as Rarity | 'all')} className={formFieldClass}>
                            <option value="all">All Rarities</option>
                            {RARITY_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={formFieldClass}>
                            <option value="all">All Types</option>
                            {allMineralTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {filteredMinerals.length > 0 ? (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredMinerals.map(m => (
                            <MineralCard 
                                key={m.id} 
                                mineral={m} 
                                onSelect={openDetailModal} 
                                {...curatorHandlers} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400">
                        <p className="text-lg">No specimens match your criteria.</p>
                        <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        );
    };

    
    const renderLayoutComponent = (component: (typeof homePageLayout)[0]) => {
        const getMineral = (id: string) => minerals.find(m => m.id === id);
        const componentMinerals = component.mineralIds.map(getMineral).filter((m): m is Mineral => !!m);
        if (componentMinerals.length === 0) return null;

        const curatorHandlers = isCurator ? { onEdit: openEditModal, onDelete: handleDeleteMineral } : {};

        switch (component.type) {
            case 'hero':
                const heroMineral = componentMinerals[0];
                return (
                    <div key={component.id} className="relative h-[70vh] rounded-lg overflow-hidden glass-card cursor-pointer" onClick={() => openDetailModal(heroMineral)}>
                        <img src={heroMineral.imageUrls[0]} alt={heroMineral.name} className="w-full h-full object-cover" style={{ animation: component.animation?.type === 'zoom-in' ? `slowZoomIn ${component.animation.duration || '20s'} ease-in-out infinite alternate` : 'none' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end p-4 md:p-12">
                            <div>
                                <h2 className="text-3xl md:text-6xl font-semibold tracking-widest uppercase text-shadow-strong" style={{fontWeight: 500}}>{heroMineral.name}</h2>
                                <p className="mt-2 text-md md:text-lg text-gray-300 max-w-2xl text-shadow-strong">{heroMineral.description.substring(0, 150)}...</p>
                            </div>
                        </div>
                        {isCurator && (
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); openEditModal(heroMineral); }} className="p-2 bg-black/50 rounded-full hover:bg-purple-600"><EditIcon className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteMineral(heroMineral.id); }} className="p-2 bg-black/50 rounded-full hover:bg-red-600"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        )}
                    </div>
                );
            case 'grid-2':
                return (
                    <div key={component.id} className="grid md:grid-cols-2 gap-6">
                        {componentMinerals.map(m => <MineralCard key={m.id} mineral={m} onSelect={openDetailModal} {...curatorHandlers} />)}
                    </div>
                );
            case 'grid-3':
                 return (
                    <div key={component.id} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {componentMinerals.map(m => <MineralCard key={m.id} mineral={m} onSelect={openDetailModal} {...curatorHandlers} />)}
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="min-h-screen">
            <header className="p-4 md:p-6 flex justify-between items-center fixed top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-md">
                {/* LOGO */}
                 <div className="cursor-pointer flex-shrink-0" onClick={() => navigate('home')}>
                    <div className="relative" style={{height: '40px', width: '250px'}}>
                        <div className="absolute flex items-end" style={{lineHeight: '1', top: 0, left: '32px'}}>
                            <span className="text-3xl tracking-[0.2em] font-light">COLLECTION</span>
                        </div>
                        <div className="absolute" style={{top: 0, left: 0}}>
                            <div className="w-5 h-5 rounded-full border-2 border-white"></div>
                        </div>
                         <div className="absolute" style={{top: '20px', left: 0}}>
                            <div className="w-5 h-5 rounded-full bg-[#9370DB]"></div>
                         </div>
                         <div className="absolute" style={{top: '20px', left: '22px'}}>
                            <div className="w-5 h-5 rounded-full border-2 border-white"></div>
                        </div>
                    </div>
                 </div>

                {/* NAV */}
                <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
                    <button onClick={() => navigate('home')} className={`uppercase tracking-widest text-sm transition-colors ${view === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                        Homepage
                    </button>
                    <button onClick={() => navigate('gallery')} className={`uppercase tracking-widest text-sm transition-colors ${view === 'gallery' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                        Gallery
                    </button>
                </nav>

                <div className="flex items-center gap-4">
                    {isCurator ? (
                        <button onClick={handleLogout} className="glass-button glass-button-small hidden sm:inline-flex">Viewer Mode</button>
                    ) : (
                        <button onClick={() => setLoginModalOpen(true)} className="glass-button glass-button-small hidden sm:inline-flex">Curator Mode</button>
                    )}
                    {/* Mobile Menu Button */}
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden z-50 p-2 -mr-2">
                        {isMobileMenuOpen ? <CloseIcon className="w-6 h-6"/> : <MenuIcon className="w-6 h-6"/>}
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
             {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-lg z-30 flex flex-col items-center justify-center animate-fade-in">
                    <nav className="flex flex-col items-center gap-8 text-center">
                         <button onClick={() => navigate('home')} className="text-xl uppercase tracking-widest text-gray-300 hover:text-white">Homepage</button>
                         <button onClick={() => navigate('gallery')} className="text-xl uppercase tracking-widest text-gray-300 hover:text-white">Gallery</button>
                         <hr className="w-16 border-white/20 my-4" />
                         {isCurator ? (
                            <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="glass-button">Viewer Mode</button>
                         ) : (
                            <button onClick={() => { setLoginModalOpen(true); setIsMobileMenuOpen(false); }} className="glass-button">Curator Mode</button>
                         )}
                    </nav>
                </div>
            )}


            <main className="px-4 md:px-6 pt-36 md:pt-40 pb-24">
                 {view === 'home' ? (
                    <div className="max-w-7xl mx-auto space-y-6 md:space-y-12 animate-fade-in">
                       {homePageLayout.map(renderLayoutComponent)}
                    </div>
                ) : (
                    <GalleryView />
                )}
            </main>

            {isCurator && (
                <div className="fixed bottom-6 right-6 z-20 flex flex-col items-center gap-3">
                    <button onClick={openAddModal} className="glass-button glass-button-purple rounded-full p-3 shadow-lg hover:shadow-purple-500/30" aria-label="Add new mineral">
                        <PlusIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => setCustomizeUIModalOpen(true)} className="glass-button glass-button-green rounded-full p-3 shadow-lg hover:shadow-green-500/30" aria-label="Customize homepage layout">
                        <WandIcon className="w-6 h-6" />
                    </button>
                </div>
            )}
            
            {/* --- MODALS --- */}
            <CuratorLoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />
            
            <AddEditMineralModal 
                isOpen={addEditModalOpen} 
                onClose={() => setAddEditModalOpen(false)} 
                onSave={handleSaveMineral}
                mineralToEdit={mineralToEdit}
                allMineralTypes={allMineralTypes}
                onOpenIdentifyChat={openIdentifyChat}
                identifiedNameFromAI={identifiedNameFromAI}
                onResetIdentifiedName={() => setIdentifiedNameFromAI(null)}
            />
            
            <IdentifyWithAIChatModal
                isOpen={identifyChatModalOpen}
                onClose={() => setIdentifyChatModalOpen(false)}
                imageData={identifyImageData}
                onNameSelect={handleNameSelectFromAI}
            />

            <CustomizeUIModal
                isOpen={customizeUIModalOpen}
                onClose={() => setCustomizeUIModalOpen(false)}
                minerals={mineralsOnDisplay}
                currentLayout={homePageLayout}
                onSaveLayout={handleSaveLayout}
                layoutHistory={layoutHistory}
                onRestoreLayout={handleRestoreLayout}
            />
            
            {selectedMineral && <MineralDetailModal mineral={selectedMineral} isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} />}
        </div>
    );
};

// --- Mineral Detail Modal ---
const MineralDetailModal = ({ mineral, isOpen, onClose }: { mineral: Mineral, isOpen: boolean, onClose: () => void }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentImageIndex(0);
        }
    }, [isOpen]);
    
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


export default App;