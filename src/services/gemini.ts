import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODEL_NAME = "gemini-3-flash-preview";

export async function generateLyrics(prompt: string, language: string, existingLyrics?: string, gender: 'male' | 'female' = 'male') {
  try {
    const systemInstruction = `You are a world-class songwriter. 
    Your goal is to write high-quality, emotionally resonant lyrics in ${language}.
    If the language is Hebrew, you MUST provide the lyrics with full Nikud (vocalization marks) if requested, or be able to add them.
    CRITICAL: If the language is Hebrew, the lyrics and Nikud MUST be appropriate for a ${gender} singer.
    Focus on rhythm, rhyme, and deep meaning.
    CRITICAL: Always label each section of the song clearly using square brackets, for example: [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro].
    In Hebrew, use: [בית 1], [פזמון], [בית 2], [גשר], [סיום].
    CRITICAL: Output ONLY the lyrics. Do not include any explanations, introductions, or extra text.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `CRITICAL: The lyrics MUST be written in ${language}.
      Topic/Idea: ${prompt}${existingLyrics ? `\nExisting lines to continue: ${existingLyrics}` : ""}`,
      config: {
        systemInstruction,
      },
    });

    return response.text || "Failed to generate lyrics. Please try again.";
  } catch (error) {
    console.error("Gemini Error (Lyrics):", error);
    throw error;
  }
}

export async function refineLyrics(lyrics: string, language: string, instructions?: string, gender: 'male' | 'female' = 'male') {
  try {
    const systemInstruction = `You are a world-class songwriter and editor. 
    Your goal is to IMPROVE and REFINE the provided lyrics in ${language}.
    Focus on enhancing the flow, vocabulary, emotional impact, and structure.
    Keep the original theme but make it more professional and poetic.
    If the language is Hebrew, ensure correct Nikud (vocalization marks) are applied.
    CRITICAL: If the language is Hebrew, the lyrics and Nikud MUST be appropriate for a ${gender} singer.
    CRITICAL: Always label each section of the song clearly using square brackets, for example: [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro].
    In Hebrew, use: [בית 1], [פזמון], [בית 2], [גשר], [סיום].
    CRITICAL: Output ONLY the refined lyrics. Do not include any explanations, introductions, or extra text.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `CRITICAL: The refined lyrics MUST be written in ${language}.
      Original Lyrics: ${lyrics}\nSpecific Instructions: ${instructions || "Improve the overall quality and flow."}`,
      config: {
        systemInstruction,
      },
    });

    return response.text || "Failed to refine lyrics. Please try again.";
  } catch (error) {
    console.error("Gemini Error (Refine):", error);
    throw error;
  }
}

export async function processWord(word: string, action: 'replace' | 'nikud', context: string) {
  try {
    const systemInstruction = `You are a linguistic expert. 
    Action: ${action}.
    If 'replace': suggest 5 high-quality synonyms or alternatives for the word "${word}" that fit the context: "${context}".
    If 'nikud': provide the word "${word}" with correct Hebrew Nikud (vocalization). If it's not Hebrew, explain why.
    Output in JSON format.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Word: ${word}\nContext: ${context}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            explanation: { type: Type.STRING }
          }
        }
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error (Word):", error);
    throw error;
  }
}

export async function generateArrangement(
  lyrics: string, 
  styles: string[], 
  instruments: string[], 
  vocals: string[], 
  recording: string[], 
  manualIdea?: string,
  vocalEffects: string[] = [],
  musicians: { instrument: string, type: string }[] = [],
  backingVocals: { gender: string, style: string }[] = [],
  countryInfluences: string[] = []
) {
  try {
    const systemInstruction = `You are a professional music producer.
    ${lyrics ? `Based on the lyrics provided, generate a detailed production plan.` : `Generate a detailed production plan for a musical piece.`}
    1. A professional English prompt for an AI music generator (like Suno or Udio) describing the sound, mood, and production.
    2. A list of recommended instruments and why they fit.
    3. Suggestions for song structure (Intro, Verse, Chorus, etc.) based on the chosen styles: ${styles.join(", ")}.
    4. Vocal styles description: ${vocals.join(", ")}.
    5. Vocal Effects to apply: ${vocalEffects.join(", ")}.
    6. Specific Musicians/Instruments requested: ${musicians.map(m => `${m.type} ${m.instrument}`).join(", ")}.
    7. Backing Vocals: ${backingVocals.map(bv => `${bv.gender} ${bv.style}`).join(", ")}.
    8. Country/Cultural Influences: ${countryInfluences.join(", ")}.
    9. Recording qualities/formats: ${recording.join(", ")}.
    10. How to blend the styles effectively.
    ${manualIdea ? `11. Incorporate and expand upon these specific user ideas: ${manualIdea}` : ""}
    CRITICAL: The entire response MUST NOT exceed 1000 characters. This is a hard limit. Be extremely concise.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Lyrics: ${lyrics ? lyrics.slice(0, 2000) : "No lyrics provided (Instrumental or generic plan)"}\nStyles: ${styles.join(", ")}\nInstruments: ${instruments.join(", ")}\nVocals: ${vocals.join(", ")}\nRecording: ${recording.join(", ")}${manualIdea ? `\nUser Ideas: ${manualIdea}` : ""}\nCountry Influences: ${countryInfluences.join(", ")}`,
      config: {
        systemInstruction,
      },
    });

    const text = response.text || "Failed to generate arrangement.";
    return text.length > 1000 ? text.slice(0, 1000) + "..." : text;
  } catch (error) {
    console.error("Gemini Error (Arrangement):", error);
    throw error;
  }
}

export async function vocalizeLyrics(lyrics: string, gender: 'male' | 'female') {
  try {
    const systemInstruction = `You are a Hebrew linguistic expert specializing in Nikud (vocalization).
    Your task is to add full and accurate Nikud to the provided Hebrew lyrics.
    CRITICAL: The Nikud and grammar MUST be appropriate for a ${gender} singer.
    Ensure all words are correctly vocalized according to formal Hebrew rules.
    Keep the structure and sections (e.g., [בית 1]) exactly as they are.
    Output ONLY the vocalized lyrics.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: lyrics,
      config: {
        systemInstruction,
      },
    });

    return response.text || "Failed to vocalize lyrics.";
  } catch (error) {
    console.error("Gemini Error (Vocalize):", error);
    throw error;
  }
}

export async function generateComposition(lyrics: string, mood: string, manualIdea?: string) {
  const systemInstruction = `You are a professional composer.
  ${lyrics ? `Generate a musical composition for the provided lyrics.` : `Generate a musical composition based on the chosen mood: ${mood}.`}
  Include:
  1. Full chord progression (e.g., [Am] [F] [C] [G]) ${lyrics ? `placed above the lyrics or listed clearly` : `listed clearly for the song structure`}.
  2. Guitar tabs for the main riff or accompaniment.
  3. Basic melody notes (ABC notation or simple letter notes).
  4. Tips for the vocal performance.
  ${manualIdea ? `5. IMPORTANT: Incorporate and complete these specific chord/note ideas provided by the user: ${manualIdea}` : ""}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Lyrics: ${lyrics || "No lyrics provided"}\nMood: ${mood}${manualIdea ? `\nUser's Musical Ideas: ${manualIdea}` : ""}`,
    config: {
      systemInstruction,
    },
  });

  return response.text;
}
