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
    console.log('🔍 Token reçu (premiers caractères):', token.substring(0, 50) + '...');
    console.log('🔍 Longueur du token:', token.length);
    const serverTime = new Date();
    console.log('🔍 Heure serveur:', serverTime.toISOString());
    console.log('🔍 Timestamp serveur:', serverTime.getTime());
    
    // Vérifier le token Firebase
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ Token vérifié avec succès pour:', decodedToken.email);
    } catch (verifyError) {
      // Si le token est expiré, vérifier si c'est un problème d'horloge
      if (verifyError.code === 'auth/id-token-expired') {
        console.error('❌ Token expiré détecté');
        console.error('❌ Heure serveur au moment de l\'erreur:', new Date().toISOString());
        
        // Décoder le token pour analyser les timestamps
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            const tokenExp = new Date(payload.exp * 1000);
            const tokenIat = new Date(payload.iat * 1000);
            const timeDiff = (payload.exp * 1000 - serverTime.getTime()) / 1000;
            const hoursDiff = Math.abs(timeDiff / 3600);
            
            console.error('❌ Token exp (expiration):', tokenExp.toISOString());
            console.error('❌ Token iat (émission):', tokenIat.toISOString());
            console.error('❌ Différence avec serveur (exp):', timeDiff, 'secondes (', hoursDiff.toFixed(2), 'heures)');
            console.error('❌ Token devrait être valide pendant:', (payload.exp - payload.iat), 'secondes');
            
            // En mode développement, si l'horloge est désynchronisée de plus de 1 heure,
            // on accepte le token quand même avec un avertissement
            if (timeDiff < 0 && process.env.NODE_ENV === 'development' && hoursDiff > 1) {
              console.warn('⚠️ MODE DÉVELOPPEMENT: Horloge serveur désynchronisée de', hoursDiff.toFixed(2), 'heures');
              console.warn('⚠️ Acceptation du token malgré l\'expiration (workaround temporaire)');
              console.warn('⚠️ SOLUTION: Synchroniser l\'horloge système avec: sudo timedatectl set-ntp true');
              
              // Décoder le token sans vérification d'expiration pour obtenir les infos utilisateur
              // On utilise directement le payload décodé
              decodedToken = {
                uid: payload.user_id || payload.sub,
                email: payload.email,
                exp: payload.exp,
                iat: payload.iat,
              };
              
              console.log('✅ Token accepté en mode développement (horloge désynchronisée)');
            } else {
              throw verifyError;
            }
          } else {
            throw verifyError;
          }
        } catch (decodeError) {
          console.error('❌ Impossible de décoder le token:', decodeError.message);
          throw verifyError;
        }
      } else {
        throw verifyError;
      }
    }
    
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
    console.error('Error stack:', error.stack);
    
    // Messages d'erreur plus détaillés en développement
    const errorResponse = {
      error: 'Invalid or expired token',
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
      errorResponse.code = error.code;
      
      // Messages d'erreur spécifiques selon le code d'erreur
      if (error.code === 'auth/argument-error') {
        errorResponse.message = 'Token invalide ou malformé';
      } else if (error.code === 'auth/id-token-expired') {
        errorResponse.message = 'Token expiré';
      } else if (error.code === 'auth/id-token-revoked') {
        errorResponse.message = 'Token révoqué';
      } else if (error.code === 'auth/project-not-found') {
        errorResponse.message = 'Projet Firebase non trouvé. Vérifiez FIREBASE_PROJECT_ID.';
      }
    }
    
    return res.status(401).json(errorResponse);
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

