import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialiser Firebase Admin
let firebaseAdminInitialized = false;

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Vérifier que toutes les variables sont définies
    if (projectId && privateKey && clientEmail && 
        !projectId.includes('your_') && 
        !privateKey.includes('your_') && 
        !clientEmail.includes('your_')) {
      // Nettoyer la clé privée : enlever les guillemets et remplacer les \n échappés
      const cleanedPrivateKey = privateKey
        .replace(/^"|"$/g, '') // Enlever les guillemets au début et à la fin
        .replace(/\\n/g, '\n'); // Remplacer les \n échappés par de vrais retours à la ligne
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          privateKey: cleanedPrivateKey,
          clientEmail: clientEmail,
        }),
      });
      firebaseAdminInitialized = true;
      console.log('✅ Firebase Admin initialisé avec succès');
    } else {
      console.warn('⚠️ Firebase Admin non configuré - les variables d\'environnement sont manquantes');
      console.warn('📝 Veuillez configurer FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY et FIREBASE_CLIENT_EMAIL dans le fichier .env');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    firebaseAdminInitialized = false;
  }
} else {
  firebaseAdminInitialized = true;
}

/**
 * Middleware d'authentification Firebase
 * Vérifie le token Firebase et ajoute l'utilisateur à req.user
 */
export const authenticate = async (req, res, next) => {
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ 
      error: 'Firebase Admin non configuré. Veuillez configurer les variables d\'environnement Firebase.' 
    });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Vérifier le token Firebase
    console.log('🔍 Vérification du token Firebase...');
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('✅ Token vérifié avec succès pour:', decodedToken.email);
    
    // Ajouter les infos utilisateur à la requête
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      firebase_uid: decodedToken.uid,
    };

    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    console.error('Error code:', error.code);
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware optionnel - ne bloque pas si pas de token
 * Utile pour certaines routes publiques avec données enrichies si authentifié
 */
export const optionalAuth = async (req, res, next) => {
  if (!firebaseAdminInitialized) {
    // Si Firebase n'est pas configuré, continuer sans authentification
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        firebase_uid: decodedToken.uid,
      };
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    next();
  }
};

