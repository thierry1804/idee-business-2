import { supabase } from '../models/supabase.js';
import { authenticate } from '../middleware/auth.js';

/**
 * Créer ou récupérer un utilisateur depuis Firebase UID
 */
export const register = async (req, res) => {
  try {
    const { company_name, phone } = req.body;
    const firebase_uid = req.user.uid;
    const email = req.user.email;

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebase_uid)
      .single();

    if (existingUser) {
      return res.status(200).json({
        message: 'User already exists',
        user: existingUser,
      });
    }

    // Créer nouvel utilisateur
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        company_name: company_name || email.split('@')[0],
        email,
        phone,
        firebase_uid,
        plan: 'free',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Créer settings par défaut
    await supabase.from('settings').insert([
      { user_id: newUser.id, key: 'greeting_message', value: 'Bonjour ! Comment puis-je vous aider ?' },
      { user_id: newUser.id, key: 'out_of_hours_message', value: 'Nous sommes actuellement fermés. Nous vous répondrons dès que possible.' },
      { user_id: newUser.id, key: 'language', value: 'fr' },
    ]);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Login - récupère l'utilisateur depuis Firebase UID
 */
export const login = async (req, res) => {
  try {
    const firebase_uid = req.user.uid;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebase_uid)
      .single();

    if (error || !user) {
      // Si l'utilisateur n'existe pas, le créer automatiquement
      const email = req.user.email;
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          company_name: email.split('@')[0],
          email,
          firebase_uid,
          plan: 'free',
        })
        .select()
        .single();

      if (newUser) {
        // Créer settings par défaut
        await supabase.from('settings').insert([
          { user_id: newUser.id, key: 'greeting_message', value: 'Bonjour ! Comment puis-je vous aider ?' },
          { user_id: newUser.id, key: 'out_of_hours_message', value: 'Nous sommes actuellement fermés. Nous vous répondrons dès que possible.' },
          { user_id: newUser.id, key: 'language', value: 'fr' },
        ]);

        return res.status(200).json({
          message: 'User created and logged in',
          user: newUser,
        });
      }

      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Récupérer le profil de l'utilisateur actuel
 */
export const getMe = async (req, res) => {
  try {
    const firebase_uid = req.user.uid;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebase_uid)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

