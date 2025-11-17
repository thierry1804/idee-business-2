import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Vérifier si Supabase est configuré
const isSupabaseConfigured = supabaseUrl && 
                              supabaseServiceRoleKey && 
                              !supabaseUrl.includes('your_') && 
                              !supabaseServiceRoleKey.includes('your_');

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase non configuré - les variables d\'environnement sont manquantes');
  console.warn('📝 Veuillez configurer SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans le fichier .env');
}

// Client avec service_role_key pour accès complet (backend uniquement)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Client pour requêtes utilisateur (si nécessaire)
export const supabaseAnon = isSupabaseConfigured && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    })
  : null;

