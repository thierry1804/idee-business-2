import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validation.js';
import {
  getConversations,
  getConversation,
  getMessages,
  updateConversationStatus,
  getProspects,
} from '../controllers/conversations.controller.js';
import { sendMessage } from '../controllers/whatsapp.controller.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/v1/conversations - Liste des conversations
router.get('/', getConversations);

// GET /api/v1/prospects - Liste des prospects
router.get('/prospects', getProspects);

// GET /api/v1/conversations/:id - Détails d'une conversation
router.get('/:id', getConversation);

// GET /api/v1/conversations/:id/messages - Messages d'une conversation
router.get('/:id/messages', getMessages);

// PUT /api/v1/conversations/:id/status - Changer le statut
router.put('/:id/status', validate(schemas.conversationStatus), updateConversationStatus);

// POST /api/v1/wa/send - Envoyer un message WhatsApp
router.post('/wa/send', validate(schemas.sendMessage), sendMessage);

export default router;

