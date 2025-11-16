import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validation.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProducts,
} from '../controllers/products.controller.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/v1/products - Liste des produits
router.get('/', getProducts);

// GET /api/v1/products/:id - Détails d'un produit
router.get('/:id', getProduct);

// POST /api/v1/products - Créer un produit
router.post('/', validate(schemas.product), createProduct);

// PUT /api/v1/products/:id - Modifier un produit
router.put('/:id', validate(schemas.product), updateProduct);

// DELETE /api/v1/products/:id - Supprimer un produit
router.delete('/:id', deleteProduct);

// POST /api/v1/products/upload - Upload CSV
router.post('/upload', uploadProducts);

export default router;

