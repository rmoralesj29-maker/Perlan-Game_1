
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Difficulty, Question } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const generateQuestionsWithAI = async (
  category: Category,
  difficulty: Difficulty,
  count: number = 5
): Promise<Question[]> => {
  
  // Use import.meta.env for Vite
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_API_KEY is not defined");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Generate ${count} ultra-short, fast-paced trivia questions about "${category}" specifically for Perlan Museum in Iceland. 
  Difficulty: ${difficulty}.

  CRITICAL FORMATTING RULES FOR 15-SECOND SPEED GAMEPLAY:
  1. QUESTION: MAX 12 WORDS. Simple, direct, and instant to read. Avoid "Which of the following..." phrasing.
  2. OPTIONS: MAX 1-4 WORDS per option. No sentences. Just the answer.
  3. FACT: MAX 20 WORDS. Fun, punchy, and surprising. "Snackable" education.
  4. STYLE: "Pub Quiz" style. Fun, casual, and fast. Not academic.

  GOOD EXAMPLE:
  Q: What color is the Aurora usually?
  Opt: [Green, Red, Blue]
  Fact: Green is caused by oxygen atoms colliding about 100km up!

  BAD EXAMPLE (DO NOT DO):
  Q: Which of the following colors is most frequently observed when looking at the Northern Lights phenomenon?
  Opt: [The color is Green, The color is Red, The color is Blue]
  Fact: The phenomenon is caused by particles hitting the atmosphere and creating a specific wavelength of light.`;

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
              text: { type: Type.STRING, description: "Short question text (max 12 words)" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Exactly 3 short options (max 4 words each)" 
              },
              correctIndex: { type: Type.INTEGER, description: "Index (0-2) of the correct option" },
              fact: { type: Type.STRING, description: "A short fun fact (max 20 words)" }
            },
            required: ["text", "options", "correctIndex", "fact"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");

    interface RawQuestion {
        text: string;
        options: string[];
        correctIndex: number;
        fact: string;
    }

    // Map to our Question interface
    return rawData.map((q: RawQuestion) => ({
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
