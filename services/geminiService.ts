import { GoogleGenAI, Type, Modality, Content } from '@google/genai';
import { Mineral, Rarity, HomePageLayout } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = 'gemini-2.5-flash';
const imageEditModel = 'gemini-2.5-flash-image';

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

const fileDataToPart = (base64Data: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
};

export const generateDescription = async (mineral: Omit<Mineral, 'id' | 'imageUrls' | 'description' | 'onDisplay' >): Promise<string> => {
    const prompt = `Generate a captivating, museum-quality description for a mineral.
    - Name: ${mineral.name}
    - Type: ${mineral.type}
    - Location: ${mineral.location}
    - Rarity: ${mineral.rarity}
    The description should be 2-3 sentences long, highlighting its unique features and appeal to collectors. Do not use markdown formatting.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating description:", error);
        return "An error occurred while generating the description. Please try again.";
    }
};

export const suggestRarity = async (name: string, imageBase64: string, imageMimeType: string): Promise<Rarity> => {
    const prompt = `Based on the image of this mineral specimen, named "${name}", suggest a rarity level. Choose only one from this list: Common, Uncommon, Rare, Very Rare, Exceptional. Return only the chosen rarity level, with no other text.`;

    try {
        const imagePart = fileDataToPart(imageBase64, imageMimeType);
        const textPart = { text: prompt };
        const response = await ai.models.generateContent({
            model: textModel,
            contents: { parts: [imagePart, textPart] },
        });
        const suggested = response.text.trim() as Rarity;
        const validRarities: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Exceptional'];
        if (validRarities.includes(suggested)) {
            return suggested;
        }
        console.warn(`AI returned invalid rarity: ${suggested}. Falling back to Common.`);
        return 'Common';
    } catch (error) {
        console.error("Error suggesting rarity:", error);
        return 'Common';
    }
};

export const identifySpecimen = async (imageBase64: string, imageMimeType: string, history?: Content[], question?: string): Promise<IdentificationResponse> => {
    const systemInstruction = "You are a friendly, expert gemologist. Your goal is to identify mineral specimens from images and answer user questions. When you identify a mineral, provide a brief, interesting description and suggest 3-5 possible specific names for it in a structured format. Be conversational and helpful.";
    
    const initialPrompt = "Please identify the mineral in this image. What are its key characteristics? Suggest some possible names for this specific specimen.";
    const userPrompt = question || initialPrompt;

    const imagePart = fileDataToPart(imageBase64, imageMimeType);
    const textPart = { text: userPrompt };
    
    const contents = [...(history || []), { role: 'user', parts: [imagePart, textPart] }];

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "A conversational description of the mineral, including key characteristics." },
                        suggestedNames: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "An array of 3-5 potential, specific names for the mineral specimen."
                        }
                    },
                    required: ['description', 'suggestedNames']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        return {
            text: jsonResponse.description,
            names: jsonResponse.suggestedNames
        };
    } catch (error) {
        console.error("Error identifying specimen:", error);
        return {
            text: "I'm sorry, I encountered an error trying to identify the specimen. Please try again or rephrase your question.",
            names: []
        };
    }
};


async function processImageEdit(imageBase64: string, imageMimeType: string, prompt: string): Promise<string | null> {
    try {
        const imagePart = fileDataToPart(imageBase64, imageMimeType);
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: imageEditModel,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType: string = part.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }
        console.error("Image edit response did not contain an image part.");
        return null;
    } catch (error) {
        console.error("Error processing image edit:", error);
        return null;
    }
}


export const removeImageBackground = (imageBase64: string, imageMimeType: string) => {
    const prompt = "Professionally photograph this mineral specimen. Place it on a pure black, reflective surface to create a subtle, mirror-like reflection underneath. The final image should have a clean, museum-quality aesthetic with a solid black background. Do not include any text or watermarks.";
    return processImageEdit(imageBase64, imageMimeType, prompt);
};

export const cleanImage = (imageBase64: string, imageMimeType: string, mineralName: string) => {
    return processImageEdit(imageBase64, imageMimeType, `Clean up this image of a ${mineralName} specimen. Remove any distracting elements like stands, labels, or fingers, but keep the mineral itself untouched and natural-looking.`);
};

export const clarifyImage = (imageBase64: string, imageMimeType: string) => {
    return processImageEdit(imageBase64, imageMimeType, "Enhance the clarity and definition of this mineral specimen image. Make the details sharper without making it look unnatural.");
};

export const generateHomepageLayout = async (currentLayout: HomePageLayout, minerals: Mineral[], prompt: string): Promise<LayoutGenerationResponse | null> => {
    const systemInstruction = `You are an AI assistant that designs the homepage layout for a luxury mineral collection website.
- You will be given the current layout, a list of available minerals, and a user's request.
- Your task is to generate a new layout that fulfills the user's request.
- The available component types are 'hero', 'grid-2' (2 columns), 'grid-3' (3 columns), 'list'.
- A 'hero' component should only contain one mineral.
- Ensure all 'mineralIds' in the new layout correspond to IDs from the provided minerals list.
- You can add, remove, or reorder components.
- You can also add animations. The only supported animation is type: 'zoom-in' with a duration string (e.g., '15s').
- If the user's request is ambiguous (e.g., they mention a mineral name but multiple minerals have similar names), you MUST ask for clarification.
- Provide a brief, one-sentence summary of the changes you made.`;

    const request = `
Current Layout:
${JSON.stringify(currentLayout, null, 2)}

Available Minerals (only use minerals that have onDisplay: true):
${JSON.stringify(minerals.filter(m => m.onDisplay).map(m => ({ id: m.id, name: m.name, type: m.type })), null, 2)}

User Request: "${prompt}"

Generate a new layout object and a summary. If the user request is ambiguous, provide a clarification question and options instead.
`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: request,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        layout: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    type: { type: Type.STRING, description: "one of 'hero', 'grid-2', 'grid-3', 'list'" },
                                    mineralIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    title: { type: Type.STRING, description: "Optional title for the component" },
                                    animation: {
                                        type: Type.OBJECT,
                                        properties: {
                                            type: { type: Type.STRING, description: "e.g., 'zoom-in' or 'none'" },
                                            duration: { type: Type.STRING, description: "e.g., '15s'" }
                                        }
                                    }
                                },
                                required: ['id', 'type', 'mineralIds']
                            }
                        },
                        summary: { type: Type.STRING, description: 'A brief summary of the changes made.' },
                        clarification: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            name: { type: Type.STRING }
                                        },
                                        required: ['id', 'name']
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const result = JSON.parse(response.text);
        
        if (result.layout && result.summary) {
            return { layout: result.layout, summary: result.summary };
        } else if (result.clarification) {
            return { clarification: result.clarification };
        }
        
        return null;

    } catch (error) {
        console.error("Error generating homepage layout:", error);
        return null;
    }
};