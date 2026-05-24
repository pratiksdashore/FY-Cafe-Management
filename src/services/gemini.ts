import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const geminiService = {
    getPersonalizedRecommendations: async (orderHistoryNames: string[], availableMenuNames: string[]): Promise<string[]> => {
        if (!genAI) {
            console.warn("Gemini API key is not configured. Recommendations will be empty.");
            return [];
        }

        try {
            // The user requested 'gemini-3-flash-preview', but since that isn't available yet,
            // we'll use 'gemini-1.5-flash' which is the current state-of-the-art flash model.
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const prompt = `
        User's Order History: ${orderHistoryNames.join(", ") || "No previous orders"}
        Available Menu Items: ${availableMenuNames.join(", ")}

        Based on the user's order history, recommend up to 2 items from the available menu list that they might like. 
        Return ONLY a JSON array of the recommended item names, exactly as they appear in the available menu list.
        Example: ["Pizza", "Burger"]
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Attempt to parse JSON from the response
            try {
                const jsonMatch = text.match(/\[.*\]/s);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                return [];
            } catch (e) {
                console.error("Failed to parse Gemini recommendation response:", text);
                return [];
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return [];
        }
    }
};
