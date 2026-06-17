const knex = require('knex');
const config = require('../knexfile');

// Initialisation de l'instance Knex avec la configuration de développement
const db = knex(config.development);

// Export de l'instance unique pour tout le projet
module.exports = db;