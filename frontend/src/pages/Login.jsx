import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/firebase.js';
import api from '../services/api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0); // Pour forcer le re-render
  const [loading, setLoading] = useState(false);
  const [firebaseConfigured, setFirebaseConfigured] = useState(true);
  const navigate = useNavigate();
  const errorRef = useRef('');

  useEffect(() => {
    setFirebaseConfigured(authService.isConfigured());
    
    // Récupérer l'erreur depuis sessionStorage au montage
    const savedError = sessionStorage.getItem('loginError');
    if (savedError) {
      setError(savedError);
      sessionStorage.removeItem('loginError');
    }
  }, []);

  // Debug: vérifier les changements d'erreur
  useEffect(() => {
    if (error) {
      console.log('🔴 Error state changé:', error);
      // Sauvegarder l'erreur dans sessionStorage
      sessionStorage.setItem('loginError', error);
      
      // Forcer l'affichage via DOM direct
      const updateErrorDisplay = () => {
        const errorDiv = document.querySelector('[data-error-display]');
        if (errorDiv) {
          errorDiv.style.display = 'block';
          errorDiv.classList.remove('hidden');
          const errorText = errorDiv.querySelector('[data-error-text]');
          if (errorText) {
            errorText.textContent = error;
          }
        }
      };
      
      // Mettre à jour immédiatement et régulièrement
      updateErrorDisplay();
      const interval = setInterval(updateErrorDisplay, 100);
      
      // Nettoyer après 5 secondes
      setTimeout(() => {
        clearInterval(interval);
      }, 5000);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔵 handleSubmit appelé, réinitialisation de l\'erreur');
    setError('');
    sessionStorage.removeItem('loginError');
    // Nettoyer aussi l'affichage DOM
    const errorDiv = document.querySelector('[data-error-display]');
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.classList.add('hidden');
    }
    setLoading(true);

    try {
      const { token, user } = await authService.login(email, password);
      
      if (!token) {
        throw new Error('Token non reçu après connexion');
      }
      
      console.log('🔑 Token obtenu, longueur:', token.length);
      console.log('🔑 Token obtenu à:', new Date().toISOString());
      
      // Utiliser le token immédiatement après l'obtention
      // Créer ou récupérer l'utilisateur dans notre backend
      // Utiliser directement le token au lieu de passer par l'intercepteur pour éviter les problèmes de cache
      const response = await api.post('/api/v1/auth/login', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('✅ Connexion réussie:', response.data);
      navigate('/');
    } catch (err) {
      console.error('❌ Erreur de connexion:', err);
      console.error('❌ Détails de l\'erreur:', {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });
      
      let errorMessage = 'Erreur de connexion';
      
      if (err.response) {
        // Erreur HTTP
        const status = err.response.status;
        const data = err.response.data;
        
        if (data) {
          // Prioriser le message explicite, puis les détails, puis l'erreur générique
          errorMessage = data.message || data.details || data.error || `Erreur ${status}`;
          
          // Si c'est une erreur 401 avec des détails spécifiques
          if (status === 401 && data.code) {
            if (data.code === 'auth/argument-error') {
              errorMessage = 'Erreur d\'authentification. Veuillez vérifier vos identifiants et réessayer.';
            } else if (data.code === 'auth/id-token-expired') {
              errorMessage = 'Erreur d\'authentification. Veuillez réessayer de vous connecter.';
            } else {
              errorMessage = 'Erreur d\'authentification. Veuillez vérifier vos identifiants.';
            }
          } else if (status === 401) {
            // Erreur 401 générique lors d'une connexion
            errorMessage = 'Email ou mot de passe incorrect, ou problème de configuration serveur.';
          }
        } else {
          // Si pas de data, utiliser le status
          if (status === 401) {
            errorMessage = 'Email ou mot de passe incorrect.';
          } else if (status === 403) {
            errorMessage = 'Accès refusé';
          } else {
            errorMessage = `Erreur ${status}: ${err.response.statusText || 'Erreur serveur'}`;
          }
        }
      } else if (err.message) {
        // Erreur Firebase ou autre
        if (err.message.includes('auth/invalid-credential')) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (err.message.includes('auth/user-not-found')) {
          errorMessage = 'Aucun compte trouvé avec cet email';
        } else if (err.message.includes('auth/wrong-password')) {
          errorMessage = 'Mot de passe incorrect';
        } else {
          errorMessage = err.message;
        }
      }
      
      console.log('🔴 Message d\'erreur défini:', errorMessage);
      errorRef.current = errorMessage;
      setError(errorMessage);
      setErrorKey(prev => prev + 1); // Forcer le re-render
      console.log('🔴 State error après setError:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      
      const { token } = await authService.loginWithGoogle();
      
      // Créer ou récupérer l'utilisateur dans notre backend
      await api.post('/api/v1/auth/login', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      navigate('/');
    } catch (err) {
      setError(err.message || 'Erreur de connexion Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              créez un compte
            </Link>
          </p>
        </div>
        
        {!firebaseConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p className="font-medium">⚠️ Configuration Firebase requise</p>
            <p className="text-sm mt-1">
              Veuillez configurer les variables d'environnement Firebase dans le fichier <code className="bg-yellow-100 px-1 rounded">.env</code>
            </p>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Affichage d'erreur persistant - visible même après re-render Vite */}
          <div 
            data-error-display
            className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 ${error && error.trim() !== '' ? '' : 'hidden'}`}
            role="alert"
            style={{ display: error && error.trim() !== '' ? 'block' : 'none' }}
          >
            <strong>Erreur :</strong> <span data-error-text>{error}</span>
          </div>
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !firebaseConfigured}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Ou</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || !firebaseConfigured}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuer avec Google
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

