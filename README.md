# 🚀 Verqo - SaaS d'automatisation de tests

Plateforme complète pour automatiser les tests de vos projets web avec une interface moderne et un backend robuste.

## 📋 Vue d'ensemble

**Verqo** est un SaaS qui permet aux équipes de développement de :
- Gérer leurs projets et équipes
- Automatiser les tests fonctionnels
- Suivre les résultats en temps réel
- Collaborer efficacement selon les rôles

## 🏗️ Architecture

```
verqo/
├── backend/          # API NestJS + PostgreSQL + Prisma
├── frontend/         # Interface Next.js + TailwindCSS
├── workers/          # Exécuteurs de tests (futur)
└── start-dev.sh      # Script de démarrage rapide
```

### Stack Technique

**Backend (NestJS)**
- 🛡️ **Authentification JWT** avec refresh tokens
- 🗄️ **PostgreSQL** + **Prisma ORM**
- 👥 **Gestion des rôles** (Admin/Client/Dev)
- 📊 **API REST** complète et documentée
- 🧪 **Tests** unitaires et e2e

**Frontend (Next.js)**
- ⚡ **Next.js 15** avec App Router
- 🎨 **TailwindCSS** + **shadcn/ui**
- 🔐 **Authentification** sécurisée
- 📱 **Interface responsive** moderne
- 🔄 **États temps réel** des tests

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** 18+ 
- **PostgreSQL** (ou Docker)
- **npm** ou **pnpm**

### Installation Automatique
```bash
# Cloner le repo
git clone <your-repo>
cd verqo

# Démarrer tout automatiquement
./start-dev.sh
```

Le script va :
1. ✅ Installer toutes les dépendances
2. 🐳 Démarrer PostgreSQL (Docker)
3. 🔧 Lancer le backend (port 3000)
4. 🎨 Lancer le frontend (port 3001)
5. 📊 Configurer la base de données

### Installation Manuelle

#### 1. Backend
```bash
cd backend

# Installation
npm install

# Base de données (Docker)
docker-compose up -d postgres

# Configuration environnement
cp .env.example .env
# Éditer .env avec vos paramètres (voir GITHUB_SETUP.md pour GitHub OAuth)

# Migration et seed
npm run db:push
npm run db:seed

# Démarrage
npm run start:dev  # Port 3000
```

#### Configuration GitHub OAuth
```bash
# Voir le guide détaillé
cat backend/GITHUB_SETUP.md

# Créer une GitHub App sur https://github.com/settings/developers
# Ajouter les clés dans backend/.env :
# GITHUB_CLIENT_ID="your-client-id"
# GITHUB_CLIENT_SECRET="your-client-secret"
```

#### 2. Frontend
```bash
cd frontend

# Installation  
npm install

# Configuration
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# Démarrage
npm run dev  # Port 3001
```

## 🎯 Accès à l'Application

**Frontend**: http://localhost:3001  
**Backend API**: http://localhost:3000  
**Prisma Studio**: http://localhost:5555

### 👤 Comptes de Démonstration

| Rôle  | Email | Mot de passe | Permissions |
|-------|-------|--------------|-------------|
| **Admin** | admin@verqo.com | admin123 | Gestion complète |
| **Client** | client@verqo.com | client123 | Projets, tests |
| **Dev** | dev@verqo.com | dev123 | Tests assignés |

## 🔧 Fonctionnalités

### ✅ Implémentées

#### Authentification & Utilisateurs
- [x] Inscription/Connexion avec JWT
- [x] Refresh tokens automatique
- [x] Gestion des rôles (Admin/Client/Dev)
- [x] CRUD utilisateurs (Admin/Dev only)
- [x] Protection des routes

#### Projets
- [x] Création de projets (Client/Admin)
- [x] Assignation de développeurs
- [x] Liens GitHub et staging
- [x] Statuts de projet (Actif/Pause/Terminé/Archivé)
- [x] Visualisation dashboard

#### Interface
- [x] Dashboard avec statistiques
- [x] Cartes de projets interactives
- [x] Simulation de tests avec statuts
- [x] Design responsive et moderne
- [x] Loading states et gestion d'erreurs

### 🔄 En Cours/Prochainement

#### Tests Automatisés
- [ ] Configuration des flows de tests
- [ ] Exécution avec Playwright/Puppeteer
- [ ] Rapports détaillés et logs
- [ ] Notifications en temps réel
- [ ] Intégration CI/CD

#### Fonctionnalités Avancées
- [ ] Équipes et permissions granulaires
- [ ] Webhooks et intégrations
- [ ] Analytics et métriques
- [ ] API publique avec documentation
- [ ] Mode multi-tenant

## 📖 Documentation

### API Backend
- **Swagger**: http://localhost:3000/api (après démarrage)
- **Prisma Studio**: `npm run db:studio` dans `/backend`
- **Tests**: `npm run test` et `npm run test:e2e`

### Frontend
- **Storybook**: À venir
- **Tests**: `npm run test` dans `/frontend`
- **Build**: `npm run build`

## 🔒 Sécurité

### Authentification
- 🔐 **JWT** avec rotation des refresh tokens
- 🍪 **Cookies sécurisés** (httpOnly, secure)
- ⏱️ **Expiration automatique** des sessions
- 🛡️ **CORS** configuré pour le frontend

### Données
- 🔒 **Hash bcrypt** pour les mots de passe
- 🔍 **Validation** stricte des inputs (class-validator)
- 🚫 **Protection** contre les injections SQL (Prisma)
- 📋 **Logs** d'audit des actions critiques

## 🧪 Tests

### Backend
```bash
cd backend
npm run test          # Tests unitaires
npm run test:e2e     # Tests end-to-end  
npm run test:cov     # Couverture de code
```

### Frontend
```bash
cd frontend
npm run test         # Tests React/Jest
npm run build        # Vérification build
```

## 🚀 Déploiement

### Environnements

**Développement**
- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- DB: PostgreSQL local

**Production** (recommandations)
- **Backend**: Railway, Heroku, DigitalOcean
- **Frontend**: Vercel, Netlify
- **Database**: PostgreSQL managé (Railway, Supabase)

### Variables d'Environnement

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/verqo"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRATION_TIME="15m"
JWT_REFRESH_EXPIRATION_TIME="7d"
PORT=3000
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🤝 Contribution

### Développement
1. Fork le projet
2. Créer une branche feature (`git checkout -b feat/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push la branche (`git push origin feat/amazing-feature`)
5. Ouvrir une Pull Request

### Standards
- **TypeScript** strict
- **ESLint + Prettier** pour le code
- **Conventional Commits** pour l'historique
- **Tests** pour les nouvelles fonctionnalités

## 📞 Support

- 📧 **Email**: support@verqo.com
- 📖 **Documentation**: [docs.verqo.com](https://docs.verqo.com)
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions

## 📄 Licence

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

**Verqo** - Automatisation de tests simplifiée 🚀