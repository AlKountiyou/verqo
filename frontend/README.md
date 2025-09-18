# Verqo Frontend - SaaS d'automatisation de tests

Interface utilisateur moderne pour la plateforme Verqo, construite avec Next.js et TailwindCSS.

## 🚀 Fonctionnalités

### ✅ Implémentées
- **Authentification JWT** avec gestion des tokens et refresh automatique
- **Dashboard interactif** avec statistiques et vue d'ensemble
- **Gestion des projets** avec visualisation des détails
- **Tests flows** avec interface de lancement et statuts
- **Interface responsive** optimisée pour desktop et mobile
- **Composants réutilisables** avec shadcn/ui

### 🔧 Stack Technique
- **Next.js 15** (App Router)
- **TypeScript** pour la sécurité des types
- **TailwindCSS** pour le styling
- **shadcn/ui** pour les composants UI
- **Axios** pour les appels API
- **js-cookie** pour la gestion des cookies JWT
- **Lucide React** pour les icônes

## 📁 Structure du Projet

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── dashboard/         # Page dashboard principale
│   ├── login/            # Page de connexion
│   ├── layout.tsx        # Layout principal avec AuthProvider
│   └── page.tsx          # Page d'accueil (redirection)
├── components/           # Composants réutilisables
│   ├── layout/          # Header, NavBar
│   ├── project/         # ProjectCard, FlowCard
│   └── ui/              # Composants UI de base (shadcn/ui)
├── hooks/               # Hooks personnalisés
│   └── useAuth.ts       # Gestion de l'authentification
├── services/            # Services API
│   └── api.ts           # Configuration Axios et endpoints
├── types/               # Définitions TypeScript
│   └── index.ts         # Types pour l'API et les entités
├── lib/                 # Utilitaires
│   └── utils.ts         # Helpers TailwindCSS
└── middleware.ts        # Middleware de protection des routes
```

## 🛠 Installation et Développement

### Prérequis
- Node.js 18+
- npm ou pnpm
- Backend Verqo en fonctionnement (port 3000)

### Installation
```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement (si créé)
cp .env.example .env.local

# Configurer l'URL de l'API dans .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
```

### Développement
```bash
# Démarrer le serveur de développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm start

# Linting
npm run lint
```

L'application sera accessible sur http://localhost:3001

## 🔐 Authentification

### Comptes de Démonstration
- **Admin**: admin@verqo.com / admin123
- **Client**: client@verqo.com / client123  
- **Développeur**: dev@verqo.com / dev123

### Fonctionnement
1. **Login**: JWT + Refresh Token stockés en cookies
2. **Auto-refresh**: Renouvellement automatique des tokens expirés
3. **Protection des routes**: Middleware Next.js pour les routes protégées
4. **Rôles**: Contrôle d'accès basé sur les rôles utilisateur

## 📱 Interface Utilisateur

### Page de Login
- Formulaire sécurisé avec validation
- Gestion des erreurs API
- Comptes de démonstration affichés
- Design moderne et responsive

### Dashboard
- **Statistiques**: Projets totaux, actifs, tests en attente
- **Liste des projets**: Cards avec informations détaillées
- **Actions**: Actualisation, création de projet (selon rôle)
- **Header**: Navigation avec profil utilisateur

### Composants Projet
- **ProjectCard**: Affichage des détails, liens GitHub/Staging
- **FlowCard**: Tests avec statuts visuels, bouton de lancement
- **Statuts en temps réel**: Success, Failed, Running, Idle

## 🎨 Design System

### Couleurs
- **Primary**: Bleu moderne (#3b82f6)
- **Success**: Vert (#10b981)
- **Warning**: Orange (#f59e0b)
- **Error**: Rouge (#ef4444)
- **Muted**: Gris (#6b7280)

### Composants UI
Basés sur shadcn/ui pour la cohérence :
- `Button` avec variants (default, outline, ghost, etc.)
- `Card` pour les conteneurs principaux
- `Badge` pour les statuts et labels
- `Input` pour les formulaires

## 🔗 Intégration API

### Configuration
```typescript
// Base URL configurable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Intercepteurs automatiques pour JWT
api.interceptors.request.use(/* ajout auto du token */);
api.interceptors.response.use(/* refresh auto en cas d'expiration */);
```

### Endpoints Utilisés
- `POST /auth/login` - Connexion utilisateur
- `POST /auth/logout` - Déconnexion
- `POST /auth/refresh` - Renouvellement token
- `GET /auth/me` - Profil utilisateur
- `GET /projects` - Liste des projets
- `GET /projects/:id` - Détails d'un projet

### Mock Data
Pour le MVP, les flows de tests utilisent des données mockées avec simulation de:
- Statuts de tests (Success/Failed/Running)
- Durées d'exécution
- Logs et messages d'erreur

## 🚀 Déploiement

### Build de Production
```bash
npm run build
```

### Variables d'Environnement
```env
NEXT_PUBLIC_API_URL=https://api.verqo.com
```

### Hébergement Recommandé
- **Vercel** (intégration native Next.js)
- **Netlify** avec configuration Next.js
- **Docker** avec serveur Node.js

## 🔄 États et Loading

### Gestion des États
- **Loading states** pour toutes les opérations async
- **Error handling** avec messages utilisateur
- **Optimistic updates** pour une UX fluide
- **Retry logic** pour les échecs réseau

### Composants Loading
- Spinners avec `Loader2` de Lucide
- Skeleton loading pour les cards
- États vides avec illustrations

## 📝 Prochaines Étapes

### Fonctionnalités à Ajouter
1. **Création de projets** - Interface complète
2. **Gestion d'équipe** - Assignation de développeurs
3. **Paramètres utilisateur** - Profil et préférences
4. **Notifications** - Alerts en temps réel
5. **Tests détaillés** - Logs complets et historique
6. **Rapports** - Analytics et métriques
7. **Mode sombre** - Thème alternatif

### Améliorations Techniques
1. **Tests automatisés** - Jest + Testing Library
2. **Storybook** - Documentation des composants
3. **PWA** - Support offline et notifications
4. **Websockets** - Updates en temps réel
5. **Caching** - React Query ou SWR
6. **Monitoring** - Sentry pour les erreurs

## 🤝 Contribution

### Standards de Code
- **TypeScript strict** pour la sécurité
- **ESLint + Prettier** pour la cohérence
- **Conventional Commits** pour l'historique
- **Composants purs** quand possible

### Architecture
- **Séparation des préoccupations** (UI/Logic/API)
- **Hooks personnalisés** pour la logique métier
- **Context API** pour l'état global
- **Services** pour les appels API

Ce frontend offre une base solide pour le SaaS Verqo avec une interface moderne, sécurisée et extensible.