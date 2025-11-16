import { supabase } from '../models/supabase.js';
import { parse } from 'csv-parse/sync';
import multer from 'multer';
import { Readable } from 'stream';

// Configuration multer pour upload CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
}).single('file');

/**
 * GET /api/v1/products - Liste des produits
 */
export const getProducts = async (req, res) => {
  try {
    const userId = req.user.uid; // Firebase UID
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Récupérer l'utilisateur depuis Firebase UID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Recherche par texte
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Products fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    res.status(200).json({
      products: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/products/:id - Détails d'un produit
 */
export const getProduct = async (req, res) => {
  try {
    const userId = req.user.uid;
    const productId = req.params.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/v1/products - Créer un produit
 */
export const createProduct = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { sku, title, description, price, currency, stock, image_path } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        sku,
        title,
        description,
        price: parseFloat(price),
        currency: currency || 'MGA',
        stock: parseInt(stock) || 0,
        image_path,
      })
      .select()
      .single();

    if (error) {
      console.error('Product creation error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    res.status(201).json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/v1/products/:id - Modifier un produit
 */
export const updateProduct = async (req, res) => {
  try {
    const userId = req.user.uid;
    const productId = req.params.id;
    const { sku, title, description, price, currency, stock, image_path } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifier que le produit appartient à l'utilisateur
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updateData = {};
    if (sku !== undefined) updateData.sku = sku;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (currency !== undefined) updateData.currency = currency;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (image_path !== undefined) updateData.image_path = image_path;

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Product update error:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    res.status(200).json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/v1/products/:id - Supprimer un produit
 */
export const deleteProduct = async (req, res) => {
  try {
    const userId = req.user.uid;
    const productId = req.params.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifier que le produit appartient à l'utilisateur
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Product deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/v1/products/upload - Upload CSV de produits
 */
export const uploadProducts = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const userId = req.user.uid;
      const csvContent = req.file.buffer.toString('utf-8');

      // Parser le CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      // Récupérer l'utilisateur
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', userId)
        .single();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Préparer les produits à insérer
      const products = records.map(record => ({
        user_id: user.id,
        sku: record.sku || record.SKU || null,
        title: record.title || record.Titre || record.nom || '',
        description: record.description || record.Description || null,
        price: parseFloat(record.price || record.prix || record.Price || 0),
        currency: record.currency || record.Currency || 'MGA',
        stock: parseInt(record.stock || record.Stock || 0),
        image_path: record.image_path || record.image || null,
      })).filter(p => p.title); // Filtrer les produits sans titre

      if (products.length === 0) {
        return res.status(400).json({ error: 'No valid products found in CSV' });
      }

      // Insérer les produits
      const { data: insertedProducts, error } = await supabase
        .from('products')
        .insert(products)
        .select();

      if (error) {
        console.error('CSV upload error:', error);
        return res.status(500).json({ error: 'Failed to import products' });
      }

      res.status(200).json({
        message: `Successfully imported ${insertedProducts.length} products`,
        products: insertedProducts,
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: 'Failed to process CSV file' });
    }
  });
};

