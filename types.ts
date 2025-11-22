
export enum Category {
  General = 'General',
  NorthernLights = 'Northern Lights',
  Volcanoes = 'Volcanoes & Geology',
  Glaciers = 'Glaciers & Ice Caves',
  Wildlife = 'Wildlife & Birds',
  History = 'Icelandic History',
  Water = 'Water & Nature',
  Perlan = 'Perlan',
  Christmas = 'Christmas'
}

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard'
}

export interface Question {
  id: string;
  category: Category;
  difficulty: Difficulty;
  text: string;
  options: string[]; // Array of 3 strings
  correctIndex: number;
  fact: string; // "Did you know?"
}

export interface GameConfig {
  username: string;
  category: Category;
  difficulty: Difficulty;
  isChallengeMode: boolean;
}

export interface PlayerAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  timeTaken: number;
}

export interface GameResult {
  id: string;
  timestamp: number;
  username: string;
  config: GameConfig;
  score: number;
  totalQuestions: number;
  answers: PlayerAnswer[];
  streakMax: number;
}

export interface PlayerStats {
  username: string;
  totalGames: number;
  totalScore: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  bestCategory: Category | null;
  streakRecord: number;
  lastPlayed: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarId: string; // NEW: Stores the selected avatar ID
  createdAt: number;
  lastLogin: number;
}

// --- AVATARS CONFIG ---
export const AVATARS = [
  { id: 'puffin', icon: '🐧', label: 'Puffin', color: 'bg-slate-900' },
  { id: 'bear', icon: '🐻‍❄️', label: 'Polar Bear', color: 'bg-blue-100' },
  { id: 'whale', icon: '🐋', label: 'Whale', color: 'bg-blue-600' },
  { id: 'fox', icon: '🦊', label: 'Arctic Fox', color: 'bg-orange-100' },
  { id: 'cat', icon: '🐱', label: 'Cat', color: 'bg-yellow-100' }
];

// --- Learning Module Types ---

export interface Flashcard {
  front: string;
  back: string;
}

export interface LearningQuiz {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface LearningUnit {
  id: string;
  title: string;
  duration: string; // e.g., "2 min"
  type: 'text' | 'flashcards' | 'quiz';
  content?: string; // For text type
  flashcards?: Flashcard[]; // For flashcards type
  quiz?: LearningQuiz; // For quiz type
}

export interface LearningModule {
  id: string;
  category: Category;
  description: string;
  units: LearningUnit[];
}

export interface UserProgress {
  username: string;
  completedUnitIds: string[]; // List of IDs of units the user has finished
}
