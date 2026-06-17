require('dotenv').config();

module.exports = {
  // Configuration pour le développement local (XAMPP / MySQL)
  development: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST || '127.0.0.1',
      port:     process.env.DB_PORT || 3007, // Ton port MySQL local
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME
    },
    migrations: {
      directory: './database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './database/seeders'
    }
  },

  // Configuration pour la production (Hébergement en ligne)
  production: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL, // En ligne, on utilise souvent une URL globale
    migrations: {
      directory: './database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './database/seeders'
    }
  }
};