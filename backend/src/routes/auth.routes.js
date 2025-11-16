import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { register, login, getMe } from '../controllers/auth.controller.js';

const router = express.Router();

// POST /api/v1/auth/register - Créer un utilisateur (nécessite auth Firebase)
router.post('/register', authenticate, register);

// POST /api/v1/auth/login - Login (nécessite auth Firebase)
router.post('/login', authenticate, login);

// GET /api/v1/auth/me - Récupérer le profil utilisateur
router.get('/me', authenticate, getMe);

export default router;

