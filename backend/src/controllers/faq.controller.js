import { supabase } from '../models/supabase.js';

/**
 * GET /api/v1/faq - Liste des FAQ
 */
export const getFAQ = async (req, res) => {
  try {
    const userId = req.user.uid;
    const language = req.query.language || 'fr';

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: faqItems, error } = await supabase
      .from('faq_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('language', language)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('FAQ fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch FAQ' });
    }

    res.status(200).json({ faq: faqItems || [] });
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/v1/faq - Créer une FAQ
 */
export const createFAQ = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { question, answer, language } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: faqItem, error } = await supabase
      .from('faq_items')
      .insert({
        user_id: user.id,
        question,
        answer,
        language: language || 'fr',
      })
      .select()
      .single();

    if (error) {
      console.error('FAQ creation error:', error);
      return res.status(500).json({ error: 'Failed to create FAQ' });
    }

    res.status(201).json({ faq: faqItem });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/v1/faq/:id - Modifier une FAQ
 */
export const updateFAQ = async (req, res) => {
  try {
    const userId = req.user.uid;
    const faqId = req.params.id;
    const { question, answer, language } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifier que la FAQ appartient à l'utilisateur
    const { data: existingFAQ } = await supabase
      .from('faq_items')
      .select('id')
      .eq('id', faqId)
      .eq('user_id', user.id)
      .single();

    if (!existingFAQ) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (language !== undefined) updateData.language = language;

    const { data: faqItem, error } = await supabase
      .from('faq_items')
      .update(updateData)
      .eq('id', faqId)
      .select()
      .single();

    if (error) {
      console.error('FAQ update error:', error);
      return res.status(500).json({ error: 'Failed to update FAQ' });
    }

    res.status(200).json({ faq: faqItem });
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/v1/faq/:id - Supprimer une FAQ
 */
export const deleteFAQ = async (req, res) => {
  try {
    const userId = req.user.uid;
    const faqId = req.params.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifier que la FAQ appartient à l'utilisateur
    const { data: existingFAQ } = await supabase
      .from('faq_items')
      .select('id')
      .eq('id', faqId)
      .eq('user_id', user.id)
      .single();

    if (!existingFAQ) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    const { error } = await supabase
      .from('faq_items')
      .delete()
      .eq('id', faqId);

    if (error) {
      console.error('FAQ deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete FAQ' });
    }

    res.status(200).json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

