
import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { saveUserProfile } from './storageService';

// Subscribe to Auth Changes (Persistence)
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Sign Up
export const registerUser = async (email: string, pass: string, name: string, avatarId: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    // Update the Display Name in Firebase Auth
    await updateProfile(user, { displayName: name });

    // Save the Profile to Firestore (for Manager View)
    await saveUserProfile({
      uid: user.uid,
      email: user.email || email,
      displayName: name,
      avatarId: avatarId, // Save the avatar choice
      createdAt: Date.now(),
      lastLogin: Date.now()
    });

    return user;
  } catch (error: any) {
    console.error("Registration Error:", error);
    throw new Error(getFriendlyErrorMessage(error.code));
  }
};

// Login
export const loginUser = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    console.error("Login Error:", error);
    throw new Error(getFriendlyErrorMessage(error.code));
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

// Forgot Password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    throw new Error(getFriendlyErrorMessage(error.code));
  }
};

// Helper to make Firebase errors readable
const getFriendlyErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email': return 'Invalid email address.';
    case 'auth/user-disabled': return 'User account disabled.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/email-already-in-use': return 'Email already registered.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/invalid-credential': return 'Invalid credentials.';
    default: return 'An unexpected error occurred. Try again.';
  }
};
