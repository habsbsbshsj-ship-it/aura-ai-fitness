export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAnonymous?: boolean;
  age?: number;
  height?: number;
  weight?: number;
  goal?: 'fat_loss' | 'muscle_gain' | 'maintenance';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietType?: 'anything' | 'vegetarian' | 'vegan' | 'keto' | 'paleo';
  targetCalories?: number;
  targetProtein?: number;
  targetWater?: number;
}

export interface UserSettings {
  notifications: {
    waterReminder: boolean;
    mealReminder: boolean;
    workoutReminder: boolean;
    aiCoachTips: boolean;
    reminderTime: string;
  };
  privacy: {
    marketingEmails: boolean;
    analytics: boolean;
  };
  app: {
    units: 'metric' | 'imperial';
    theme: 'dark' | 'system';
    language: string;
    aiStyle: 'motivational' | 'technical' | 'friendly';
  };
}

export interface MealLog {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  healthScore?: number;
  category?: string;
  imageUrl?: string;
  /** 
   * The exact time the meal was logged. 
   * Stores a Firestore Timestamp on the backend, which is converted to Date on the client.
   * Used for time-based nutritional analysis and chronological display.
   */
  timestamp: any; 
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface WaterLog {
  id: string;
  amount: number;
  timestamp: any;
  date: string;
}

export interface DietPlan {
  dailyCalories: number;
  dailyProtein: number;
  meals: {
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    description: string;
    nutrition: {
      calories: number;
      protein: number;
    };
  }[];
}
