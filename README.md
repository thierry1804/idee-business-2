# Assistant Commercial IA pour WhatsApp - MVP

Service B2B SaaS destiné aux PME, commerçants et e-commerçants à Madagascar pour automatiser les réponses clients sur WhatsApp, générer devis, suivre prospects, et permettre la conversion rapide.

## Architecture

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind CSS
- **Base de données**: Supabase (PostgreSQL)
- **Auth**: Firebase Auth
- **WhatsApp**: Meta WhatsApp Business API
- **IA**: OpenAI (GPT-3.5-turbo ou GPT-4)
- **PDF**: PDFKit

## Installation

### Prérequis

- Node.js 18+
- Compte Supabase
- Compte Firebase
- Compte OpenAI
- Compte Meta Business (pour WhatsApp Business API)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Éditer .env avec vos credentials
npm run dev
```

Le backend démarre sur `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Éditer .env avec vos credentials
npm run dev
```

Le frontend démarre sur `http://localhost:5173`

### Base de données

Exécuter la migration SQL dans Supabase:

```bash
# Copier le contenu de supabase/migrations/001_initial_schema.sql
# et l'exécuter dans l'éditeur SQL de Supabase
```

## Configuration

### Supabase

1. Créer un nouveau projet Supabase
2. Récupérer l'URL et les clés API
3. Configurer Row Level Security (RLS) pour les tables
4. Créer un bucket Storage pour les images produits et PDFs devis

### Firebase

1. Créer un projet Firebase
2. Activer Authentication (Email/Password, Google)
3. Récupérer les credentials pour le frontend
4. Créer un compte de service pour le backend (Firebase Admin SDK)

### WhatsApp Business API

1. Créer une app Meta Business
2. Configurer WhatsApp Business API
3. Récupérer le Phone Number ID et Access Token
4. Configurer le webhook avec l'URL: `https://votre-domaine.com/webhooks/whatsapp`
5. Définir le Verify Token

### OpenAI

1. Créer un compte OpenAI
2. Générer une clé API
3. Configurer dans `.env` du backend

## Structure du projet

```
business2/
├── backend/              # API Express
│   ├── src/
│   │   ├── routes/      # Routes API
│   │   ├── controllers/ # Contrôleurs
│   │   ├── models/      # Modèles DB
│   │   ├── services/    # Services (OpenAI, WhatsApp, PDF)
│   │   ├── middleware/  # Auth, validation
│   │   └── utils/       # Helpers
│   ├── package.json
│   └── .env.example
├── frontend/            # React Admin Panel
│   ├── src/
│   │   ├── components/  # Composants React
│   │   ├── pages/       # Pages (Dashboard, Products, Conversations)
│   │   ├── services/    # API clients
│   │   └── hooks/       # Custom hooks
│   ├── package.json
│   └── tailwind.config.js
├── supabase/
│   └── migrations/      # Migrations SQL
└── README.md
```

## API Endpoints

### Authentification
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `GET /api/v1/auth/me` - Profil utilisateur

### Produits
- `GET /api/v1/products` - Liste produits
- `POST /api/v1/products` - Créer produit
- `PUT /api/v1/products/:id` - Modifier produit
- `DELETE /api/v1/products/:id` - Supprimer produit
- `POST /api/v1/products/upload` - Upload CSV

### Conversations
- `GET /api/v1/conversations` - Liste conversations
- `GET /api/v1/conversations/:id` - Détails conversation
- `GET /api/v1/conversations/:id/messages` - Messages d'une conversation
- `PUT /api/v1/conversations/:id/status` - Changer statut

### Devis
- `GET /api/v1/devis` - Liste devis
- `GET /api/v1/devis/:id` - Détails devis
- `POST /api/v1/devis` - Créer devis

### FAQ
- `GET /api/v1/faq` - Liste FAQ
- `POST /api/v1/faq` - Créer FAQ
- `PUT /api/v1/faq/:id` - Modifier FAQ
- `DELETE /api/v1/faq/:id` - Supprimer FAQ

### Settings
- `GET /api/v1/settings` - Récupérer settings
- `PUT /api/v1/settings` - Mettre à jour settings

### WhatsApp
- `POST /webhooks/whatsapp` - Webhook Meta (réception messages)
- `POST /api/v1/wa/send` - Envoyer message manuel

## Développement

### Webhook local

Pour tester les webhooks WhatsApp en local, utiliser ngrok:

```bash
ngrok http 3000
```

Puis configurer l'URL ngrok dans les paramètres webhook Meta.

## Licence

ISC

