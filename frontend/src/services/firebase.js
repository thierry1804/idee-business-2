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

// Validation des variables d'environnement Firebase
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Vérifier que toutes les variables sont définies
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value.includes('your_'))
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Variables Firebase manquantes ou non configurées:', missingVars);
  console.error('📝 Veuillez créer un fichier .env dans le dossier frontend avec les valeurs Firebase.');
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey || 'demo-api-key',
  authDomain: requiredEnvVars.authDomain || 'demo-project.firebaseapp.com',
  projectId: requiredEnvVars.projectId || 'demo-project',
  storageBucket: requiredEnvVars.storageBucket || 'demo-project.appspot.com',
  messagingSenderId: requiredEnvVars.messagingSenderId || '123456789',
  appId: requiredEnvVars.appId || '1:123456789:web:abcdef',
};

// Initialiser Firebase uniquement si les variables sont valides
let app;
let auth;
let googleProvider;

try {
  if (missingVars.length === 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } else {
    // Mode démo sans Firebase - créer des objets mock
    console.warn('⚠️ Firebase non configuré - mode démo activé');
    auth = null;
    googleProvider = null;
  }
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation de Firebase:', error);
  auth = null;
  googleProvider = null;
}

// Exporter googleProvider
export { googleProvider };

/**
 * Service d'authentification
 */
export const authService = {
  /**
   * Vérifier si Firebase est configuré
   */
  isConfigured() {
    return auth !== null;
  },

  /**
   * Connexion avec email/password
   */
  async login(email, password) {
    if (!auth) {
      throw new Error('Firebase n\'est pas configuré. Veuillez configurer les variables d\'environnement.');
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Forcer le rafraîchissement du token pour obtenir un token frais
      const token = await userCredential.user.getIdToken(true);
      console.log('✅ Token Firebase obtenu, longueur:', token.length);
      return {
        user: userCredential.user,
        token: token,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Inscription avec email/password
   */
  async register(email, password) {
    if (!auth) {
      throw new Error('Firebase n\'est pas configuré. Veuillez configurer les variables d\'environnement.');
    }
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
    if (!auth || !googleProvider) {
      throw new Error('Firebase n\'est pas configuré. Veuillez configurer les variables d\'environnement.');
    }
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
    if (!auth) {
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Obtenir le token actuel
   */
  async getCurrentToken(forceRefresh = false) {
    if (!auth) {
      return null;
    }
    const user = auth.currentUser;
    if (user) {
      // Forcer le rafraîchissement si demandé pour éviter les tokens expirés
      return await user.getIdToken(forceRefresh);
    }
    return null;
  },

  /**
   * Observer les changements d'authentification
   */
  onAuthStateChanged(callback) {
    if (!auth) {
      // Si Firebase n'est pas configuré, appeler le callback avec null immédiatement
      callback(null);
      return () => {}; // Retourner une fonction de nettoyage vide
    }
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser() {
    if (!auth) {
      return null;
    }
    return auth.currentUser;
  },
};

export { auth };
export default app;

