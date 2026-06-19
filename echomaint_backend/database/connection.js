const knex = require('knex');
const config = require('../knexfile');

// Utilise NODE_ENV (dev ou prod), par défaut sur 'development'
const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

module.exports = db;