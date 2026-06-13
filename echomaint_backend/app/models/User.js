// 1. On importe la bibliothèque knex
const knex = require('knex');

// 2. On remonte de deux dossiers pour atteindre la racine et récupérer le knexfile
const config = require('../../knexfile');

// 3. On initialise l'instance de connexion pour l'environnement de développement
const db = knex(config.development);

class User {
  // Trouver un utilisateur par son email (Utile pour le Login et éviter les doublons)
  static async findByEmail(email) {
    return db('users').where({ email }).first();
  }

  // Créer un nouvel utilisateur en base (Pour l'inscription / Register)
  static async create(userData) {
    return db('users').insert(userData);
  }

  // Trouver un utilisateur par son identifiant unique (UUID)
  static async findById(id) {
    return db('users').where({ id }).first();
  }
}

module.exports = User;