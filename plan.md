Assistant Commercial IA pour WhatsApp — Plan MVP

Contexte: service B2B SaaS destiné aux PME, commerçants et e-commerçants à Madagascar. But: automatiser les réponses clients sur WhatsApp, générer devis, suivre prospects, et permettre la conversion rapide (paiement / commande).

1. Objectifs du MVP

Déployer une version fonctionnelle en 7–14 jours.

Permettre à un commerçant de connecter son numéro WhatsApp Business, d'uploader son catalogue, et d'avoir un chatbot capable de répondre aux questions standards, générer un devis PDF et créer des prospects dans un mini-pipeline.

Interface admin simple (React) pour configurer messages, FAQ, catalogues et visualiser conversations.

2. Utilisateurs cibles & personas

Petit commerçant: gère boutique physique + commandes WhatsApp. Besoin : répondre vite, générer devis.

PME e-commerce: flux important de messages → besoin d'automatisation et rapports.

Agence / revendeur: gère plusieurs boutiques, veut config multi-numéros.

3. Fonctionnalités MVP (détail)
A. Core

Intégration WhatsApp Business API via webhook

Bot IA: traitement NL (LLM) pour interpréter questions et formuler réponses

Catalogue produit: upload CSV / gestion simple (titre, SKU, prix, stock, photo, description)

Génération devis: créer PDF depuis conversation (ligne items, total, HT/TTC, coordonnées client)

Mini-CRM: fiche prospect (nom, tel, messages, statut pipeline)

Dashboard: vue conversations récentes, conversions, messages traités

B. Configuration & local

Messages automatisés (greeting, out-of-hours)

FAQ (questions/réponses personnalisées)

Langues: Français + Malgache

C. Notifications

Email / WhatsApp interne pour nouvelles leads qualifiées

4. Architecture technique (haut niveau)

Front-end: React + Tailwind (Admin panel)

Auth: Firebase Auth (email/password, Google)

Back-end: PHP (Laravel) ou Node (Express) — endpoints REST

DB & Storage: Supabase (Postgres + storage) — produits, users, messages, files

IA: OpenAI (Chat completions / responses) — ou alternative locale si besoin

WhatsApp: Meta WhatsApp Business API (via provider: 360dialog, Gupshup, or direct if éligible)

PDF: Puppeteer (headless) or a PDF library (dompdf for PHP)

Notifications: SMTP / Firebase Cloud Messaging / Twilio (SMS) optional

5. Schéma de base de données (extrait)

users: id, company_name, email, phone, plan, created_at

whatsapp_accounts: id, user_id, wa_number, provider, webhook_token, status

products: id, user_id, sku, title, desc, price, currency, stock, image_path

conversations: id, wa_account_id, contact_phone, contact_name, last_message, status

messages: id, conversation_id, direction (in/out), content, metadata, timestamp

devis: id, conversation_id, items(json), total, tax, pdf_path, created_at

faq_items: id, user_id, question, answer

settings: id, user_id, key, value

6. Webhooks & Flux (sequence)

Message client → WhatsApp (Meta) → Webhook provider → POST to backend /webhooks/whatsapp

Backend vérifie signature → stocke message → envoie message au moteur IA (prompt + contexte minimal)

LLM renvoie réponse → backend mappe réponse → envoie réponse via WhatsApp API

Si requête devis: backend construit devis, stocke, génère PDF, envoie lien au client

Création/maj d’un prospect dans CRM

7. Prompting & logique IA (exemples)

Prompt system: tu es un assistant commercial poli, concis, tu proposes produits à partir du catalogue, demandes clarifications si besoin, tu crées devis si demandé.

Context window: derniers 6 messages + top 5 produits pertinents (embeddings/recherche)

Fallback: si incertain → message humain requis (escalation)

8. Endpoints REST (extrait)

POST /webhooks/whatsapp — réception messages

POST /api/v1/login — auth

GET /api/v1/products — liste produits

POST /api/v1/products/upload — CSV upload

POST /api/v1/devis — créer devis

GET /api/v1/conversations — lister conversations

POST /api/v1/wa/send — envoyer message manuel

9. Sécurité & conformité

Vérifier signatures webhook & tokens

Stocker médias/prospects chiffrés (supabase RLS rules)

RGPD-like: option suppression données client

Limitation rate pour éviter abus (messages/min)

10. Plan de monétisation (MVP)

Freemium : 14 jours d’essai gratuit, limite 100 messages/mois

Plans mensuels : Starter / Pro / Business (prix locaux en Ariary)

Add-ons : génération PDF white-label, multi-numéro, intégration paiement

Tarification par message AI après quota (micro-tarif)

11. Roadmap détaillée (Sprint 7 jours)

Jour 1: Setup infra (repo, Supabase, Firebase), Auth, skeleton React Jour 2: Webhook ingestion + afficher messages dans dashboard Jour 3: Intégration OpenAI & simple echo bot Jour 4: Catalogue upload + recherche produits basique Jour 5: Génération devis + PDF Jour 6: FAQ & messages de configuration, onboarding Jour 7: Tests, démo client, doc d’installation

12. Tests & KPIs

Taux de réponse automatique (%)

Taux conversion lead→devis

Temps moyen de résolution

Taux d’escalade vers humain

13. Go-to-market Madagascar

Cible: boutiques, grossistes, pharmacies, restaurants

Canal: Facebook/WhatsApp Ads, partenariats avec opérateurs (Moov/Orange), marketplace locale

Offre: installation + 1 mois gratuit pour premiers clients

14. Livrables que je peux produire pour toi maintenant

Schéma technique (diagramme)

Modèle de données SQL complet

API spec OpenAPI

Prompt templates prêts pour LLM

Landing page (copy + design)

Script d’onboarding commercial

Si tu veux, je peux maintenant générer le modèle de données SQL complet et l’OpenAPI spec pour ce MVP — dis-moi lequel tu veux en premier et je le crée dans ce document.

15. Modèle de données SQL complet (PostgreSQL)
-- USERS
    provider TEXT NOT NULL,
    webhook_token TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);


-- PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sku TEXT,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'MGA',
    stock INTEGER DEFAULT 0,
    image_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);


-- CONVERSATIONS
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
    contact_phone TEXT NOT NULL,
    contact_name TEXT,
    last_message TEXT,
    status VARCHAR(20) DEFAULT 'open',
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);


-- MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    direction VARCHAR(5) NOT NULL CHECK (direction IN ('in','out')),
    content TEXT,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);


-- DEVIS
CREATE TABLE devis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    total NUMERIC(12,2),
    tax NUMERIC(12,2),
    pdf_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);


-- FAQ
CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL
);


-- SETTINGS
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT
);
16. OpenAPI Specification (v1 — Simplifiée pour MVP)
  /api/v1/login:
    post:
      summary: Authentification utilisateur
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        '200': { description: Auth success }


  /api/v1/products:
    get:
      summary: Liste des produits
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'


  /api/v1/products/upload:
    post:
      summary: Upload CSV de produits
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '200': { description: Upload OK }


  /api/v1/devis:
    post:
      summary: Créer un devis depuis conversation
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                conversation_id:
                  type: string
                items:
                  type: array
                  items:
                    type: object
      responses:
        '200': { description: Devis généré }


  /api/v1/conversations:
    get:
      summary: Liste des conversations
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Conversation'


  /api/v1/wa/send:
    post:
      summary: Envoyer un message WhatsApp manuel
      requestBody:
        content:
        

C’est fait — j’ai ajouté :

✅ Le modèle de données SQL complet (PostgreSQL)
✅ L’OpenAPI Specification complète (v1 pour MVP)

directement dans le document.

Si tu veux aller plus loin, je peux maintenant ajouter dans le document :

Les prompts IA (system + assistant + user) pour le bot WhatsApp

Les endpoints internes (services IA → WhatsApp → DB)

Le schéma d’architecture complet (sequence diagram)

La logique d’IA pour classification des intentions (INTENT ENGINE)

Le code du webhook (Node, PHP ou Python)

La stratégie de scaling et de sécurité

La structure du projet (monorepo + packages)

Le process de génération de devis PDF (avec template)

Le plan marketing + landing page