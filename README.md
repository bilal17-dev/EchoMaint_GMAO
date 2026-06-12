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
* `statut` : `Enum` (`a_planifier`, `planifie`, `en_cours`, `realise`, `annule`)
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



## Structure du token JWT

Après connexion, le serveur retourne un token contenant :

{
  "id": "uuid de l'utilisateur",
  "email": "email de l'utilisateur",
  "role": "admin | technicien | client"
}

Header Authorization attendu dans toutes les requêtes protégées :
Authorization: Bearer <token>
