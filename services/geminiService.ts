import { GoogleGenAI, Type } from "@google/genai";
import { TriviaQuestion, Language } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTriviaQuestion = async (
  topic: string,
  language: Language
): Promise<TriviaQuestion | null> => {
  const client = createClient();
  if (!client) return null;

  const prompt = `Generate a single trivia question about "${topic}". 
  The question should be in the language: ${language}.
  Provide 4 options and the index of the correct answer (0-3).`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            correctIndex: { type: Type.INTEGER },
          },
          required: ["question", "options", "correctIndex"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as TriviaQuestion;
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching trivia:", error);
    // Fallback question in case of API failure
    return {
      question: "Which animal is the largest rodent in the world? (API Error Fallback)",
      options: ["Rat", "Beaver", "Capybara", "Guinea Pig"],
      correctIndex: 2
    };
  }
};