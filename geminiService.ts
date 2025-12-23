
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Habit, HistoryPoint } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeMomentum = async (
  history: HistoryPoint[],
  currentHabits: Habit[]
): Promise<AnalysisResult> => {
  const yesterdayFinalScore = history.length > 0 ? history[history.length - 1].momentum : 0;
  
  // Calculate a simple historical average slope for the prompt
  const historicalAverageSlope = history.length > 1 
    ? (history[history.length - 1].momentum - history[0].momentum) / history.length
    : 0.15;

  const currentMatrix = currentHabits.map(h => ({
    name: h.name,
    weight: h.type === 'good' ? h.weight : -h.weight,
    status: (h.status === 'done' || h.status === 'failed') ? 'completed' : 'missed'
  }));

  const prompt = `
### INPUT CONTEXT
{
  "yesterday_final_score": ${yesterdayFinalScore},
  "historical_average_slope": ${historicalAverageSlope},
  "current_matrix": ${JSON.stringify(currentMatrix, null, 2)}
}

### TASK
1. Calculate the 'Net Momentum Score' for today (Sum of weights of completed good habits + weights of completed bad habits).
2. Generate the 'Better/Worse' verdict by comparing today's score to ${yesterdayFinalScore}. 
   - If Today > Yesterday: "YOU ARE A BETTER PERSON THAN YOU WERE YESTERDAY."
   - If Today < Yesterday: "YOU HAVE REGRESSED FROM THE PERSON YOU WERE YESTERDAY."
   - If Today == Yesterday: "YOU ARE STAGNANT; EQUILIBRIUM IS THE FIRST STAGE OF DECAY."
3. Determine the 'Risk Level' (Low/Moderate/High) based on the current gradient's deviation from the historical average of ${historicalAverageSlope}.
4. Write a 3-sentence behavioral summary in the style of a stoic philosopher focusing on the risk of these specific choices.

### OUTPUT JSON FORMAT
{
  "verdict_header": "string",
  "daily_momentum": number,
  "slope_gradient": "climbing|flat|declining",
  "risk_assessment": "low|moderate|high",
  "projection_30_days": "string describing units of deviation",
  "ai_summary": "string"
}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 2000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verdict_header: { type: Type.STRING },
          daily_momentum: { type: Type.NUMBER },
          slope_gradient: { type: Type.STRING, enum: ['climbing', 'flat', 'declining'] },
          risk_assessment: { type: Type.STRING, enum: ['low', 'moderate', 'high'] },
          projection_30_days: { type: Type.STRING },
          ai_summary: { type: Type.STRING }
        },
        required: ["verdict_header", "daily_momentum", "slope_gradient", "risk_assessment", "projection_30_days", "ai_summary"]
      }
    }
  });

  return JSON.parse(response.text);
};
