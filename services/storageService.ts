
import { GameResult, PlayerStats, Question, Category, Difficulty, LearningModule, UserProgress, UserProfile } from '../types';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore/lite';

const STORAGE_KEYS = {
  RESULTS: 'perlan_results',
  STATS: 'perlan_stats',
  QUESTIONS: 'perlan_questions_v2',
  LEARNING_PROGRESS: 'perlan_learning_progress',
  LEARNING_MODULES: 'perlan_learning_modules_v1'
};

// --- SEED DATA (Used only if Cloud is empty) ---

const SEED_QUESTIONS: Question[] = [
  { id: 'nl-1', category: Category.NorthernLights, difficulty: Difficulty.Easy, text: "What is the scientific name for the Northern Lights?", options: ["Aurora Borealis", "Aurora Australis", "Solaris Ignis"], correctIndex: 0, fact: "Aurora Australis is the name for the Southern Lights!" },
  { id: 'nl-2', category: Category.NorthernLights, difficulty: Difficulty.Medium, text: "Which color is most common in the Aurora Borealis?", options: ["Red", "Green", "Purple"], correctIndex: 1, fact: "Green is produced by oxygen molecules at lower altitudes (about 100 km)." },
  { id: 'vo-1', category: Category.Volcanoes, difficulty: Difficulty.Easy, text: "What type of plate boundary runs through Iceland?", options: ["Convergent", "Divergent", "Transform"], correctIndex: 1, fact: "Iceland is being pulled apart by the North American and Eurasian plates." },
  { id: 'gl-1', category: Category.Glaciers, difficulty: Difficulty.Easy, text: "What is the largest glacier in Iceland?", options: ["Langjökull", "Vatnajökull", "Hofsjökull"], correctIndex: 1, fact: "Vatnajökull covers about 8% of Iceland's landmass." },
  { id: 'wi-1', category: Category.Wildlife, difficulty: Difficulty.Easy, text: "Which bird is known as the 'Clown of the Sea'?", options: ["Arctic Tern", "Puffin", "Guillemot"], correctIndex: 1, fact: "Puffins shed their colorful beak sheath in winter." },
  { id: 'pe-1', category: Category.Perlan, difficulty: Difficulty.Easy, text: "What was Perlan originally built for?", options: ["Shopping Mall", "Hot Water Storage", "Concert Hall"], correctIndex: 1, fact: "The six tanks store geothermal hot water for Reykjavik." }
];

const SEED_LEARNING_MODULES: LearningModule[] = [
  {
    id: 'mod-aurora',
    category: Category.NorthernLights,
    description: "Master the science and folklore of the Aurora.",
    units: [
      { 
        id: 'unit-aurora-1', title: "Aurora Flashcards", duration: "3 min", type: 'flashcards',
        flashcards: [
          { front: "What creates the light?", back: "Charged particles from the sun colliding with atoms in Earth's atmosphere." },
          { front: "Green Color", back: "Caused by Oxygen atoms at lower altitudes (approx 100km)." }
        ]
      },
      { id: 'unit-aurora-2', title: "Folklore & Myths", duration: "2 min", type: 'text', content: "In Icelandic folklore, the lights were believed to be the Valkyries riding across the sky." }
    ]
  },
  {
    id: 'mod-volcano',
    category: Category.Volcanoes,
    description: "Understand the fire beneath the ice.",
    units: [
      { 
        id: 'unit-volc-flash', title: "Volcano Basics", duration: "2 min", type: 'flashcards',
        flashcards: [
          { front: "Tectonic Location", back: "Mid-Atlantic Ridge (Divergent Plate Boundary)" },
          { front: "Magma vs Lava", back: "Magma is underground, Lava is above ground." }
        ]
      }
    ]
  }
];

// --- CLOUD SYNC ENGINE ---

export const syncContentFromFirebase = async (): Promise<void> => {
  try {
    console.log("Starting Cloud Sync...");

    // 1. Sync Questions
    const questionsRef = collection(db, 'content_questions');
    const qSnapshot = await getDocs(questionsRef);
    
    let finalQuestions: Question[] = [];

    if (qSnapshot.empty) {
      console.log("Cloud empty. Seeding questions...");
      // Seed Cloud
      for (const q of SEED_QUESTIONS) {
        // We use setDoc with the ID so we can delete easily later
        await setDoc(doc(db, 'content_questions', q.id), q);
        finalQuestions.push(q);
      }
    } else {
      finalQuestions = qSnapshot.docs.map(d => d.data() as Question);
    }
    // Update Local Cache
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(finalQuestions));

    // 2. Sync Learning Modules
    const modulesRef = collection(db, 'content_modules');
    const mSnapshot = await getDocs(modulesRef);

    let finalModules: LearningModule[] = [];

    if (mSnapshot.empty) {
      console.log("Cloud empty. Seeding modules...");
      for (const m of SEED_LEARNING_MODULES) {
        await setDoc(doc(db, 'content_modules', m.id), m);
        finalModules.push(m);
      }
    } else {
      finalModules = mSnapshot.docs.map(d => d.data() as LearningModule);
    }
    localStorage.setItem(STORAGE_KEYS.LEARNING_MODULES, JSON.stringify(finalModules));

    console.log("Cloud Sync Complete.");

  } catch (error) {
    console.error("Sync failed:", error);
    // If sync fails (e.g., offline), we rely on localStorage which is already set or empty
  }
};

// --- User Profile Management (NEW) ---

export const saveUserProfile = async (user: UserProfile): Promise<void> => {
  try {
    // Save to Cloud
    await setDoc(doc(db, "users", user.uid), user, { merge: true });
    console.log("User Profile Saved");
  } catch (e) { console.error("Error saving user profile", e); }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (e) { 
    console.error("Error fetching users", e);
    return [];
  }
}

// --- Stats Management ---

export const saveGameResult = async (result: GameResult): Promise<void> => {
  // Local
  const existingResultsStr = localStorage.getItem(STORAGE_KEYS.RESULTS);
  const results: GameResult[] = existingResultsStr ? JSON.parse(existingResultsStr) : [];
  results.push(result);
  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));

  // Stats Calc
  const existingStatsStr = localStorage.getItem(STORAGE_KEYS.STATS);
  const statsMap: Record<string, PlayerStats> = existingStatsStr ? JSON.parse(existingStatsStr) : {};
  let playerStat = statsMap[result.username] || {
    username: result.username, totalGames: 0, totalScore: 0, totalQuestionsAnswered: 0, totalCorrect: 0, bestCategory: null, streakRecord: 0, lastPlayed: 0
  };
  playerStat.totalGames += 1;
  playerStat.totalScore += result.score;
  playerStat.totalQuestionsAnswered += result.totalQuestions;
  playerStat.totalCorrect += result.score;
  playerStat.lastPlayed = Date.now();
  if (result.streakMax > playerStat.streakRecord) playerStat.streakRecord = result.streakMax;
  if (!playerStat.bestCategory) playerStat.bestCategory = result.config.category;
  statsMap[result.username] = playerStat;
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(statsMap));

  // Cloud
  try {
    await addDoc(collection(db, "game_results"), result);
    // We save stats by username (legacy) AND we should probably link it to UID in future, 
    // but for now keeping it consistent with current logic
    await setDoc(doc(db, "player_stats", result.username), playerStat, { merge: true });
  } catch (e) { console.error("Error saving stats to cloud", e); }
};

export const getAllStats = (): PlayerStats[] => {
  const str = localStorage.getItem(STORAGE_KEYS.STATS);
  return str ? Object.values(JSON.parse(str)) : [];
};

export const getAllResults = (): GameResult[] => {
  const str = localStorage.getItem(STORAGE_KEYS.RESULTS);
  return str ? JSON.parse(str) : [];
};

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

// --- Question Management (Cloud Integrated) ---

export const getQuestions = (): Question[] => {
  const str = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
  return str ? JSON.parse(str) : SEED_QUESTIONS;
};

export const addQuestion = async (question: Question): Promise<void> => {
  // 1. Update Local Cache immediately (for speed)
  const questions = getQuestions();
  questions.push(question);
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));

  // 2. Update Cloud
  try {
    await setDoc(doc(db, 'content_questions', question.id), question);
  } catch (e) { console.error("Cloud add failed", e); }
};

export const deleteQuestion = async (id: string): Promise<void> => {
  const questions = getQuestions();
  const filtered = questions.filter(q => q.id !== id);
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(filtered));

  try {
    await deleteDoc(doc(db, 'content_questions', id));
  } catch (e) { console.error("Cloud delete failed", e); }
};

export const saveQuestions = (questions: Question[]) => {
    // Bulk overwrite usually not needed for basic flow, but logic kept for safety
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
}


// --- Learning Module Management (Cloud Integrated) ---

export const getLearningModules = (): LearningModule[] => {
  const str = localStorage.getItem(STORAGE_KEYS.LEARNING_MODULES);
  return str ? JSON.parse(str) : SEED_LEARNING_MODULES;
};

export const saveLearningModules = async (modules: LearningModule[]): Promise<void> => {
  // 1. Local Save
  localStorage.setItem(STORAGE_KEYS.LEARNING_MODULES, JSON.stringify(modules));

  // 2. Cloud Save
  // Since modules are complex nested objects, we save each module as a doc
  try {
    for (const mod of modules) {
      await setDoc(doc(db, 'content_modules', mod.id), mod);
    }
  } catch (e) { console.error("Cloud module save failed", e); }
};

export const deleteLearningModuleFromCloud = async (moduleId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'content_modules', moduleId));
    } catch (e) { console.error("Cloud module delete failed", e); }
};

export const resetData = () => {
    localStorage.clear();
    window.location.reload();
}