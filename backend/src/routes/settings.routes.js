import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { getFAQ, createFAQ, updateFAQ, deleteFAQ } from '../controllers/faq.controller.js';
import { validate, schemas } from '../utils/validation.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// FAQ routes
router.get('/faq', getFAQ);
router.post('/faq', validate(schemas.faq), createFAQ);
router.put('/faq/:id', validate(schemas.faq), updateFAQ);
router.delete('/faq/:id', deleteFAQ);

export default router;

