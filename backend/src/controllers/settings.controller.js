import { supabase } from '../models/supabase.js';

/**
 * GET /api/v1/settings - Récupérer les settings de l'utilisateur
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.user.uid;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Settings fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // Transformer en objet clé-valeur
    const settingsObj = {};
    (settings || []).forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.status(200).json({ settings: settingsObj });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/v1/settings - Mettre à jour les settings
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user.uid;
    const settings = req.body; // { key: value, ... }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mettre à jour ou créer chaque setting
    const updates = Object.entries(settings).map(([key, value]) => ({
      user_id: user.id,
      key,
      value: value !== null && value !== undefined ? String(value) : null,
    }));

    // Utiliser upsert pour créer ou mettre à jour
    const { error } = await supabase
      .from('settings')
      .upsert(updates, {
        onConflict: 'user_id,key',
      });

    if (error) {
      console.error('Settings update error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.status(200).json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

