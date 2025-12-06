export interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage: boolean;
  audioBase64?: string;
  isGeneratingAudio?: boolean;
}

export interface Story {
  title: string;
  topic: string;
  character?: string;
  pages: StoryPage[];
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING_SCRIPT = 'GENERATING_SCRIPT',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  READING = 'READING',
  ERROR = 'ERROR'
}

export interface EditImageParams {
  pageIndex: number;
  currentImageBase64: string;
  prompt: string;
}

export type Language = 'en' | 'tr' | 'de' | 'it';

export type UserTier = 'FREE' | 'PREMIUM';

export interface User {
  id: string;
  username: string;
  email?: string;
  provider?: 'google' | 'apple' | 'microsoft' | 'guest';
  tier: UserTier;
  dailyGenerationsLeft: number;
  lastGenerationDate: string; // ISO Date string
}