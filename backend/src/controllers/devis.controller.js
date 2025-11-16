import { supabase } from '../models/supabase.js';
import pdfService from '../services/pdf.service.js';

/**
 * GET /api/v1/devis - Liste des devis
 */
export const getDevis = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.query.conversation_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = supabase
      .from('devis')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data: devis, error, count } = await query;

    if (error) {
      console.error('Devis fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch devis' });
    }

    res.status(200).json({
      devis: devis || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get devis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/devis/:id - Détails d'un devis
 */
export const getDevisById = async (req, res) => {
  try {
    const userId = req.user.uid;
    const devisId = req.params.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: devis, error } = await supabase
      .from('devis')
      .select('*')
      .eq('id', devisId)
      .eq('user_id', user.id)
      .single();

    if (error || !devis) {
      return res.status(404).json({ error: 'Devis not found' });
    }

    res.status(200).json({ devis });
  } catch (error) {
    console.error('Get devis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/v1/devis - Créer un devis
 */
export const createDevis = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { conversation_id, contact_phone, contact_name, items, tax, currency } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, company_name, email, phone')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculer les totaux
    const itemsArray = Array.isArray(items) ? items : [];
    const subtotal = itemsArray.reduce((sum, item) => {
      const quantity = item.quantity || 1;
      const price = parseFloat(item.price) || 0;
      return sum + (quantity * price);
    }, 0);

    const taxAmount = parseFloat(tax) || 0;
    const total = subtotal + taxAmount;

    // Créer le devis
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .insert({
        conversation_id: conversation_id || null,
        user_id: user.id,
        contact_phone,
        contact_name: contact_name || null,
        items: itemsArray,
        subtotal,
        tax: taxAmount,
        total,
        currency: currency || 'MGA',
        status: 'draft',
      })
      .select()
      .single();

    if (devisError) {
      console.error('Devis creation error:', devisError);
      return res.status(500).json({ error: 'Failed to create devis' });
    }

    // Générer le PDF
    try {
      const pdfResult = await pdfService.generateDevisPDF(devis, user);
      
      // Mettre à jour le devis avec le chemin du PDF
      await supabase
        .from('devis')
        .update({ pdf_path: pdfResult.pdfPath })
        .eq('id', devis.id);

      devis.pdf_path = pdfResult.pdfPath;
      devis.pdf_url = pdfResult.pdfUrl;
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      // Ne pas échouer la création du devis si le PDF échoue
    }

    res.status(201).json({ devis });
  } catch (error) {
    console.error('Create devis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/devis/:id/pdf - Télécharger le PDF d'un devis
 */
export const getDevisPDF = async (req, res) => {
  try {
    const userId = req.user.uid;
    const devisId = req.params.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: devis, error } = await supabase
      .from('devis')
      .select('*')
      .eq('id', devisId)
      .eq('user_id', user.id)
      .single();

    if (error || !devis) {
      return res.status(404).json({ error: 'Devis not found' });
    }

    if (!devis.pdf_path) {
      // Générer le PDF s'il n'existe pas
      const { data: fullUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const pdfResult = await pdfService.generateDevisPDF(devis, fullUser);
      
      await supabase
        .from('devis')
        .update({ pdf_path: pdfResult.pdfPath })
        .eq('id', devis.id);

      // Rediriger vers l'URL publique
      return res.redirect(pdfResult.pdfUrl);
    }

    // Télécharger le PDF depuis Supabase Storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('devis')
      .download(devis.pdf_path);

    if (downloadError) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="devis-${devisId}.pdf"`);
    res.send(pdfData);
  } catch (error) {
    console.error('Get devis PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

