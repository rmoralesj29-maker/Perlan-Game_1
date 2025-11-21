import { GoogleGenAI, Type } from "@google/genai";
import { Category, Difficulty, Question } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const generateQuestionsWithAI = async (
  category: Category,
  difficulty: Difficulty,
  count: number = 5
): Promise<Question[]> => {
  
  // API Key must be obtained exclusively from process.env.API_KEY
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("process.env.API_KEY is not defined");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Generate ${count} trivia questions about "${category}" specifically for Perlan Museum in Iceland. 
  Difficulty: ${difficulty}.
  The tone should be scientific yet accessible.
  Include a "Did you know?" fact for each.
  Ensure options are plausible but only one is correct.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Exactly 3 options" 
              },
              correctIndex: { type: Type.INTEGER, description: "Index (0-2) of the correct option" },
              fact: { type: Type.STRING, description: "A short interesting fact related to the answer" }
            },
            required: ["text", "options", "correctIndex", "fact"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");

    // Map to our Question interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawData.map((q: any) => ({
      id: uuidv4(),
      category,
      difficulty,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      fact: q.fact
    }));

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate questions.");
  }
};