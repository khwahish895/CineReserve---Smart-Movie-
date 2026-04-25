import { GoogleGenAI } from "@google/genai";
import { Movie } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getMovieRecommendations(userPreferences: string, availableMovies: Movie[]) {
  try {
    const movieTitles = availableMovies.map(m => m.title).join(", ");
    const prompt = `Based on these movies currently showing: ${movieTitles}. 
    The user is interested in: "${userPreferences}". 
    Recommend one of the available movies and explain why in a short, cinematic 2-sentence blurb. 
    Return the response as JSON with keys: "recommendedMovieTitle" and "reason".`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return null;
  }
}
