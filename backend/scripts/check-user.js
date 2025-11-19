import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialiser Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!projectId || !privateKey || !clientEmail) {
  console.error('❌ Variables Firebase manquantes');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    privateKey,
    clientEmail,
  }),
});

const email = 'trandriantiana@icloud.com';

async function checkAndCreateUser() {
  try {
    // Vérifier si l'utilisateur existe
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log('✅ Utilisateur trouvé:', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('⚠️ Utilisateur non trouvé, création en cours...');
        
        // Créer l'utilisateur
        user = await admin.auth().createUser({
          email: email,
          password: '#184BrianNeptunia@',
          emailVerified: false,
        });
        
        console.log('✅ Utilisateur créé:', {
          uid: user.uid,
          email: user.email,
        });
      } else {
        throw error;
      }
    }
    
    // Vérifier le mot de passe en essayant de se connecter
    console.log('\n📝 Pour tester la connexion, utilisez:');
    console.log(`Email: ${email}`);
    console.log('Mot de passe: #184BrianNeptunia@');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkAndCreateUser().then(() => {
  process.exit(0);
});

