import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { EVENTS } from "../constants";

// Prepare context for the AI so it knows about available events
const EVENTS_CONTEXT = JSON.stringify(EVENTS.map(e => ({
  id: e.id,
  title: e.title,
  category: e.category,
  price: e.price,
  date: e.date,
  location: e.location,
  tags: e.tags.join(', ')
})));

const SYSTEM_INSTRUCTION = `
You are "TicketBot", a helpful AI assistant for a ticket booking application called "票务通".
Your goal is to help users find events they might like based on the available data.
You are friendly, concise, and enthusiastic.

Here is the current list of available events (JSON format):
${EVENTS_CONTEXT}

Rules:
1. Only recommend events from this list.
2. If a user asks about a type of event (e.g., "movies", "concerts"), list the matching options.
3. If a user asks for recommendations (e.g., "something romantic", "for kids"), infer the best match from the description and tags.
4. Keep answers relatively short (under 100 words) unless asked for details.
5. Provide the exact Event Title so the user can search for it.
6. Answer in the same language as the user (default to Chinese).
`;

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API_KEY is not defined in process.env");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  const client = getAiClient();
  if (!client) {
    return "API Key configuration is missing. Please check the environment setup.";
  }

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Sorry, I couldn't understand that.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "抱歉，我现在无法连接到智能助手服务，请稍后再试。";
  }
};