import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider Google
export const googleProvider = new GoogleAuthProvider();

/**
 * Service d'authentification
 */
export const authService = {
  /**
   * Connexion avec email/password
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        user: userCredential.user,
        token: await userCredential.user.getIdToken(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Inscription avec email/password
   */
  async register(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return {
        user: userCredential.user,
        token: await userCredential.user.getIdToken(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Connexion avec Google
   */
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return {
        user: result.user,
        token: await result.user.getIdToken(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Déconnexion
   */
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Obtenir le token actuel
   */
  async getCurrentToken() {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  },

  /**
   * Observer les changements d'authentification
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser() {
    return auth.currentUser;
  },
};

export default app;

