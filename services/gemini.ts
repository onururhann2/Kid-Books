import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";
import { StoryPage, Language } from "../types";

// Ensure API key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'German',
  it: 'Italian',
  tr: 'Turkish'
};

// Strict Safety Settings for Children's Content
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

const SYSTEM_INSTRUCTION = `You are a professional children's book author. 
Your mission is to write safe, educational, and engaging stories for children aged 6-10.
STRICT SAFETY RULES:
1. NEVER generate content that is violent, scary, sexual, hateful, or dangerous.
2. If a user asks for a story about an inappropriate topic, politeley refuse or pivot the story to a safe, positive version of that topic.
3. Ensure all characters modeled demonstrate positive values like kindness, friendship, and bravery.`;

// Helper for Exponential Backoff Retry
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Retry on rate limits (429) or server errors (503, 500)
    if (retries > 0) {
      console.warn(`API call failed, retrying in ${delay}ms... (${retries} retries left). Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2); // Double the delay for next retry
    }
    throw error;
  }
}

export const generateStoryScript = async (topic: string, character: string, pageCount: number, language: Language): Promise<{ title: string, pages: Omit<StoryPage, 'isGeneratingImage'>[] }> => {
  const model = "gemini-2.5-flash";
  const languageName = LANGUAGE_NAMES[language];
  
  // Input validation/sanitization
  const sanitizedTopic = topic.trim().slice(0, 100); 
  const sanitizedCharacter = character.trim().slice(0, 50);

  let prompt = `Write a children's book about: "${sanitizedTopic}". `;
  if (sanitizedCharacter) {
    prompt += `The story MUST feature a main character described as: "${sanitizedCharacter}". `;
  }
  
  prompt += `
  The book must be exactly ${pageCount} pages long.
  The target audience is kids aged 6-10.
  
  Write the story in ${languageName}.
  
  Return a JSON object with a 'title' and a 'pages' array.
  Each page object in the array must have:
  - 'pageNumber' (integer)
  - 'text' (the story text for this page, approx 2-4 sentences, in ${languageName})
  - 'imagePrompt' (a detailed description for an AI image generator to illustrate this page. Use a colorful, cartoon illustration style. ${sanitizedCharacter ? `Make sure the character (${sanitizedCharacter}) is depicted consistently.` : ''} IMPORTANT: Write the imagePrompt in English, regardless of the story language, for best image generation results.)`;

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          safetySettings: SAFETY_SETTINGS,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              pages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pageNumber: { type: Type.INTEGER },
                    text: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                  },
                  required: ["pageNumber", "text", "imagePrompt"]
                }
              }
            },
            required: ["title", "pages"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error("STORY_BLOCKED_SAFETY");
        }
        throw new Error("No text returned from Gemini");
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating story script:", error);
      throw error;
    }
  });
};

export const generateIllustration = async (prompt: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";

  return withRetry(async () => {
    try {
      // Correct structure for image generation model
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: {
          safetySettings: SAFETY_SETTINGS,
        }
      });

      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("IMAGE_BLOCKED_SAFETY");
      }

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("No image data found in response");
    } catch (error) {
      console.error("Error generating illustration:", error);
      throw error;
    }
  }, 3, 3000); // More aggressive backoff for images
};

export const editIllustration = async (imageBase64: string, editPrompt: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";
  
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  const mimeType = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,/)?.[1] || 'image/png';

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: `image/${mimeType}`,
                data: base64Data
              }
            },
            {
              text: `Edit this image: ${editPrompt}. Maintain the same illustration style.`
            }
          ]
        },
        config: {
          safetySettings: SAFETY_SETTINGS
        }
      });

      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error("EDIT_BLOCKED_SAFETY");
      }

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No edited image data found in response");
    } catch (error) {
      console.error("Error editing illustration:", error);
      throw error;
    }
  });
};

export const generateSpeech = async (text: string, language: Language): Promise<string> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' } // 'Puck', 'Fenrir' etc are options
            }
          }
        }
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        throw new Error("No audio data returned");
      }

      return audioData;
    } catch (error) {
      console.error("Error generating speech:", error);
      throw error;
    }
  });
};