import axios from 'axios';
import { authService } from './firebase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Créer une instance axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token Firebase
api.interceptors.request.use(
  async (config) => {
    const token = await authService.getCurrentToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré, déconnecter l'utilisateur
      await authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

