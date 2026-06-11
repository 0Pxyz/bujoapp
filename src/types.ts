export type BulletType = 'task' | 'event' | 'note';
export type TaskState = 'open' | 'completed' | 'migrated' | 'scheduled' | 'canceled';
export type LogType = 'daily' | 'monthly' | 'future' | 'collection';

export interface BuJoEntry {
  id: string;
  type: BulletType;
  state: TaskState;
  signifiers: {
    priority: boolean;
    idea: boolean;
    explore: boolean;
  };
  text: string;
  createdAt: string;
  updatedAt?: string;
  date: string;
  logType: LogType;
  collectionId: string | null;
  order: number;
}

export interface Collection {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
}

export type HabitFrequencyType = 'daily' | 'specific_days' | 'interval';

export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  frequencyType?: HabitFrequencyType;
  specificDays?: number[];
  timesPerWeek?: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'serif' | 'sans';
export type StartOfWeek = 'sunday' | 'monday';
export type AIAssistance = 'off' | 'suggestions' | 'active';
export type AiProvider = 'gemini' | 'openrouter';
export type LayoutDensity = 'comfortable' | 'compact';

export interface AppSettings {
  theme: Theme;
  accentColor?: string;
  fontSize?: FontSize;
  fontFamily?: FontFamily;
  layoutDensity?: LayoutDensity;
  symbols?: {
    task: string;
    note: string;
    event: string;
  };
  smartParsing?: {
    dates: boolean;
    tags: boolean;
    links: boolean;
  };
  startOfWeek?: StartOfWeek;
  ai?: {
    assistance: AIAssistance;
    dailyReview: boolean;
    weeklyReview: boolean;
    monthlyReview: boolean;
    provider?: AiProvider;
    geminiModel?: string;
    openrouterModel?: string;
    openrouterApiKey?: string;
  };
  syncEnabled?: boolean;
  shortcuts?: {
    globalSearch: string;
    focusNewEntry: string;
  };
  notifications?: {
    dailyReminder: boolean;
    habitReminder: boolean;
    weeklyDigest: boolean;
  };
}

export interface AppState {
  entries: BuJoEntry[];
  collections: Collection[];
  habits: Habit[];
  habitLogs: HabitLog[];
  settings: AppSettings;
}
