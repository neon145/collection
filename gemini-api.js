import { GoogleGenAI, Type, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = 'gemini-2.5-flash';
const imageEditModel = 'gemini-2.5-flash-image';

const fileDataToPart = (base64Data, mimeType) => {
    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
};

export const generateDescription = async ({ mineral }) => {
    const prompt = `Generate a captivating, museum-quality description for a mineral.
    - Name: ${mineral.name}
    - Type: ${mineral.type}
    - Location: ${mineral.location}
    - Rarity: ${mineral.rarity}
    The description should be 2-3 sentences long, highlighting its unique features and appeal to collectors. Do not use markdown formatting.`;

    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
    });
    return { description: response.text.trim() };
};

export const suggestRarity = async ({ name, imageBase64, imageMimeType }) => {
    const prompt = `Based on the image of this mineral specimen, named "${name}", suggest a rarity level. Choose only one from this list: Common, Uncommon, Rare, Very Rare, Exceptional. Return only the chosen rarity level, with no other text.`;

    const imagePart = fileDataToPart(imageBase64, imageMimeType);
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
        model: textModel,
        contents: { parts: [imagePart, textPart] },
    });
    const suggested = response.text.trim();
    const validRarities = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Exceptional'];
    if (validRarities.includes(suggested)) {
        return { rarity: suggested };
    }
    console.warn(`AI returned invalid rarity: ${suggested}. Falling back to Common.`);
    return { rarity: 'Common' };
};

export const suggestType = async ({ name, imageBase64, imageMimeType }) => {
    const prompt = `Based on the image and name ('${name}') of this specimen, what is its general mineral classification or type (e.g., Quartz, Feldspar, Igneous Rock)? Return only the type name.`;
    const imagePart = fileDataToPart(imageBase64, imageMimeType);
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
        model: textModel,
        contents: { parts: [imagePart, textPart] },
    });
    return { type: response.text.trim() };
};


export const identifySpecimen = async ({ imageBase64, imageMimeType, history, question }) => {
    const systemInstruction = "You are a friendly, expert gemologist. Your goal is to identify mineral specimens from images and answer user questions. When you identify a mineral, provide a brief, interesting description and suggest 3-5 possible specific names for it in a structured format. Be conversational and helpful.";
    
    const initialPrompt = "Please identify the mineral in this image. What are its key characteristics? Suggest some possible names for this specific specimen.";
    const userPrompt = question || initialPrompt;

    const imagePart = fileDataToPart(imageBase64, imageMimeType);
    const textPart = { text: userPrompt };
    
    const contents = [...(history || []), { role: 'user', parts: [imagePart, textPart] }];

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
};

async function processImageEdit({ imageBase64, imageMimeType, prompt }) {
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
            const base64ImageBytes = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            return { imageUrl: `data:${mimeType};base64,${base64ImageBytes}` };
        }
    }
    console.error("Image edit response did not contain an image part.");
    return { imageUrl: null };
}

export const removeImageBackground = (body) => {
    const prompt = "Professionally photograph this mineral specimen. Place it on a pure black, reflective surface to create a subtle, mirror-like reflection underneath. The final image should have a clean, museum-quality aesthetic with a solid black background. Do not include any text or watermarks.";
    return processImageEdit({ ...body, prompt });
};

export const cleanImage = ({ imageBase64, imageMimeType, mineralName }) => {
    const prompt = `Clean up this image of a ${mineralName} specimen. Remove any distracting elements like stands, labels, or fingers, but keep the mineral itself untouched and natural-looking.`;
    return processImageEdit({ imageBase64, imageMimeType, prompt });
};

export const clarifyImage = (body) => {
    const prompt = "Enhance the clarity and definition of this mineral specimen image. Make the details sharper without making it look unnatural.";
    return processImageEdit({ ...body, prompt });
};

export const getDominantColor = async ({ imageBase64, imageMimeType }) => {
    const prompt = "Analyze this image and return the dominant color as a hex code. Return only the hex code and nothing else. e.g. #A7B2C4";
    const imagePart = fileDataToPart(imageBase64, imageMimeType);
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
        model: textModel,
        contents: { parts: [imagePart, textPart] },
    });
    const color = response.text.trim();
    if (/^#[0-9A-F]{6}$/i.test(color)) {
        return { color };
    }
    return { color: null };
};

export const generateHomepageLayout = async ({ currentLayout, minerals, prompt }) => {
    const systemInstruction = `You are an AI assistant that designs the homepage layout for a luxury mineral collection website.
- You will be given the current layout, a list of available minerals, and a user's request.
- Your task is to generate a new layout that fulfills the user's request.
- The available component types are 'hero', 'carousel', 'grid-2' (2 columns), 'grid-3' (3 columns).
- A 'hero' component should only contain one mineral. A 'carousel' can contain multiple minerals.
- For 'hero' and 'carousel' components, you should ALWAYS add a subtle 'zoom-in' animation with a duration between 15s and 30s unless the user explicitly requests no animation.
- A 'carousel' can also have a 'speed' property, which is the time in seconds each slide is displayed (default is 8).
- Ensure all 'mineralIds' in the new layout correspond to IDs from the provided minerals list.
- You can add, remove, or reorder components.
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
                                type: { type: Type.STRING, description: "one of 'hero', 'carousel', 'grid-2', 'grid-3'" },
                                mineralIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                                title: { type: Type.STRING, description: "Optional title for the component" },
                                animation: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING, description: "e.g., 'zoom-in' or 'none'" },
                                        duration: { type: Type.STRING, description: "e.g., '20s'" }
                                    }
                                },
                                speed: { type: Type.INTEGER, description: "For carousel, seconds per slide."}
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
};