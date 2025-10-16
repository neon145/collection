import { Mineral, Rarity, HomePageLayout, ChatContent } from '../types.ts';

export interface LayoutGenerationResponse {
    layout?: HomePageLayout;
    summary?: string;
    clarification?: {
        question: string;
        options: { id: string, name: string }[];
    }
}

export interface IdentificationResponse {
    text: string;
    names: string[];
}

// A generic fetch wrapper for API calls to our own backend
async function fetchFromApi<T>(endpoint: string, body: object): Promise<T> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        // Forward the response so the calling function can inspect the status code
        throw response;
    }
    return response.json();
}

export const generateDescription = async (mineral: Omit<Mineral, 'id' | 'imageUrls' | 'description' | 'onDisplay' >): Promise<string> => {
    try {
        const result = await fetchFromApi<{ description: string }>('/api/ai/generate-description', { mineral });
        return result.description;
    } catch (error) {
        console.error("Error generating description:", error);
        return "An error occurred while generating the description. Please try again.";
    }
};

export const suggestRarity = async (name: string, imageBase64: string, imageMimeType: string): Promise<Rarity> => {
    try {
        const result = await fetchFromApi<{ rarity: Rarity }>('/api/ai/suggest-rarity', { name, imageBase64, imageMimeType });
        return result.rarity;
    } catch (error) {
        console.error("Error suggesting rarity:", error);
        return 'Common';
    }
};

export const suggestType = async (name: string, imageBase64: string, imageMimeType: string): Promise<string> => {
    try {
        const result = await fetchFromApi<{ type: string }>('/api/ai/suggest-type', { name, imageBase64, imageMimeType });
        return result.type;
    } catch (error) {
        console.error("Error suggesting type:", error);
        return '';
    }
};


export const identifySpecimen = async (imageBase64: string, imageMimeType: string, history?: ChatContent[], question?: string): Promise<IdentificationResponse> => {
     try {
        return await fetchFromApi<IdentificationResponse>('/api/ai/identify-specimen', { imageBase64, imageMimeType, history, question });
    } catch (error) {
        console.error("Error identifying specimen:", error);
        return {
            text: "I'm sorry, I encountered an error trying to identify the specimen. Please try again or rephrase your question.",
            names: []
        };
    }
};

async function processImageEdit(endpoint: string, imageBase64: string, imageMimeType: string, mineralName?: string): Promise<string | null> {
    const body = mineralName ? { imageBase64, imageMimeType, mineralName } : { imageBase64, imageMimeType };
    const result = await fetchFromApi<{ imageUrl: string | null }>(endpoint, body);
    return result.imageUrl;
}

export const removeImageBackground = (imageBase64: string, imageMimeType: string) => {
    return processImageEdit('/api/ai/remove-background', imageBase64, imageMimeType);
};

export const cleanImage = (imageBase64: string, imageMimeType: string, mineralName: string) => {
    return processImageEdit('/api/ai/clean-image', imageBase64, imageMimeType, mineralName);
};

export const clarifyImage = (imageBase64: string, imageMimeType: string) => {
    return processImageEdit('/api/ai/clarify-image', imageBase64, imageMimeType);
};

export const generateHomepageLayout = async (currentLayout: HomePageLayout, minerals: Mineral[], prompt: string): Promise<LayoutGenerationResponse | null> => {
    try {
        return await fetchFromApi<LayoutGenerationResponse>('/api/ai/generate-layout', { currentLayout, minerals, prompt });
    } catch (error) {
        console.error("Error generating layout:", error);
        return null;
    }
};

export const getDominantColor = async (imageBase64: string, imageMimeType: string): Promise<string | null> => {
    try {
        const result = await fetchFromApi<{ color: string }>('/api/ai/get-dominant-color', { imageBase64, imageMimeType });
        return result.color;
    } catch (error) {
        console.error("Error getting dominant color:", error);
        return null;
    }
};