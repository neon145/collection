import { useState, useCallback, useRef, useEffect } from 'react';
import { Mineral, HomePageLayout, LayoutHistoryEntry, IdentifyImageData, ChatContent } from '../types.ts';
import { CURATOR_PASSWORD, RARITY_LEVELS } from '../constants.ts';
import { generateDescription, suggestRarity, suggestType, generateHomepageLayout, identifySpecimen, removeImageBackground, cleanImage, clarifyImage, LayoutGenerationResponse } from '../services/geminiService.ts';
import Modal from './Modal.tsx';
import { ChatBubbleIcon, SparklesIcon, TrashIcon, WandIcon, PhotoIcon, DocumentTextIcon, BroomIcon, ViewfinderIcon } from './icons.tsx';

// --- Helper Functions ---
const fileToDataUrl = (file: File): Promise<{dataUrl: string, base64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.replace('data:', '').replace(';base64', '');
      resolve({ dataUrl: result, base64: data, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};


// --- Login Modal ---
interface CuratorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const CuratorLoginModal: React.FC<CuratorLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
        setError('');
        setPassword('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CURATOR_PASSWORD) {
      onLoginSuccess();
    } else {
      setError('Incorrect password.');
      setPassword('');
      inputRef.current?.focus();
    }
  };
  
  const inputClass = "w-full bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none tracking-widest transition-all duration-300 placeholder:text-gray-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Curator Access">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
        <p className="text-gray-400 text-center">Enter the password to access curator tools.</p>
        <div>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
            {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
        </div>
        <button type="submit" className="glass-button glass-button-purple w-full">
          Unlock
        </button>
      </form>
    </Modal>
  );
};


// --- Add/Edit Mineral Modal ---
interface AddEditMineralModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (mineral: Mineral) => void;
    mineralToEdit: Mineral | null;
    allMineralTypes: string[];
    onOpenIdentifyChat: (imageData: IdentifyImageData) => void;
    identifiedNameFromAI: string | null;
    onResetIdentifiedName: () => void;
}

const emptyFormState: Omit<Mineral, 'id'> = {
    name: '',
    description: '',
    imageUrls: [],
    type: '',
    location: '',
    rarity: 'Common',
    onDisplay: false,
};

type ImageAiState = { bgRemoval?: boolean; cleanup?: boolean; clarify?: boolean; };
type CooldownState = { bgRemoval?: boolean; cleanup?: boolean; clarify?: boolean; };

export const AddEditMineralModal: React.FC<AddEditMineralModalProps> = ({ isOpen, onClose, onSave, mineralToEdit, allMineralTypes, onOpenIdentifyChat, identifiedNameFromAI, onResetIdentifiedName }) => {
    const [formState, setFormState] = useState<Omit<Mineral, 'id'>>(emptyFormState);
    const [isGenerating, setIsGenerating] = useState({ description: false, rarity: false, type: false });
    const [imageAiStates, setImageAiStates] = useState<Record<number, ImageAiState>>({});
    const [aiCooldowns, setAiCooldowns] = useState<Record<number, CooldownState>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getPrimaryImageData = () => {
        const primaryImageUrl = formState.imageUrls[0];
        if (!primaryImageUrl || !primaryImageUrl.startsWith('data:')) return null;
        const [header, data] = primaryImageUrl.split(',');
        const mimeType = header.replace('data:', '').replace(';base64', '');
        return { base64: data, mimeType };
    };

    useEffect(() => {
        if (isOpen) {
            if (mineralToEdit) {
                setFormState(mineralToEdit);
            } else {
                setFormState(emptyFormState);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
            setIsGenerating({ description: false, rarity: false, type: false });
            setImageAiStates({});
            setAiCooldowns({});
            setApiError(null);
        }
    }, [isOpen, mineralToEdit]);

    useEffect(() => {
        if (identifiedNameFromAI) {
            setFormState(prev => ({ ...prev, name: identifiedNameFromAI }));
            onResetIdentifiedName();
        }
    }, [identifiedNameFromAI, onResetIdentifiedName]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormState(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const dataPromises = files.map(fileToDataUrl);
            const imageDataResults = await Promise.all(dataPromises);
            const newDataUrls = imageDataResults.map(res => res.dataUrl);
            
            setFormState(prev => ({
                ...prev,
                imageUrls: [...prev.imageUrls, ...newDataUrls]
            }));
            
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleRemoveImage = (indexToRemove: number) => {
        setFormState(prev => ({
            ...prev,
            imageUrls: prev.imageUrls.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleGenerateDescription = async () => {
        if (!formState.name) return;
        setIsGenerating(prev => ({ ...prev, description: true }));
        const newDescription = await generateDescription(formState);
        setFormState(prev => ({ ...prev, description: newDescription }));
        setIsGenerating(prev => ({ ...prev, description: false }));
    };

    const handleSuggestRarity = async () => {
        const primaryImageData = getPrimaryImageData();
        if (!primaryImageData || !formState.name) {
            alert("Please provide a name and at least one image to suggest rarity.");
            return;
        }
        setIsGenerating(prev => ({ ...prev, rarity: true }));
        const newRarity = await suggestRarity(formState.name, primaryImageData.base64, primaryImageData.mimeType);
        setFormState(prev => ({...prev, rarity: newRarity}));
        setIsGenerating(prev => ({ ...prev, rarity: false }));
    };
    
    const handleSuggestType = async () => {
        const primaryImageData = getPrimaryImageData();
        if (!primaryImageData || !formState.name) {
            alert("Please provide a name and at least one image to suggest a type.");
            return;
        }
        setIsGenerating(prev => ({ ...prev, type: true }));
        const newType = await suggestType(formState.name, primaryImageData.base64, primaryImageData.mimeType);
        setFormState(prev => ({...prev, type: newType}));
        setIsGenerating(prev => ({ ...prev, type: false }));
    };

    const handleImageAiAction = async (index: number, action: 'bgRemoval' | 'cleanup' | 'clarify') => {
        const imageUrl = formState.imageUrls[index];
        if (!imageUrl || !imageUrl.startsWith('data:')) return;
        
        setImageAiStates(prev => ({ ...prev, [index]: { ...prev[index], [action]: true }}));
        setApiError(null);
        
        const [header, data] = imageUrl.split(',');
        const mimeType = header.replace('data:', '').replace(';base64', '');

        let newImageUrl: string | null = null;
        try {
            switch(action) {
                case 'bgRemoval':
                    newImageUrl = await removeImageBackground(data, mimeType);
                    break;
                case 'cleanup':
                    if(!formState.name) {
                        alert("Please enter a mineral name before using the cleanup tool.");
                        return;
                    }
                    newImageUrl = await cleanImage(data, mimeType, formState.name);
                    break;
                case 'clarify':
                    newImageUrl = await clarifyImage(data, mimeType);
                    break;
            }

            if (newImageUrl) {
                setFormState(prev => ({
                    ...prev,
                    imageUrls: prev.imageUrls.map((url, i) => i === index ? newImageUrl! : url)
                }));
            } else {
                 setApiError(`The ${action} action failed. The AI may be busy.`);
            }
        } catch (error: any) {
            if (error.status === 429) {
                setApiError("AI is cooling down. Free plan limits reached. Please try again in a minute.");
            } else {
                setApiError(`An unexpected error occurred during the ${action} action.`);
            }
        }
        finally {
            setImageAiStates(prev => ({ ...prev, [index]: { ...prev[index], [action]: false }}));
            setAiCooldowns(prev => ({...prev, [index]: {...prev[index], [action]: true}}));
            setTimeout(() => {
                setAiCooldowns(prev => ({...prev, [index]: {...prev[index], [action]: false}}));
            }, 60000); // 60 second cooldown
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formState.imageUrls.length === 0) {
            alert("Please upload at least one image.");
            return;
        }
        const finalMineral: Mineral = {
            id: mineralToEdit?.id || new Date().toISOString(),
            ...formState,
        };
        onSave(finalMineral);
    };

    const formFieldClass = "w-full bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none tracking-wider transition-all duration-300 placeholder:text-gray-500";
    const primaryImageData = getPrimaryImageData();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mineralToEdit ? 'Edit Specimen' : 'Add New Specimen'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                       <input type="text" name="name" value={formState.name} onChange={handleChange} placeholder="Mineral Name" className={formFieldClass} required />
                       <button type="button" onClick={() => onOpenIdentifyChat(primaryImageData!)} disabled={!primaryImageData} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                           <ChatBubbleIcon className="w-4 h-4" />
                       </button>
                    </div>
                    <input type="text" name="location" value={formState.location} onChange={handleChange} placeholder="Location" className={formFieldClass} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative">
                        <input type="text" name="type" list="mineral-types-datalist" value={formState.type} onChange={handleChange} placeholder="Type (e.g., Quartz)" className={formFieldClass} required />
                        <datalist id="mineral-types-datalist">
                            {allMineralTypes.map(type => <option key={type} value={type} />)}
                        </datalist>
                         <button type="button" onClick={handleSuggestType} disabled={isGenerating.type || !primaryImageData} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <SparklesIcon className={`w-4 h-4 ${isGenerating.type ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                     <div className="relative">
                        <select name="rarity" value={formState.rarity} onChange={handleChange} className={formFieldClass + " appearance-none"}>
                            {RARITY_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button type="button" onClick={handleSuggestRarity} disabled={isGenerating.rarity || !primaryImageData} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <SparklesIcon className={`w-4 h-4 ${isGenerating.rarity ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <textarea name="description" value={formState.description} onChange={handleChange} placeholder="Description" className={formFieldClass} rows={4} required></textarea>
                     <button type="button" onClick={handleGenerateDescription} disabled={isGenerating.description || !formState.name} className="absolute bottom-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <SparklesIcon className={`w-4 h-4 ${isGenerating.description ? 'animate-pulse' : ''}`} />
                    </button>
                </div>
                
                <div>
                    <label className="text-sm text-gray-400">Images (first is primary)</label>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-purple-200 hover:file:bg-white/20 cursor-pointer" />
                     {apiError && <p className="text-yellow-400 text-xs text-center mt-2">{apiError}</p>}
                </div>

                {formState.imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {formState.imageUrls.map((url, index) => {
                            const aiState = imageAiStates[index] || {};
                            const cooldowns = aiCooldowns[index] || {};
                            const isBusy = aiState.bgRemoval || aiState.cleanup || aiState.clarify;
                            return (
                                <div key={index} className="relative group aspect-square">
                                    <img src={url} alt={`preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    <div className={`absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center gap-1 ${isBusy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <button title="Clarify" type="button" onClick={() => handleImageAiAction(index, 'clarify')} disabled={isBusy || cooldowns.clarify} className="p-1.5 bg-black/50 rounded-full text-white hover:bg-green-600 disabled:opacity-50 disabled:animate-pulse transition-colors">
                                            <ViewfinderIcon className="w-4 h-4" />
                                        </button>
                                        <button title="Cleanup" type="button" onClick={() => handleImageAiAction(index, 'cleanup')} disabled={isBusy || cooldowns.cleanup} className="p-1.5 bg-black/50 rounded-full text-white hover:bg-yellow-600 disabled:opacity-50 disabled:animate-pulse transition-colors">
                                            <BroomIcon className="w-4 h-4" />
                                        </button>
                                        <button title="Remove Background" type="button" onClick={() => handleImageAiAction(index, 'bgRemoval')} disabled={isBusy || cooldowns.bgRemoval} className="p-1.5 bg-black/50 rounded-full text-white hover:bg-blue-600 disabled:opacity-50 disabled:animate-pulse transition-colors">
                                            <PhotoIcon className="w-4 h-4" />
                                        </button>
                                        <button title="Delete" type="button" onClick={() => handleRemoveImage(index)} disabled={isBusy} className="p-1.5 bg-black/50 rounded-full text-white hover:bg-red-600 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}


                <div className="flex items-center space-x-2 pt-2">
                    <input type="checkbox" name="onDisplay" id="onDisplay" checked={formState.onDisplay} onChange={handleChange} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500" />
                    <label htmlFor="onDisplay" className="text-gray-300">Feature on Homepage</label>
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="glass-button glass-button-purple">
                        Save
                    </button>
                </div>
            </form>
        </Modal>
    );
};


// --- Identify with AI Chat Modal ---
interface IdentifyWithAIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageData: IdentifyImageData | null;
    onNameSelect: (name: string) => void;
}

interface AIChatMessage {
    sender: 'user' | 'ai' | 'system';
    text: string;
    suggestedNames?: string[];
}

export const IdentifyWithAIChatModal: React.FC<IdentifyWithAIChatModalProps> = ({ isOpen, onClose, imageData, onNameSelect }) => {
    const [messages, setMessages] = useState<AIChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasAutoIdentified = useRef(false);

    const handleSend = useCallback(async (text: string) => {
        if (!text.trim() || isLoading || !imageData) return;

        const userMessage: AIChatMessage = { sender: 'user', text: text };
        const currentChatHistory: ChatContent[] = messages
            .filter(m => m.sender === 'user' || m.sender === 'ai')
            .map(m => {
                const role: 'user' | 'model' = m.sender === 'user' ? 'user' : 'model';
                return { role, parts: [{ text: m.text }] };
            });

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const response = await identifySpecimen(imageData.base64, imageData.mimeType, currentChatHistory, text);
        
        setIsLoading(false);
        
        const aiMessage: AIChatMessage = { sender: 'ai', text: response.text, suggestedNames: response.names };
        setMessages(prev => [...prev, aiMessage]);
    }, [isLoading, imageData, messages]);

    useEffect(() => {
        if (isOpen) {
            setMessages([]);
            setInput('');
            hasAutoIdentified.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        if(isOpen && imageData && !hasAutoIdentified.current) {
            hasAutoIdentified.current = true;
            setMessages([{ sender: 'system', text: "AI is identifying your specimen..." }]);
            
            const runInitialIdentification = async () => {
                setIsLoading(true);
                const response = await identifySpecimen(imageData.base64, imageData.mimeType);
                setIsLoading(false);
                const aiMessage: AIChatMessage = { sender: 'ai', text: response.text, suggestedNames: response.names };
                setMessages([aiMessage]);
            };
            runInitialIdentification();
        }
    }, [isOpen, imageData]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Identify Specimen with AI">
             <div className="flex flex-col h-[60vh]">
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                             {msg.sender !== 'user' && <div className="p-2 bg-purple-900/50 rounded-full flex-shrink-0"><SparklesIcon className="w-5 h-5 text-purple-300"/></div>}
                            <div className={`max-w-md rounded-lg px-4 py-2 ${
                                msg.sender === 'user' ? 'bg-purple-600 text-white' : 
                                msg.sender === 'system' ? 'bg-transparent text-center text-gray-400 text-sm italic w-full' :
                                'bg-gray-800 text-gray-300'
                            }`}>
                                <p className="text-sm">{msg.text}</p>
                                {msg.suggestedNames && msg.suggestedNames.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-xs text-gray-400 mb-1">Suggestions:</p>
                                        {msg.suggestedNames.map(name => (
                                             <button key={name} onClick={() => onNameSelect(name)} className="glass-button glass-button-green glass-button-small w-full text-left justify-start">
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-900/50 rounded-full flex-shrink-0"><SparklesIcon className="w-5 h-5 text-purple-300 animate-pulse"/></div>
                            <div className="max-w-md rounded-lg px-4 py-2 bg-gray-800 text-gray-300">
                                <p className="text-sm italic">Thinking...</p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                        placeholder="Ask a follow-up question..."
                        className="flex-grow bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none tracking-wider transition-all duration-300 placeholder:text-gray-500"
                    />
                    <button onClick={() => handleSend(input)} disabled={isLoading} className="glass-button glass-button-purple disabled:opacity-50">
                        Send
                    </button>
                </div>
            </div>
        </Modal>
    )
};



// --- Customize UI Modal ---
type View = 'chat' | 'history';
interface CustomizeUIModalProps {
    isOpen: boolean;
    onClose: () => void;
    minerals: Mineral[];
    currentLayout: HomePageLayout;
    onSaveLayout: (data: { layout: HomePageLayout, summary: string }) => void;
    layoutHistory: LayoutHistoryEntry[];
    onRestoreLayout: (entry: LayoutHistoryEntry) => void;
}
interface Message {
    sender: 'user' | 'ai' | 'system';
    text: string;
    newLayout?: HomePageLayout;
    clarification?: LayoutGenerationResponse['clarification'];
}

export const CustomizeUIModal: React.FC<CustomizeUIModalProps> = ({ isOpen, onClose, minerals, currentLayout, onSaveLayout, layoutHistory, onRestoreLayout }) => {
    const [view, setView] = useState<View>('chat');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(isOpen) {
            setView('chat');
            setMessages([{ sender: 'system', text: "Describe how you'd like to change the homepage. You can ask for animations, carousels, or grids." }]);
            setInput('');
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (prompt: string) => {
        if (!prompt.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: prompt };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const result = await generateHomepageLayout(currentLayout, minerals, prompt);
        
        setIsLoading(false);

        if (result?.layout && result?.summary) {
            const aiMessage: Message = { sender: 'ai', text: "I've generated a new layout. You can apply it now.", newLayout: result.layout };
            setMessages(prev => [...prev, aiMessage]);
            onSaveLayout({ layout: result.layout, summary: result.summary });
        } else if (result?.clarification) {
            const aiMessage: Message = { sender: 'ai', text: result.clarification.question, clarification: result.clarification };
            setMessages(prev => [...prev, aiMessage]);
        }
        else {
            const errorMessage: Message = { sender: 'ai', text: "I'm sorry, I had trouble with that request. Could you rephrase it?" };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleRestoreLayout = (entry: LayoutHistoryEntry) => {
        onRestoreLayout(entry);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={view === 'chat' ? "Customize Homepage AI" : "Layout History"}>
            <div className="flex flex-col h-[60vh]">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <div className="flex gap-4">
                        <button onClick={() => setView('chat')} className={`text-sm tracking-wider uppercase ${view === 'chat' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>Chat</button>
                        <button onClick={() => setView('history')} className={`text-sm tracking-wider uppercase ${view === 'history' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>History</button>
                    </div>
                </div>

                {view === 'chat' && (
                    <>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                    {msg.sender !== 'user' && <div className="p-2 bg-purple-900/50 rounded-full flex-shrink-0"><WandIcon className="w-5 h-5 text-purple-300"/></div>}
                                    <div className={`max-w-md rounded-lg px-4 py-2 ${
                                        msg.sender === 'user' ? 'bg-purple-600 text-white' : 
                                        msg.sender === 'system' ? 'bg-transparent border border-gray-700 text-gray-400' :
                                        'bg-gray-800 text-gray-300'
                                    }`}>
                                        <p className="text-sm">{msg.text}</p>
                                        {msg.clarification && (
                                            <div className="mt-3 space-y-2">
                                                {msg.clarification.options.map(opt => (
                                                    <button key={opt.id} onClick={() => handleSend(`I meant the one named "${opt.name}".`)} className="block w-full text-left glass-button glass-button-small">
                                                        Use: {opt.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-900/50 rounded-full flex-shrink-0"><WandIcon className="w-5 h-5 text-purple-300 animate-pulse"/></div>
                                    <div className="max-w-md rounded-lg px-4 py-2 bg-gray-800 text-gray-300"><p className="text-sm italic">Generating...</p></div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                                placeholder="e.g., Feature the Tourmaline..."
                                className="flex-grow bg-white/5 border border-white/20 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none tracking-wider transition-all duration-300 placeholder:text-gray-500"
                            />
                            <button onClick={() => handleSend(input)} disabled={isLoading} className="glass-button glass-button-purple disabled:opacity-50">
                                Send
                            </button>
                        </div>
                    </>
                )}

                {view === 'history' && (
                    <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                        {layoutHistory.length > 0 ? (
                            [...layoutHistory].sort((a,b) => b.timestamp - a.timestamp).map((entry) => (
                                <div key={entry.timestamp} className="bg-white/5 p-3 rounded-lg flex items-center gap-4">
                                    <DocumentTextIcon className="w-6 h-6 text-gray-500 flex-shrink-0"/>
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-300">{entry.summary}</p>
                                        <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => handleRestoreLayout(entry)} className="glass-button glass-button-small flex-shrink-0">Restore</button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 pt-16">No previous layouts saved.</p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};