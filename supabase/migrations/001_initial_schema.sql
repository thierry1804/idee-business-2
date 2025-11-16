-- Migration initiale - Schéma complet pour WhatsApp AI Assistant MVP

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    plan VARCHAR(20) DEFAULT 'free',
    firebase_uid TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table WHATSAPP ACCOUNTS
CREATE TABLE whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    wa_number TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'meta',
    webhook_token TEXT NOT NULL,
    access_token TEXT,
    phone_number_id TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, wa_number)
);

-- Table PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    sku TEXT,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'MGA',
    stock INTEGER DEFAULT 0,
    image_path TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche produits
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_title ON products USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

-- Table CONVERSATIONS
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wa_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_name TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open',
    prospect_status VARCHAR(20) DEFAULT 'new',
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(wa_account_id, contact_phone)
);

-- Index pour conversations
CREATE INDEX idx_conversations_wa_account ON conversations(wa_account_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Table MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    direction VARCHAR(5) NOT NULL CHECK (direction IN ('in','out')),
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    media_url TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW(),
    wa_message_id TEXT
);

-- Index pour messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);

-- Table DEVIS
CREATE TABLE devis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_name TEXT,
    items JSONB NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    tax NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'MGA',
    pdf_path TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour devis
CREATE INDEX idx_devis_user_id ON devis(user_id);
CREATE INDEX idx_devis_conversation ON devis(conversation_id);
CREATE INDEX idx_devis_status ON devis(status);

-- Table FAQ
CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'fr',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour FAQ
CREATE INDEX idx_faq_user_id ON faq_items(user_id);
CREATE INDEX idx_faq_language ON faq_items(language);

-- Table SETTINGS
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- Index pour settings
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_accounts_updated_at BEFORE UPDATE ON whatsapp_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devis_updated_at BEFORE UPDATE ON devis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at BEFORE UPDATE ON faq_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Politiques de base
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS: Les utilisateurs ne peuvent accéder qu'à leurs propres données
-- Note: Ces politiques nécessitent que l'application passe le user_id via JWT claims
-- Pour le MVP, on peut utiliser des politiques plus permissives côté backend avec service_role_key

-- Politique pour users: lecture de son propre profil
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (auth.uid()::text = firebase_uid);

-- Politique pour products: accès à ses propres produits
CREATE POLICY "Users can manage own products" ON products
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE firebase_uid = auth.uid()::text
        )
    );

-- Politique pour conversations: accès via whatsapp_accounts
CREATE POLICY "Users can access own conversations" ON conversations
    FOR ALL USING (
        wa_account_id IN (
            SELECT wa.id FROM whatsapp_accounts wa
            JOIN users u ON wa.user_id = u.id
            WHERE u.firebase_uid = auth.uid()::text
        )
    );

-- Politique pour messages: via conversations
CREATE POLICY "Users can access own messages" ON messages
    FOR ALL USING (
        conversation_id IN (
            SELECT c.id FROM conversations c
            JOIN whatsapp_accounts wa ON c.wa_account_id = wa.id
            JOIN users u ON wa.user_id = u.id
            WHERE u.firebase_uid = auth.uid()::text
        )
    );

-- Politique pour devis
CREATE POLICY "Users can manage own devis" ON devis
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE firebase_uid = auth.uid()::text
        )
    );

-- Politique pour FAQ
CREATE POLICY "Users can manage own FAQ" ON faq_items
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE firebase_uid = auth.uid()::text
        )
    );

-- Politique pour settings
CREATE POLICY "Users can manage own settings" ON settings
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE firebase_uid = auth.uid()::text
        )
    );

-- Politique pour whatsapp_accounts
CREATE POLICY "Users can manage own WhatsApp accounts" ON whatsapp_accounts
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE firebase_uid = auth.uid()::text
        )
    );

