import { Mineral, Rarity, HomePageLayout, IdentifyImageData } from '../types.ts';
import { Content } from '@google/genai';

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

async function fetchFromApi<T>(endpoint: string, body: object): Promise<T> {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        throw error; // Re-throw to be handled by the caller
    }
}


export const generateDescription = async (mineral: Omit<Mineral, 'id' | 'imageUrls' | 'description' | 'onDisplay' >): Promise<string> => {
    try {
        const result = await fetchFromApi<{ description: string }>('/api/ai/generate-description', { mineral });
        return result.description;
    } catch (error) {
        return "An error occurred while generating the description. Please try again.";
    }
};

export const suggestRarity = async (name: string, imageBase64: string, imageMimeType: string): Promise<Rarity> => {
    try {
        const result = await fetchFromApi<{ rarity: Rarity }>('/api/ai/suggest-rarity', { name, imageBase64, imageMimeType });
        return result.rarity;
    } catch (error) {
        return 'Common';
    }
};

export const identifySpecimen = async (imageBase64: string, imageMimeType: string, history?: Content[], question?: string): Promise<IdentificationResponse> => {
     try {
        return await fetchFromApi<IdentificationResponse>('/api/ai/identify-specimen', { imageBase64, imageMimeType, history, question });
    } catch (error) {
        return {
            text: "I'm sorry, I encountered an error trying to identify the specimen. Please try again or rephrase your question.",
            names: []
        };
    }
};

async function processImageEdit(endpoint: string, imageBase64: string, imageMimeType: string, mineralName?: string): Promise<string | null> {
    try {
        const body = mineralName ? { imageBase64, imageMimeType, mineralName } : { imageBase64, imageMimeType };
        const result = await fetchFromApi<{ imageUrl: string | null }>(endpoint, body);
        return result.imageUrl;
    } catch (error) {
        return null;
    }
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
        return null;
    }
};
