import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const FOOD_SCAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Common name of the food" },
    calories: { type: Type.NUMBER },
    protein: { type: Type.NUMBER, description: "in grams" },
    carbs: { type: Type.NUMBER, description: "in grams" },
    fat: { type: Type.NUMBER, description: "in grams" },
    fiber: { type: Type.NUMBER, description: "in grams" },
    sugar: { type: Type.NUMBER, description: "in grams" },
    healthScore: { type: Type.NUMBER, description: "1-100 score" },
    category: { 
      type: Type.STRING, 
      enum: ["fruit", "vegetable", "meat", "fastfood", "dessert", "beverage", "main_dish", "snack"],
      description: "Broad category of the food" 
    },
    confidence: { type: Type.NUMBER, description: "AI confidence score 0-1" },
    suitability: {
      type: Type.OBJECT,
      properties: {
        weightLoss: { type: Type.STRING },
        muscleGain: { type: Type.STRING }
      }
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["name", "calories", "protein", "carbs", "fat", "healthScore", "category"]
};

export const DIET_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    dailyCalories: { type: Type.NUMBER },
    dailyProtein: { type: Type.NUMBER },
    meals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["breakfast", "lunch", "dinner", "snack"] },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          nutrition: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  }
};

export async function scanFood(base64Image: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: "Analyze this food item and provide its nutritional details. Include a health score and categorize it strictly into one of the provided food categories for our holographic visualizer." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: FOOD_SCAN_SCHEMA
    }
  });

  return JSON.parse(response.text);
}

export async function getSuggestionsAI(query: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `List 5 food name suggestions starting with or related to: "${query}". Return only a simple JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return [];
  }
}

export async function searchFoodAI(query: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this food query: "${query}". 
      Estimate reasonable values for a standard single serving size.
      Include a health score and categorize it strictly for our holographic visualizer system.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: FOOD_SCAN_SCHEMA
    }
  });

  return JSON.parse(response.text);
}

export async function generateDietPlan(userData: any) {
  console.log("Gemini: Generating diet plan for user metrics...", userData);
  
  const prompt = `You are the Aura AI Diet Architect. 
    Analyze this biological profile and synthesize a 24-hour precision nutritional roadmap:
    - GOAL: ${userData.goal}
    - CURRENT METRICS: ${userData.weight}kg, ${userData.height}cm, ${userData.age} years old
    - DYNAMIC STATE: ${userData.activityLevel} activity level
    - PREFERENCE: ${userData.dietType || 'No specific restrictions'}

    REQUIREMENTS:
    1. Calculate total daily calorie ceiling (TDEE aligned with goal).
    2. Define protein-to-weight ratio (optimized for muscle synthesis or preservation).
    3. Construct 5 nutrient-dense interaction points (Meals): Breakfast, Lunch, Snack, Dinner, and a Late Recovery Snack.
    4. Each meal MUST have a clinical-grade description and precise macro estimates.
    5. Ensure the plan is scientifically plausible for a ${userData.goal.replace('_', ' ')} strategy.

    Response must be purely valid JSON matching the defined schema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: DIET_PLAN_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    if (!response.text) {
      console.error("Gemini: Empty response text received.");
      throw new Error("Neural Network returned void response.");
    }

    const data = JSON.parse(response.text.trim());
    console.log("Gemini: Diet plan synthesis successful.");
    return data;
  } catch (error) {
    console.error("Gemini: Diet plan generation failed:", error);
    throw error;
  }
}

export async function getCoachResponse(message: string, context: any) {
  const styles = {
    motivational: "energetic, powerhouse coaching tone, using bold language and high energy",
    technical: "meticulous, science-heavy, clinical approach with focus on bio-metrics and raw data",
    friendly: "warm, approachable, casual, and supportive like a workout buddy"
  };

  const styleHint = styles[context.aiStyle as keyof typeof styles] || styles.technical;
  const langHint = context.language || "English";

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `You are Aura, an elite AI Fitness & Nutrition coach. 
        Your current operational personality is: ${styleHint}.
        You must respond exclusively in ${langHint}.
        Be actionable, data-driven, and supportive.
        Current biological context: ${JSON.stringify(context)}`
    }
  });

  const response = await chat.sendMessage({ message: message });
  return response.text ?? "";
}
