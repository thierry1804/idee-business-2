import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validation.js';
import {
  getDevis,
  getDevisById,
  createDevis,
  getDevisPDF,
} from '../controllers/devis.controller.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/v1/devis - Liste des devis
router.get('/', getDevis);

// GET /api/v1/devis/:id - Détails d'un devis
router.get('/:id', getDevisById);

// GET /api/v1/devis/:id/pdf - Télécharger le PDF
router.get('/:id/pdf', getDevisPDF);

// POST /api/v1/devis - Créer un devis
router.post('/', validate(schemas.devis), createDevis);

export default router;

