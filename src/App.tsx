import { useState, useEffect, useMemo, useRef } from 'react';
import { Mineral, HomePageLayout, LayoutHistoryEntry, Rarity, AppData, IdentifyImageData, HomeComponent } from './types.ts';
import { RARITY_LEVELS } from './constants.ts';
import { getDominantColor } from './services/geminiService.ts';
import { PlusIcon, EditIcon, WandIcon, MenuIcon, CloseIcon, TrashIcon } from './components/icons.tsx';
import { CuratorLoginModal, AddEditMineralModal, IdentifyWithAIChatModal, CustomizeUIModal } from './components/CuratorTools.tsx';
import MineralCard from './components/MineralCard.tsx';
import MineralDetailModal from './components/MineralDetailModal.tsx';
import HeroCarousel from './components/HeroCarousel.tsx';


// =================================================================================
// --- HELPER FUNCTIONS ---
// =================================================================================

const hexToRgb = (hex: string): string | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};


// =================================================================================
// --- MAIN APP COMPONENT ---
// =================================================================================

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
    const [identifyImageData, setIdentifyImageData] = useState<IdentifyImageData | null>(null);
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
            } catch (error)
                {
                console.error("Error fetching data from server:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Save data to server whenever appData changes (with debounce)
    useEffect(() => {
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

    // Dynamic UI effect for shadow color
    useEffect(() => {
        const setDynamicShadow = async () => {
            const firstComponent = appData.homePageLayout[0];
            if ((firstComponent?.type === 'hero' || firstComponent?.type === 'carousel') && firstComponent.mineralIds.length > 0) {
                const firstMineral = appData.minerals.find(m => m.id === firstComponent.mineralIds[0]);
                const imageUrl = firstMineral?.imageUrls[0];
                
                if (imageUrl && imageUrl.startsWith('data:')) {
                    const [header, data] = imageUrl.split(',');
                    const mimeType = header.replace('data:', '').replace(';base64', '');
                    const hexColor = await getDominantColor(data, mimeType);
                    const rgbColor = hexColor ? hexToRgb(hexColor) : null;
                    
                    if (rgbColor) {
                        document.documentElement.style.setProperty('--shadow-color-rgb', rgbColor);
                    }
                }
            }
        };
        setDynamicShadow();
    }, [appData.homePageLayout, appData.minerals]);
    
    // Derived state
    const allMineralTypes = useMemo(() => [...new Set(appData.minerals.map(m => m.type))].sort(), [appData.minerals]);
    const mineralsOnDisplay = useMemo(() => appData.minerals.filter(m => m.onDisplay), [appData.minerals]);

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
            const newMinerals = index > -1
                ? prevData.minerals.map(m => m.id === mineral.id ? mineral : m)
                : [...prevData.minerals, mineral];
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
        setAppData(prevData => ({ ...prevData, homePageLayout: entry.layout }));
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
    
    const openIdentifyChat = (imageData: IdentifyImageData) => {
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
    
    // --- RENDER METHODS ---
    const renderLayoutComponent = (component: HomeComponent) => {
        const getMineral = (id: string) => appData.minerals.find(m => m.id === id);
        const componentMinerals = component.mineralIds.map(getMineral).filter((m): m is Mineral => !!m);
        if (componentMinerals.length === 0) return null;

        const cardHandlers = { onSelect: openDetailModal, onEdit: openEditModal, onDelete: handleDeleteMineral, isCurator };

        switch (component.type) {
            case 'carousel':
                return <HeroCarousel key={component.id} component={component} minerals={componentMinerals} {...cardHandlers} />;
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
                        {componentMinerals.map(m => <MineralCard key={m.id} mineral={m} {...cardHandlers} />)}
                    </div>
                );
            case 'grid-3':
                 return (
                    <div key={component.id} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {componentMinerals.map(m => <MineralCard key={m.id} mineral={m} {...cardHandlers} />)}
                    </div>
                );
            default:
                return null;
        }
    };

    const GalleryView = () => {
        const [searchQuery, setSearchQuery] = useState('');
        const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
        const [typeFilter, setTypeFilter] = useState('all');

        const filteredMinerals = useMemo(() => {
            return appData.minerals.filter(mineral => 
                (searchQuery.toLowerCase() === '' || 
                 mineral.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 mineral.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
                (rarityFilter === 'all' || mineral.rarity === rarityFilter) &&
                (typeFilter === 'all' || mineral.type === typeFilter)
            );
        }, [appData.minerals, searchQuery, rarityFilter, typeFilter]);

        const formFieldClass = "w-full bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none tracking-wider transition-all duration-300 placeholder:text-gray-500 hover:border-white/40 appearance-none";
        
        return (
            <div className="max-w-7xl mx-auto animate-fade-in">
                <h2 className="text-3xl font-light tracking-widest uppercase text-center mb-4">Full Collection</h2>
                <div className="p-4 mb-8 glass-card rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={formFieldClass} />
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
                        {filteredMinerals.map(m => <MineralCard key={m.id} mineral={m} onSelect={openDetailModal} onEdit={openEditModal} onDelete={handleDeleteMineral} isCurator={isCurator} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400"><p className="text-lg">No specimens match your criteria.</p></div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <div className="loading-spinner"><div></div><div></div><div></div></div>
                <div className="text-lg tracking-widest text-gray-400">Loading Collection</div>
            </div>
        );
    }

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen">
            <header className="p-4 md:p-6 flex justify-between items-center fixed top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-md">
                <div className="cursor-pointer flex items-end gap-3" onClick={() => navigate('home')}>
                    <div className="grid grid-cols-2 grid-rows-2 gap-1.5">
                        <div className="w-5 h-5 rounded-full border-2 border-white"></div>
                        <div className="w-5 h-5 rounded-full border-2 border-white row-start-2"></div>
                        <div className="w-5 h-5 rounded-full bg-[#9370DB] col-start-1 row-start-2"></div>
                    </div>
                    <span className="text-3xl tracking-[0.2em] font-light leading-none">COLLECTION</span>
                </div>

                <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
                    <button onClick={() => navigate('home')} className={`uppercase tracking-widest text-sm transition-colors ${view === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Homepage</button>
                    <button onClick={() => navigate('gallery')} className={`uppercase tracking-widest text-sm transition-colors ${view === 'gallery' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Gallery</button>
                </nav>

                <div className="flex items-center gap-4">
                    {isCurator ? (
                        <button onClick={handleLogout} className="glass-button glass-button-small hidden sm:inline-flex">Viewer Mode</button>
                    ) : (
                        <button onClick={() => setLoginModalOpen(true)} className="glass-button glass-button-small hidden sm:inline-flex">Curator Mode</button>
                    )}
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden z-50 p-2 -mr-2">
                        {isMobileMenuOpen ? <CloseIcon className="w-6 h-6"/> : <MenuIcon className="w-6 h-6"/>}
                    </button>
                </div>
            </header>

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
                       {appData.homePageLayout.map(renderLayoutComponent)}
                    </div>
                ) : (
                    <GalleryView />
                )}
            </main>

            {isCurator && (
                <div className="fixed bottom-6 right-6 z-20 flex flex-col items-center gap-3">
                    <button onClick={openAddModal} className="glass-button glass-button-purple rounded-full p-3 shadow-lg hover:shadow-purple-500/30" aria-label="Add new mineral"><PlusIcon className="w-6 h-6" /></button>
                    <button onClick={() => setCustomizeUIModalOpen(true)} className="glass-button glass-button-green rounded-full p-3 shadow-lg hover:shadow-green-500/30" aria-label="Customize homepage layout"><WandIcon className="w-6 h-6" /></button>
                </div>
            )}
            
            <CuratorLoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />
            <AddEditMineralModal isOpen={addEditModalOpen} onClose={() => setAddEditModalOpen(false)} onSave={handleSaveMineral} mineralToEdit={mineralToEdit} allMineralTypes={allMineralTypes} onOpenIdentifyChat={openIdentifyChat} identifiedNameFromAI={identifiedNameFromAI} onResetIdentifiedName={() => setIdentifiedNameFromAI(null)} />
            <IdentifyWithAIChatModal isOpen={identifyChatModalOpen} onClose={() => setIdentifyChatModalOpen(false)} imageData={identifyImageData} onNameSelect={handleNameSelectFromAI} />
            <CustomizeUIModal isOpen={customizeUIModalOpen} onClose={() => setCustomizeUIModalOpen(false)} minerals={mineralsOnDisplay} currentLayout={appData.homePageLayout} onSaveLayout={handleSaveLayout} layoutHistory={appData.layoutHistory} onRestoreLayout={handleRestoreLayout} />
            <MineralDetailModal mineral={selectedMineral} isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} />
        </div>
    );
};

export default App;