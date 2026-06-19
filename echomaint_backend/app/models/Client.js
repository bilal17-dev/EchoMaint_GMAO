const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Client = {

  findAll: async () => {
    return db('clients').select('id', 'nom', 'adresse', 'telephone', 'created_at');
  },

  findById: async (id) => {
    return db('clients').where({ id }).first();
  },

create: async (data) => {
    const id = uuidv4();
    
    // On force la construction manuelle de l'insertion
    await db('clients').insert({
      id: id,
      nom: data.nom,
      adresse: data.adresse || null,
      telephone: data.telephone || null
    }).into('clients'); // Précision explicite de la table
    
    return Client.findById(id);
  },

  update: async (id, data) => {
    await db('clients').where({ id }).update({
      nom: data.nom,
      adresse: data.adresse,
      telephone: data.telephone,
      updated_at: db.fn.now()
    });
    
    return Client.findById(id);
  },

  delete: async (id) => {
    return db('clients').where({ id }).delete();
  },
};

module.exports = Client;