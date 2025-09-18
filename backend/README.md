# Verqo Backend API

API backend pour Verqo, un SaaS d'automatisation de tests développé avec NestJS.

## 🚀 Fonctionnalités

- ✅ **Authentification complète** : Inscription, connexion, refresh tokens
- ✅ **Gestion des utilisateurs** : CRUD avec contrôle des rôles
- ✅ **Gestion des projets** : Création, modification, assignation développeurs
- ✅ **Liens externes** : URLs GitHub et staging par projet
- ✅ **Sécurité** : JWT, bcrypt, validation des données
- ✅ **Rôles utilisateur** : ADMIN, DEV, CLIENT avec permissions
- ✅ **Tests** : Tests unitaires et end-to-end
- ✅ **Documentation** : API complètement documentée

## 🛠 Stack Technique

- **Framework** : NestJS
- **Base de données** : PostgreSQL
- **ORM** : Prisma
- **Authentification** : JWT + Refresh Tokens
- **Validation** : class-validator
- **Tests** : Jest
- **Sécurité** : bcrypt

## 🏗 Architecture

```
src/
├── auth/                   # Module d'authentification
│   ├── controllers/        # Contrôleurs auth
│   ├── services/          # Services auth
│   ├── guards/            # Guards JWT/Local
│   ├── strategies/        # Stratégies Passport
│   └── dto/               # DTOs de validation
├── user/                  # Module utilisateur
│   ├── controllers/       # Contrôleurs user
│   ├── services/         # Services user
│   └── dto/              # DTOs user
├── project/              # Module projets
│   ├── controllers/      # Contrôleurs projets
│   ├── services/         # Services projets
│   └── dto/              # DTOs projets
├── common/               # Composants partagés
│   ├── decorators/       # Décorateurs personnalisés
│   └── guards/           # Guards communs
├── config/               # Configuration
└── database/             # Service Prisma
```

## 🚀 Démarrage Rapide

### 1. Prérequis

- Node.js 18+
- PostgreSQL
- npm ou yarn

### 2. Installation

```bash
# Cloner le projet
git clone <repository-url>
cd verqo/backend

# Installer les dépendances
npm install
```

### 3. Configuration

Créer un fichier `.env` :

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/verqo_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-in-production"
JWT_EXPIRATION_TIME="15m"
JWT_REFRESH_EXPIRATION_TIME="7d"

# App
PORT=3000
NODE_ENV=development
```

### 4. Base de données

```bash
# Démarrer PostgreSQL avec Docker
docker-compose up -d postgres

# Générer le client Prisma
npm run prisma:generate

# Créer la base de données
npm run db:push

# Seeder avec des données de test
npm run db:seed
```

### 5. Démarrage

```bash
# Mode développement
npm run start:dev

# L'API sera disponible sur http://localhost:3000
```

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📚 Documentation API

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Documentation complète de l'authentification et des utilisateurs
- [PROJECT_API_DOCUMENTATION.md](./PROJECT_API_DOCUMENTATION.md) - Documentation complète des projets

### Comptes de test

Après le seeding, vous pouvez utiliser ces comptes :

- **Admin** : `admin@verqo.com` / `admin123`
- **Dev** : `dev@verqo.com` / `dev123`
- **Client** : `client@verqo.com` / `client123`

## 🔐 Endpoints Principaux

### Authentification
- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Déconnexion
- `GET /auth/me` - Profil utilisateur

### Gestion des utilisateurs
- `GET /users` - Liste des utilisateurs (ADMIN/DEV)
- `GET /users/:id` - Détails utilisateur (ADMIN/DEV)
- `PUT /users/:id` - Modifier utilisateur
- `DELETE /users/:id` - Supprimer utilisateur (ADMIN/DEV)
- `PATCH /users/:id/toggle-status` - Activer/désactiver (ADMIN/DEV)

### Gestion des projets
- `POST /projects` - Créer un projet (CLIENT/ADMIN)
- `GET /projects` - Liste des projets accessibles
- `GET /projects/:id` - Détails d'un projet
- `PUT /projects/:id` - Modifier un projet
- `DELETE /projects/:id` - Supprimer un projet (CLIENT/ADMIN)
- `POST /projects/:id/developers` - Assigner un développeur (CLIENT/ADMIN)
- `DELETE /projects/:id/developers/:userId` - Retirer un développeur (CLIENT/ADMIN)
- `GET /projects/:id/developers` - Liste des développeurs du projet
- `PATCH /projects/:id/urls` - Mettre à jour URLs GitHub/Staging

## 🔒 Sécurité

- **Hachage des mots de passe** : bcrypt avec 12 rounds
- **JWT sécurisés** : Access tokens courts (15min) + Refresh tokens longs (7j)
- **Validation stricte** : class-validator pour toutes les entrées
- **Contrôle d'accès** : Guards basés sur les rôles
- **Protection CORS** : Configuration sécurisée

## 🛠 Scripts Utiles

```bash
# Base de données
npm run db:studio          # Interface Prisma Studio
npm run db:reset           # Reset + seed
npm run db:dev             # Migration en dev

# Développement
npm run start:dev          # Mode watch
npm run lint               # Linting
npm run format             # Formatting

# Tests
npm run test:watch         # Tests en mode watch
npm run test:debug         # Debug des tests
```

## 📁 Structure des Données

### Modèle User
```typescript
{
  id: string
  email: string
  password: string (hashé)
  firstName?: string
  lastName?: string
  role: UserRole (ADMIN|DEV|CLIENT)
  isActive: boolean
  emailVerified: boolean
  createdAt: DateTime
  updatedAt: DateTime
  ownedProjects: Project[]
  developerProjects: ProjectDeveloper[]
}
```

### Modèle Project
```typescript
{
  id: string
  name: string
  description?: string
  githubUrl?: string
  stagingUrl?: string
  status: ProjectStatus (ACTIVE|PAUSED|COMPLETED|ARCHIVED)
  ownerId: string
  createdAt: DateTime
  updatedAt: DateTime
  owner: User
  developers: ProjectDeveloper[]
}
```

### Modèle ProjectDeveloper
```typescript
{
  id: string
  projectId: string
  userId: string
  assignedAt: DateTime
  project: Project
  user: User
}
```

### Modèle RefreshToken
```typescript
{
  id: string
  token: string
  userId: string
  expiresAt: DateTime
  createdAt: DateTime
}
```

## 🚀 Déploiement

1. **Variables d'environnement** : Configurer les variables de production
2. **Base de données** : `npm run db:deploy`
3. **Build** : `npm run build`
4. **Démarrage** : `npm run start:prod`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.