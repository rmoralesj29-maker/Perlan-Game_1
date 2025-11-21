import { GameResult, PlayerStats, Question, Category, Difficulty } from '../types';

const STORAGE_KEYS = {
  RESULTS: 'perlan_results',
  STATS: 'perlan_stats',
  QUESTIONS: 'perlan_questions_v2' // Bumped version to force new seed data
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

// --- Question Management ---

// Expanded Seed Data covering various categories and difficulties
const SEED_QUESTIONS: Question[] = [
  // NORTHERN LIGHTS
  { id: 'nl-1', category: Category.NorthernLights, difficulty: Difficulty.Easy, text: "What is the scientific name for the Northern Lights?", options: ["Aurora Borealis", "Aurora Australis", "Solaris Ignis"], correctIndex: 0, fact: "Aurora Australis is the name for the Southern Lights!" },
  { id: 'nl-2', category: Category.NorthernLights, difficulty: Difficulty.Medium, text: "Which gas causes the green color in the Aurora?", options: ["Nitrogen", "Oxygen", "Helium"], correctIndex: 1, fact: "Green auroras are produced by oxygen molecules ~100km up." },
  { id: 'nl-3', category: Category.NorthernLights, difficulty: Difficulty.Hard, text: "What solar cycle peak maximizes auroras?", options: ["Solar Minimum", "Solar Maximum", "Solar Equinox"], correctIndex: 1, fact: "Solar Maximum occurs roughly every 11 years." },
  { id: 'nl-4', category: Category.NorthernLights, difficulty: Difficulty.Medium, text: "What color is associated with high-altitude nitrogen?", options: ["Blue/Purple", "Green", "Red"], correctIndex: 0, fact: "Nitrogen produces blue or purplish-red auroras." },
  { id: 'nl-5', category: Category.NorthernLights, difficulty: Difficulty.Easy, text: "Can you hear the Northern Lights?", options: ["Yes, frequently", "No, it's a myth", "Rarely, a crackling sound"], correctIndex: 2, fact: "Rare crackling sounds have been recorded during intense storms." },

  // VOLCANOES
  { id: 'geo-1', category: Category.Volcanoes, difficulty: Difficulty.Medium, text: "Average eruption frequency in Iceland?", options: ["Every 10 years", "Every 4-5 years", "Every 50 years"], correctIndex: 1, fact: "Iceland is one of the most volcanically active places on Earth." },
  { id: 'geo-2', category: Category.Volcanoes, difficulty: Difficulty.Easy, text: "What is magma called after it erupts?", options: ["Lava", "Ash", "Obsidian"], correctIndex: 0, fact: "Magma is underground; lava is above ground." },
  { id: 'geo-3', category: Category.Volcanoes, difficulty: Difficulty.Hard, text: "Which volcano stopped air traffic in 2010?", options: ["Hekla", "Eyjafjallajökull", "Katla"], correctIndex: 1, fact: "The ash cloud disrupted flights across Europe for weeks." },
  { id: 'geo-4', category: Category.Volcanoes, difficulty: Difficulty.Medium, text: "What type of volcano is Skjaldbreiður?", options: ["Stratovolcano", "Shield Volcano", "Cinder Cone"], correctIndex: 1, fact: "Its name translates to 'Broad Shield'." },
  { id: 'geo-5', category: Category.Volcanoes, difficulty: Difficulty.Easy, text: "Is Iceland on a tectonic plate boundary?", options: ["No", "Yes, two plates", "Yes, three plates"], correctIndex: 1, fact: "It sits on the Mid-Atlantic Ridge between North American and Eurasian plates." },

  // GLACIERS
  { id: 'gla-1', category: Category.Glaciers, difficulty: Difficulty.Medium, text: "Largest glacier in Europe by volume?", options: ["Vatnajökull", "Langjökull", "Hofsjökull"], correctIndex: 0, fact: "Vatnajökull covers 8% of Iceland." },
  { id: 'gla-2', category: Category.Glaciers, difficulty: Difficulty.Easy, text: "What is a glacier made of?", options: ["Frozen seawater", "Compacted snow", "Dry ice"], correctIndex: 1, fact: "Glaciers form from snow compressing into ice over centuries." },
  { id: 'gla-3', category: Category.Glaciers, difficulty: Difficulty.Hard, text: "What creates the blue color in ice caves?", options: ["Copper", "Lack of air bubbles", "Reflection of sky"], correctIndex: 1, fact: "Dense ice absorbs red light, leaving blue." },
  { id: 'gla-4', category: Category.Glaciers, difficulty: Difficulty.Medium, text: "How much of Iceland is covered by glaciers?", options: ["~5%", "~11%", "~25%"], correctIndex: 1, fact: "This percentage is slowly decreasing due to climate change." },
  { id: 'gla-5', category: Category.Glaciers, difficulty: Difficulty.Hard, text: "What is a Jökulhlaup?", options: ["Glacial River", "Glacial Flood", "Iceberg"], correctIndex: 1, fact: "It's a sudden flood often caused by geothermal heating under the ice." },

  // WILDLIFE
  { id: 'wild-1', category: Category.Wildlife, difficulty: Difficulty.Easy, text: "The 'Clown of the Sea'?", options: ["Arctic Tern", "Puffin", "Guillemot"], correctIndex: 1, fact: "Puffins have colorful beaks only in summer." },
  { id: 'wild-2', category: Category.Wildlife, difficulty: Difficulty.Medium, text: "Only land mammal native to Iceland?", options: ["Arctic Fox", "Reindeer", "Mink"], correctIndex: 0, fact: "Arctic Foxes crossed the sea ice during the Ice Age." },
  { id: 'wild-3', category: Category.Wildlife, difficulty: Difficulty.Hard, text: "How deep can a Puffin dive?", options: ["10 meters", "60 meters", "100 meters"], correctIndex: 1, fact: "They use their wings to swim underwater." },
  { id: 'wild-4', category: Category.Wildlife, difficulty: Difficulty.Easy, text: "Are there polar bears in Iceland?", options: ["Yes, resident population", "No, only rare visitors", "Yes, in zoos"], correctIndex: 1, fact: "They sometimes drift on ice from Greenland." },
  { id: 'wild-5', category: Category.Wildlife, difficulty: Difficulty.Medium, text: "Which whale is the largest?", options: ["Humpback", "Blue Whale", "Fin Whale"], correctIndex: 1, fact: "The Blue Whale is the largest animal ever known to have lived." },

  // PERLAN
  { id: 'p-1', category: Category.Perlan, difficulty: Difficulty.Easy, text: "What does Perlan store?", options: ["Ice", "Hot Water", "Grain"], correctIndex: 1, fact: "It supplies hot water to Reykjavik." },
  { id: 'p-2', category: Category.Perlan, difficulty: Difficulty.Medium, text: "How many tanks does Perlan have?", options: ["4", "6", "8"], correctIndex: 1, fact: "Each tank can hold 4 million liters." },
  { id: 'p-3', category: Category.Perlan, difficulty: Difficulty.Hard, text: "Which tank was drained to house the Ice Cave?", options: ["Tank 1", "Tank 6", "No tank was drained"], correctIndex: 0, fact: "The Ice Cave is built inside one of the hot water tanks." },
  { id: 'p-4', category: Category.Perlan, difficulty: Difficulty.Easy, text: "What is on the top floor?", options: ["Swimming Pool", "Observation Deck", "Cinema"], correctIndex: 1, fact: "It offers 360-degree views of Reykjavik." },
  { id: 'p-5', category: Category.Perlan, difficulty: Difficulty.Medium, text: "When did Perlan open to the public?", options: ["1985", "1991", "2000"], correctIndex: 1, fact: "It was designed by Ingimundur Sveinsson." },

  // HISTORY
  { id: 'hist-1', category: Category.History, difficulty: Difficulty.Hard, text: "Settlement year per Landnámabók?", options: ["874 AD", "930 AD", "1000 AD"], correctIndex: 0, fact: "Ingólfur Arnarson settled in Reykjavik." },
  { id: 'hist-2', category: Category.History, difficulty: Difficulty.Medium, text: "World's oldest parliament?", options: ["Althingi", "Storting", "Folketing"], correctIndex: 0, fact: "Founded in 930 AD at Thingvellir." },
  { id: 'hist-3', category: Category.History, difficulty: Difficulty.Easy, text: "What do Icelanders use for surnames?", options: ["Family names", "Patronymics", "Clan names"], correctIndex: 1, fact: "Usually father's name + son/dóttir." },

  // WATER
  { id: 'wat-1', category: Category.Water, difficulty: Difficulty.Easy, text: "Is tap water safe?", options: ["No", "Yes, very pure", "Only in winter"], correctIndex: 1, fact: "It comes from natural springs." },
  { id: 'wat-2', category: Category.Water, difficulty: Difficulty.Medium, text: "Temperature of Blue Lagoon?", options: ["20°C", "37-39°C", "50°C"], correctIndex: 1, fact: "It is rich in silica and sulfur." },

  // CHRISTMAS
  { id: 'xmas-1', category: Category.Christmas, difficulty: Difficulty.Medium, text: "How many Yule Lads?", options: ["7", "12", "13"], correctIndex: 2, fact: "They come one by one before Christmas." },
  { id: 'xmas-2', category: Category.Christmas, difficulty: Difficulty.Easy, text: "Who is the mother of the Yule Lads?", options: ["Grýla", "Hel", "Freyja"], correctIndex: 0, fact: "She is a troll who eats naughty children." },
  { id: 'xmas-3', category: Category.Christmas, difficulty: Difficulty.Medium, text: "What is 'Jólakötturinn'?", options: ["Christmas Cat", "Christmas Cake", "Christmas Tree"], correctIndex: 0, fact: "A giant cat that eats people who don't get new clothes." }
];

export const getQuestions = (): Question[] => {
  const str = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
  if (str) return JSON.parse(str);
  
  // Initial Load
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
    window.location.reload();
}