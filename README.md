# EchoMaint — Plateforme de GMAO (MVP)

## 1. Présentation Générale
**EchoMaint** est une plateforme de Gestion de Maintenance Assistée par Ordinateur (**GMAO**) développée sous forme de Produit Minimum Viable (**MVP**). Elle est conçue pour centraliser le référentiel immobilier, le suivi du parc d'équipements et l'automatisation de la planification des interventions de maintenance (préventive et curative).

### Acteurs du Système
L'application interagit avec quatre profils distincts :
* **Administrateur** : Supervise le système, gère les utilisateurs, le référentiel et consulte le tableau de bord des indicateurs (KPI).
* **Technicien** : Intervenant terrain qui consulte son planning, exécute les ordres de travail et téléverse les clichés justificatifs.
* **Client** : Propriétaire ou déclarant qui signale les pannes sur ses équipements et suit en temps réel l'avancement des résolutions.
* **Système** : Script automatisé responsable de la génération récurrente des tâches de maintenance préventive.

---

## 2. Architecture de la Base de Données (MySQL)
Le modèle de données répond strictement aux règles de gestion métiers (RG-01 à RG-07). L'implémentation repose sur des identifiants uniques universels (**UUID**) pour toutes les clés primaires afin de garantir la robustesse de l'architecture.

### Dictionnaire des Tables

#### 1. Table `users`
Stocke les profils de l'ensemble des acteurs.
* `id` : `UUID` (Clé Primaire)
* `nom` & `prenom` : `String`
* `email` : `String` (Unique, utilisé pour l'authentification)
* `mot_de_passe` : `String` (Haché via *bcrypt*)
* `role` : `Enum` (`admin`, `technicien`, `client`)

#### 2. Table `batiments`
Représente les structures physiques hébergeant les équipements.
* `id` : `UUID` (Clé Primaire)
* `nom` : `String`
* `adresse` : `String`
* `client_id` : `UUID` (Clé Étrangère pointant vers `users.id` — Restreint l'accès aux clients rattachés)

#### 3. Table `equipements`
Désigne les machines matérielles nécessitant un suivi ou faisant l'objet de pannes.
* `id` : `UUID` (Clé Primaire)
* `code_inventaire` : `String` (Unique par équipement — règle **RG-01**)
* `nom` : `String`
* `categorie` : `Enum` (`technique`, `informatique`, `autre`)
* `batiment_id` : `UUID` (Clé Étrangère pointant vers `batiments.id`)
* `date_acquisition` : `Date`
* `statut` : `Enum` (`en_service`, `en_panne`, `en_maintenance`, `hors_service`)
* `periodicite_preventive_jours` : `Integer` (Fréquence pour le calcul automatique des révisions)

#### 4. Table `interventions`
Centralise l'ensemble des tickets de maintenance.
* `id` : `UUID` (Clé Primaire)
* `equipement_id` : `UUID` (Clé Étrangère pointant vers `equipements.id`)
* `type` : `Enum` (`preventive`, `curative`)
* `priorite` : `Enum` (`basse`, `moyenne`, `haute`)
* **statut** : `Enum` (`'ouverte'`, `'assignee'`, `'en_cours'`, `'cloturee'`)
* `technicien_id` : `UUID` (Clé Étrangère pointant vers `users.id`, nullable)
* `description` : `Text`
* `date_planifiee` : `DateTime`
* `date_cloture` : `DateTime` (Obligatoire pour le calcul du MTTR lors de la clôture)

#### 5. Table `photo_interventions`
Contient les fichiers images téléversés par les techniciens pour attester de l'état des équipements.
* `id` : `UUID` (Clé Primaire)
* `url` : `String` (Chemin du stockage de l'image)
* `type_cliche` : `Enum` (`avant`, `apres`)
* `intervention_id` : `UUID` (Clé Étrangère pointant vers `interventions.id`)

---
##  Installation Rapide (Backend)

Suivez ces étapes pour installer et lancer le projet localement après avoir récupéré la dernière version du code :

```bash
# 1. Allez dans le dossier du backend
cd echomaint_backend

# 2. Installez l'ensemble des dépendances (Express, JWT, Knex, MySQL2, etc.)
npm install

# 3. Configurez vos variables d'environnement locales
cp .env.example .env

# 4. Appliquez la structure de la base de données sur XAMPP
npx knex migrate:latest --knexfile knexfile.js

# 5. Lancez le serveur de développement
npm start
## TRAVAIL EFFECTUE DURANT LE JOUR 1
## 3. Structure des Fichiers de la Base de Données et des Migrations
La gestion des structures de données utilise Knex.js pour tracer historiquement les évolutions de la base de données.

```text
├── database/
│   ├── connection.js              # Instance globale de connexion Knex (MySQL)
│   ├── migrations/                # Fichiers de structure ordonnés de la base
│   │   ├── 001_create_users.js
│   │   ├── 002_create_batiments.js
│   │   ├── 003_create_equipements.js
│   │   ├── 004_create_interventions.js
│   │   └── 005_create_photo_interventions.js
│   └── seeders/                   # Jeux de données pour les phases de tests
│       ├── users.seeder.js
│       └── demo.seeder.js
├── knexfile.js                    # Fichier central de configuration Knex
└── package.json                   # Dépendances du projet backend
```
---

### Infrastructure & Securite  (Auth, roles, jobs, config, deploiement)

**Taches** 

- Mise en place de l'authentification JWT
- Contrôle d'accès par rôle (admin, technicien, client)
- Configuration des variables d'environnement
- Validation des données entrantes
- Génération automatique des interventions préventives (cron job)
- Stockage des photos
- Documentation technique et déploiement

---

**Ce qui a été réalisé (Jour 1)**

## Installation

```bash

# Installer les dépendances
npm install

# 4. Créer le fichier .env
cp .env.example .env

# 5. Remplir les valeurs dans .env

# 6. Lancer le serveur
node server.js
```

---

## Dépendances utilisées

| Package | Version | Rôle |
|---------|---------|------|
| express | latest | Framework serveur HTTP |
| jsonwebtoken | latest | Création et vérification JWT |
| bcryptjs | latest | Hashage des mots de passe |
| dotenv | latest | Lecture du fichier .env |
| cors | latest | Autoriser les requêtes du frontend |
| node-cron | latest | Planification des tâches automatiques |

```bash
npm install express jsonwebtoken bcryptjs dotenv cors node-cron
```

### 1. Configuration de l'environnement

**Fichier : `.env`**

Contient toutes les variables sensibles du projet :
- PORT : port sur lequel tourne le serveur (3000)
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME : connexion MySQL
- JWT_SECRET : clé secrète pour signer les tokens JWT
- JWT_EXPIRY : durée de validité d'un token (24h)
- STORAGE_PATH : chemin de stockage des photos uploadées

### 2. Configuration Git

**Fichier : `.gitignore`**

Fichiers exclus du dépôt Git :
- `.env` — contient des secrets
- `node_modules/` — dépendances trop lourdes
- `storage/photos/` — fichiers générés par les utilisateurs
- `.DS_Store`, `Thumbs.db` — fichiers système

---

### 3. Point d'entrée du serveur

**Fichier : `server.js`**

Point d'entrée principal de l'application backend.

Ce qu'il fait :
- Charge les variables d'environnement via dotenv
- Initialise Express et CORS
- Lance le cron job des interventions préventives au démarrage
- Définit les routes de l'API (commentées jusqu'à ce que Dev 1 les finalise)
- Démarre le serveur sur le port défini dans `.env`

Pour lancer le serveur :
```bash
node server.js
```

---

### 4. Middlewares d'authentification et de contrôle d'accès

Les middlewares s'exécutent entre la requête de l'utilisateur
et le controller. Ils protègent les routes selon le rôle.

**Fichier : `app/middlewares/auth.js`**

Vérifie que chaque requête contient un token JWT valide.

Fonctionnement :
1. Lit le header `Authorization` de la requête
2. Extrait le token après le mot "Bearer"
3. Vérifie le token avec `JWT_SECRET`
4. Injecte les données de l'utilisateur dans `req.user`
5. Passe au controller si tout est valide

Structure de `req.user` après vérification :
```json
{
  "id": "uuid de l'utilisateur",
  "email": "email de l'utilisateur",
  "role": "admin | technicien | client"
}
```

Codes d'erreur retournés :
- `401` : aucun token, format invalide ou token expiré

---

**Fichier : `app/middlewares/isAdmin.js`**

Vérifie que l'utilisateur connecté a le rôle `admin`.
S'utilise toujours après `auth.js`.

Codes d'erreur retournés :
- `401` : utilisateur non authentifié
- `403` : utilisateur connecté mais rôle insuffisant

---

**Fichier : `app/middlewares/isTechnicien.js`**

Autorise les utilisateurs avec le rôle `technicien` ou `admin`.
Un administrateur peut toujours faire ce qu'un technicien fait.
S'utilise toujours après `auth.js`.

Codes d'erreur retournés :
- `401` : utilisateur non authentifié
- `403` : rôle insuffisant

---

**Fichier : `app/middlewares/isClient.js`**

Autorise uniquement les utilisateurs avec le rôle `client`.
Accès en lecture seule aux équipements de leurs bâtiments (RG-06).
S'utilise toujours après `auth.js`.

Codes d'erreur retournés :
- `401` : utilisateur non authentifié
- `403` : rôle insuffisant

---

**Comment utiliser ces middlewares sur ses routes :**

```javascript
const auth         = require('../middlewares/auth');
const isAdmin      = require('../middlewares/isAdmin');
const isTechnicien = require('../middlewares/isTechnicien');

// Route accessible uniquement aux admins
router.get('/utilisateurs', auth, isAdmin, controller.listerUtilisateurs);

// Route accessible aux techniciens et admins
router.patch('/interventions/:id/statut', auth, isTechnicien, controller.changerStatut);

// Route accessible à tous les utilisateurs connectés
router.get('/equipements', auth, controller.listerEquipements);
```

---

### 5. Validators de données

Les validators vérifient que les données reçues dans les requêtes
sont correctes avant qu'elles atteignent le controller.
Ils s'utilisent comme middlewares sur les routes POST et PUT.

**Fichier : `app/validators/batiment.validator.js`**

Valide les données pour créer ou modifier un bâtiment.

Champs vérifiés :
- `nom` : obligatoire, entre 2 et 150 caractères
- `adresse` : obligatoire, entre 5 et 255 caractères
- `client_id` : obligatoire, doit être un UUID valide

En cas d'erreur, retourne :
```json
{
  "message": "Données invalides pour le bâtiment.",
  "erreurs": ["Le nom du bâtiment est obligatoire.", "..."]
}
```

---

**Fichier : `app/validators/equipement.validator.js`**

Valide les données pour créer ou modifier un équipement.

Champs vérifiés :
- `code_inventaire` : obligatoire, max 100 caractères (RG-01)
- `nom` : obligatoire, max 150 caractères
- `categorie` : doit être `technique`, `informatique` ou `autre`
- `batiment_id` : obligatoire, doit être un UUID valide
- `date_acquisition` : obligatoire, doit être une date valide
- `statut` : doit être `en_service`, `en_panne`,
  `en_maintenance` ou `hors_service`
- `periodicite_preventive_jours` : entier positif obligatoire

En cas d'erreur, retourne :
```json
{
  "message": "Données invalides pour l'équipement.",
  "erreurs": ["Le code inventaire est obligatoire.", "..."]
}
```

---

**Comment utiliser ces validators sur ses routes :**

```javascript
const validerBatiment   = require('../validators/batiment.validator');
const validerEquipement = require('../validators/equipement.validator');

// Le validator s'exécute avant le controller
router.post('/batiments',   auth, isAdmin, validerBatiment,   BatimentController.creer);
router.post('/equipements', auth, isAdmin, validerEquipement, EquipementController.creer);
```

---

### 6. Cron job — Génération automatique des interventions préventives

**Fichier : `jobs/preventive.job.js`**

Tâche automatique qui s'exécute tous les jours à minuit (00h00).

Fonctionnement :
1. Le planificateur se déclenche à minuit
2. Il charge `app/services/preventive.service.js` (Dev 1)
3. Il vérifie que la fonction `genererInterventionsPreventives` existe
4. Il l'appelle et log le nombre d'interventions créées

Règle appliquée : **RG-02**
Pour chaque équipement en service, si aucune intervention préventive
non clôturée n'existe et que la date de maintenance est dépassée,
une intervention est créée automatiquement.

Le cron job est conçu pour ne pas planter le serveur si
`preventive.service.js` n'est pas encore rempli par Dev 1.

Format cron utilisé : `0 0 * * *`
- `0` = minute 0
- `0` = heure 0 (minuit)
- `* * *` = tous les jours, tous les mois, toutes les semaines

---

## Structure des fichiers

echomaint_backend/

│

├── .env                          # Variables sensibles (jamais sur Git)

├── .env.example                  # Modèle de configuration à partager

├── .gitignore                    # Fichiers exclus de Git

├── server.js                     # Point d'entrée du serveur

├── package.json                  # Dépendances du projet

│

├── app/

│   ├── middlewares/

│   │   ├── auth.js               # Vérifie le token JWT

│   │   ├── isAdmin.js            # Vérifie le rôle admin

│   │   ├── isTechnicien.js       # Vérifie le rôle technicien ou admin

│   │   └── isClient.js           # Vérifie le rôle client

│   │

│   └── validators/

│       ├── batiment.validator.js  # Valide les données d'un bâtiment

│       └── equipement.validator.js # Valide les données d'un équipement

│

├── jobs/

│   └── preventive.job.js         # Cron job — génération automatique

│                                   des interventions préventives

│

└── storage/

└── photos/                   # Dossier de stockage des photos uploadées

---

## Structure du token JWT

Après connexion, le serveur retourne un token contenant :

{
  "id": "uuid de l'utilisateur",
  "email": "email de l'utilisateur",
  "role": "admin | technicien | client",
  "langue": "fr | en"
}

Header Authorization attendu dans toutes les requêtes protégées :
Authorization: Bearer <token>

---
## Informations pour l'équipe

**Pour Dev 1 :**
- Utilise `auth`, `isAdmin`, `isTechnicien`, `isClient`
  comme middlewares sur tes routes
- Utilise `validerBatiment` et `validerEquipement`
  sur tes routes POST et PUT
- Le champ du rôle dans `req.user` est : `req.user.role`
- Remplis `app/services/preventive.service.js` avec la fonction
  `genererInterventionsPreventives()` qui retourne `{ nombreCreees }`

**Pour Dev 2 :**
- Le header Authorization attendu est : `Authorization: Bearer <token>`
- Le token est retourné dans le corps de la réponse après `/auth/login`
- L'URL de base de l'API est définie dans ton `.env` :
  `VITE_API_URL=http://localhost:3000`

---



