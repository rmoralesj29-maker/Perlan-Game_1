
import { GameResult, PlayerStats, Question, Category, Difficulty, LearningModule, UserProgress } from '../types';

const STORAGE_KEYS = {
  RESULTS: 'perlan_results',
  STATS: 'perlan_stats',
  QUESTIONS: 'perlan_questions_v2',
  LEARNING_PROGRESS: 'perlan_learning_progress',
  LEARNING_MODULES: 'perlan_learning_modules_v1'
};

// --- Stats Management ---

export const saveGameResult = (result: GameResult): void => {
  // 1. Save raw result
  const existingResultsStr = localStorage.getItem(STORAGE_KEYS.RESULTS);
  const results: GameResult[] = existingResultsStr ? JSON.parse(existingResultsStr) : [];
  results.push(result);
  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));

  // 2. Update Aggregated Stats
  const existingStatsStr = localStorage.getItem(STORAGE_KEYS.STATS);
  const statsMap: Record<string, PlayerStats> = existingStatsStr ? JSON.parse(existingStatsStr) : {};
  
  const playerStat = statsMap[result.username] || {
    username: result.username,
    totalGames: 0,
    totalScore: 0,
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    bestCategory: null,
    streakRecord: 0,
    lastPlayed: 0
  };

  playerStat.totalGames += 1;
  playerStat.totalScore += result.score;
  playerStat.totalQuestionsAnswered += result.totalQuestions;
  playerStat.totalCorrect += result.score; // score is count of correct
  playerStat.lastPlayed = Date.now();
  if (result.streakMax > playerStat.streakRecord) {
    playerStat.streakRecord = result.streakMax;
  }

  // Simple logic for best category
  if (!playerStat.bestCategory) playerStat.bestCategory = result.config.category;

  statsMap[result.username] = playerStat;
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(statsMap));
};

export const getAllStats = (): PlayerStats[] => {
  const str = localStorage.getItem(STORAGE_KEYS.STATS);
  if (!str) return [];
  return Object.values(JSON.parse(str));
};

export const getAllResults = (): GameResult[] => {
  const str = localStorage.getItem(STORAGE_KEYS.RESULTS);
  return str ? JSON.parse(str) : [];
};

// --- Learning Progress Management ---

export const getUserProgress = (username: string): UserProgress => {
  const str = localStorage.getItem(STORAGE_KEYS.LEARNING_PROGRESS);
  const map: Record<string, UserProgress> = str ? JSON.parse(str) : {};
  return map[username] || { username, completedUnitIds: [] };
};

export const saveUserProgress = (progress: UserProgress): void => {
  const str = localStorage.getItem(STORAGE_KEYS.LEARNING_PROGRESS);
  const map: Record<string, UserProgress> = str ? JSON.parse(str) : {};
  map[progress.username] = progress;
  localStorage.setItem(STORAGE_KEYS.LEARNING_PROGRESS, JSON.stringify(map));
};

// --- Learning Content (Dynamic) ---

const SEED_LEARNING_MODULES: LearningModule[] = [
  {
    id: 'mod-aurora',
    category: Category.NorthernLights,
    description: "Master the science and folklore of the Aurora.",
    units: [
      { 
        id: 'unit-aurora-1', 
        title: "Aurora Flashcards", 
        duration: "3 min", 
        type: 'flashcards',
        flashcards: [
          { front: "What creates the light?", back: "Charged particles from the sun colliding with atoms in Earth's atmosphere." },
          { front: "What altitude?", back: "Most commonly 100km - 300km above Earth." },
          { front: "Green Color", back: "Caused by Oxygen atoms at lower altitudes (approx 100km)." },
          { front: "Red Color", back: "Caused by Oxygen atoms at very high altitudes (200km+)." }
        ]
      },
      { 
        id: 'unit-aurora-2', 
        title: "Folklore & Myths", 
        duration: "2 min", 
        type: 'text',
        content: "In Icelandic folklore, the lights were believed to be the Valkyries riding across the sky, or spirits dancing. It was also believed they relieved the pain of childbirth, but pregnant women were warned not to look at them directly." 
      },
      {
        id: 'unit-aurora-3',
        title: "Quick Check",
        duration: "1 min",
        type: 'quiz',
        quiz: {
          question: "Which gas is primarily responsible for the green color in the aurora?",
          options: ["Nitrogen", "Oxygen", "Hydrogen", "Helium"],
          correctIndex: 1
        }
      }
    ]
  },
  {
    id: 'mod-volcano',
    category: Category.Volcanoes,
    description: "Understand the fire beneath the ice.",
    units: [
      { 
        id: 'unit-volc-flash', 
        title: "Volcano Basics", 
        duration: "2 min", 
        type: 'flashcards',
        flashcards: [
          { front: "Tectonic Location", back: "Mid-Atlantic Ridge (Divergent Plate Boundary)" },
          { front: "Magma vs Lava", back: "Magma is underground, Lava is above ground." },
          { front: "Stratovolcano", back: "Cone-shaped, explosive eruptions (e.g., Snæfellsjökull)." }
        ]
      },
      { id: 'unit-volc-1', title: "Tectonic Plates", duration: "1 min", type: 'text', content: "Iceland sits on the Mid-Atlantic Ridge, where the North American and Eurasian plates are pulling apart at about 2cm per year." },
      { id: 'unit-volc-2', title: "Eruption Types", duration: "2 min", type: 'text', content: "Effusive eruptions produce lava flows (like Fagradalsfjall). Explosive eruptions produce ash clouds (like Eyjafjallajökull)." }
    ]
  },
  {
    id: 'mod-glacier',
    category: Category.Glaciers,
    description: "The frozen giants of Iceland.",
    units: [
      { 
        id: 'unit-glac-flash', 
        title: "Ice Facts", 
        duration: "2 min", 
        type: 'flashcards',
        flashcards: [
          { front: "% of Iceland covered", back: "Approximately 11%." },
          { front: "Blue Ice", back: "Caused by compression squeezing out air bubbles, allowing only blue light to pass." },
          { front: "Calving", back: "Chunks of ice breaking off the glacier terminus." }
        ]
      },
      { id: 'unit-glac-1', title: "Formation", duration: "1 min", type: 'text', content: "Glaciers form when snow remains in one location long enough to transform into ice. Each year, new layers of snow compress the previous layers." },
      { id: 'unit-glac-2', title: "Vatnajökull", duration: "1 min", type: 'text', content: "Vatnajökull is the largest glacier in Europe by volume. It covers about 8% of Iceland's landmass." }
    ]
  },
  {
    id: 'mod-wildlife',
    category: Category.Wildlife,
    description: "Arctic animals and birds.",
    units: [
       { 
        id: 'unit-wild-flash', 
        title: "Animal ID", 
        duration: "2 min", 
        type: 'flashcards',
        flashcards: [
          { front: "Only Native Mammal", back: "Arctic Fox." },
          { front: "Puffin Beak", back: "Only colorful during breeding season, grey in winter." },
          { front: "Reindeer", back: "Imported from Norway in the 18th century, now wild in the East." }
        ]
      },
      { id: 'unit-wild-1', title: "The Arctic Fox", duration: "1 min", type: 'text', content: "The only land mammal native to Iceland. It arrived during the last Ice Age by walking over frozen sea ice." },
      { id: 'unit-wild-2', title: "Puffins", duration: "1 min", type: 'text', content: "Iceland is home to 60% of the world's Atlantic Puffin population. They spend winters at sea and return to land only to breed." }
    ]
  }
];

export const getLearningModules = (): LearningModule[] => {
  const str = localStorage.getItem(STORAGE_KEYS.LEARNING_MODULES);
  if (str) return JSON.parse(str);
  // Initial seed if empty
  localStorage.setItem(STORAGE_KEYS.LEARNING_MODULES, JSON.stringify(SEED_LEARNING_MODULES));
  return SEED_LEARNING_MODULES;
};

export const saveLearningModules = (modules: LearningModule[]): void => {
  localStorage.setItem(STORAGE_KEYS.LEARNING_MODULES, JSON.stringify(modules));
};

// --- Question Management ---

const SEED_QUESTIONS: Question[] = [
  { id: 'nl-1', category: Category.NorthernLights, difficulty: Difficulty.Easy, text: "What is the scientific name for the Northern Lights?", options: ["Aurora Borealis", "Aurora Australis", "Solaris Ignis"], correctIndex: 0, fact: "Aurora Australis is the name for the Southern Lights!" },
];

export const getQuestions = (): Question[] => {
  const str = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
  if (str) return JSON.parse(str);
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(SEED_QUESTIONS));
  return SEED_QUESTIONS;
};

export const saveQuestions = (questions: Question[]): void => {
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
};

export const addQuestion = (question: Question): void => {
  const questions = getQuestions();
  questions.push(question);
  saveQuestions(questions);
};

export const deleteQuestion = (id: string): void => {
  const questions = getQuestions();
  const filtered = questions.filter(q => q.id !== id);
  saveQuestions(filtered);
};

export const resetData = () => {
    localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    localStorage.removeItem(STORAGE_KEYS.LEARNING_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.LEARNING_MODULES);
    window.location.reload();
}
