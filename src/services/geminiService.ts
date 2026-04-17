import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ScriptResponse {
  captions: string;
  hashtags: string[];
  scenes: {
    id: number;
    imagePrompt: string;
    voiceOver: string;
  }[];
}

export const generateVideoScript = async (story: string): Promise<ScriptResponse> => {
  const prompt = `You are an expert video director and AI prompt engineer. 
The user wants to generate a short narrative video.
Here is the user concept/story: "${story}"

Create exactly an 8-scene storyboard. Each scene will be displayed for exactly 5 seconds.
You must return a JSON object containing:
- captions: A catchy social media caption describing the whole video.
- hashtags: An array of 3-5 relevant hashtags.
- scenes: An array of 8 scene objects.

For each scene:
- id: the number of the scene (1 to 8).
- imagePrompt: A highly detailed image generation prompt. It must explicitly describe the character's appearance, clothing, environment, lighting, and camera angle to ensure consistency. Do not use camera terms that AI image generators ignore, focus on descriptive nouns/adjectives.
- voiceOver: Exactly what will be spoken during those 5 seconds. Around 10-15 words max to fit perfectly. It must tell the story cohesively.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          captions: { type: Type.STRING },
          hashtags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                imagePrompt: { type: Type.STRING },
                voiceOver: { type: Type.STRING }
              },
              required: ["id", "imagePrompt", "voiceOver"]
            }
          }
        },
        required: ["captions", "hashtags", "scenes"]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as ScriptResponse;
};

// Helper to convert data URL to base64 and mime type
const extractBase64Data = (dataUrl: string) => {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  return {
    mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
    data
  };
};

export const generateSceneImage = async (
  prompt: string, 
  referenceImages: string[], // Base64 data URLs
  previousSceneImage?: string // Base64 data URL
): Promise<string> => { // Returns base64 data URL
  
  const parts: any[] = [];
  
  // Add reference images if any
  for (const ref of referenceImages) {
    const { mimeType, data } = extractBase64Data(ref);
    parts.push({
      inlineData: { mimeType, data }
    });
  }

  // Add previous scene image to maintain temporal consistency if available
  if (previousSceneImage) {
    const { mimeType, data } = extractBase64Data(previousSceneImage);
    parts.push({
      inlineData: { mimeType, data }
    });
  }

  // Add text prompt last
  parts.push({
    text: `Generate exactly this scene, maintaining absolute character consistency across the reference images provided. Focus on the same face, hair, and clothing. Scene description: ${prompt}`
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
       return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to extract image from response");
};
