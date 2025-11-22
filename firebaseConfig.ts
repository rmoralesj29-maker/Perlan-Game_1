
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
import { getAuth } from "firebase/auth";

// Configuration from your Firebase Console screenshot
const firebaseConfig = {
  apiKey: "AIzaSyCbBv5E6sO7sa-RHM8iuwQFX0cpbGeIgOM",
  authDomain: "gen-lang-client-0500014463.firebaseapp.com",
  projectId: "gen-lang-client-0500014463",
  storageBucket: "gen-lang-client-0500014463.firebasestorage.app",
  messagingSenderId: "201895922446",
  appId: "1:201895922446:web:7ba73c91588366e15e655f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database connection so other files can use it
export const db = getFirestore(app);

// Export Authentication
export const auth = getAuth(app);

export default firebaseConfig;