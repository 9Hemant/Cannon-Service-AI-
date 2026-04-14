import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const SYSTEM_INSTRUCTION = `
You are "Canon Delay AI Pro", an expert Canon Service Engineer assistant.
Goal: Solve machine issues (error codes, jams, quality) fast.

CAPABILITIES:
1. Troubleshooting: Root cause, fix steps, safety, tools, time estimate, and prevention.
2. Search: Provide links to Canon manuals/drivers and suggest repair videos.
3. Multi-language: English, Hindi, Marathi.
4. Reports/Parts: Help with service reports and part identification.

FORMAT:
- Problem & Cause
- Diagnosis & Fix Steps
- Safety & Tools
- Prevention
Keep it technical, concise, and practical.
`;

const DEFAULT_MODEL = "gemini-3-flash-preview";
const LITE_MODEL = "gemini-3.1-flash-lite-preview";

export async function chatWithAI(message: string, history: any[] = []) {
  // Keep only last 10 messages to save tokens
  const truncatedHistory = history.slice(-10);
  
  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        ...truncatedHistory,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    return response;
  } catch (error: any) {
    console.error("[Gemini API Error]", error);
    
    // Fallback to Lite model if quota exceeded
    if (error.message?.includes("quota") || error.status === 429) {
      try {
        console.log("Attempting fallback to Lite model...");
        return await ai.models.generateContent({
          model: LITE_MODEL,
          contents: [
            ...truncatedHistory,
            { role: "user", parts: [{ text: message }] }
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
      } catch (liteError) {
        throw new Error("API Quota exceeded on all models. Please check your Google AI Studio billing or wait for reset.");
      }
    }
    
    if (error.status === 401 || error.status === 403) {
      throw new Error("Authentication error. Please verify your GEMINI_API_KEY in environment settings.");
    }

    throw new Error("The AI assistant is temporarily unavailable. Please try again later.");
  }
}

export async function predictMaintenance(machineData: any) {
  try {
    const prompt = `
      Analyze machine data and predict maintenance needs.
      Data: ${JSON.stringify(machineData)}
      Return JSON with 'alerts' array: { issue, components[], steps[], urgency(Low|Medium|High), timeToFailure }.
    `;

    const response = await ai.models.generateContent({
      model: LITE_MODEL, // Use Lite model for background analysis to save tokens
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  components: { type: Type.ARRAY, items: { type: Type.STRING } },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  urgency: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                  timeToFailure: { type: Type.STRING }
                },
                required: ["issue", "components", "steps", "urgency", "timeToFailure"]
              }
            }
          },
          required: ["alerts"]
        }
      }
    });

    return JSON.parse(response.text || '{"alerts": []}');
  } catch (error) {
    console.error("[Maintenance Prediction Error]", error);
    return { alerts: [] };
  }
}

export async function extractMeterReading(base64Image: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Extract the meter reading (total count) from this Canon printer screen. Return only the number." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }
    ],
  });

  return response.text;
}
