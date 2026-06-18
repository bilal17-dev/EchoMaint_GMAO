const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Client = {

  // Récupérer tous les clients
  findAll: async () => {
    return db('clients').select('id', 'nom', 'email', 'telephone', 'adresse', 'created_at');
  },

  // Trouver un client par son identifiant unique (UUID)
  findById: async (id) => {
    return db('clients').where({ id }).first();
  },

  // Créer un nouveau client professionnel
  create: async (data) => {
    const id = uuidv4();
    
    await db('clients').insert({
      id,
      nom: data.nom,
      email: data.email || null,
      telephone: data.telephone || null,
      adresse: data.adresse || null,
      // Si tu as d'autres champs spécifiques dans ta migration clients, ajoute-les ici
    });
    
    return Client.findById(id);
  },

  // Mettre à jour les informations d'un client
  update: async (id, data) => {
    await db('clients').where({ id }).update({
      nom: data.nom,
      email: data.email,
      telephone: data.telephone,
      adresse: data.adresse,
      updated_at: db.fn.now() // Force la mise à jour du timestamp si présent
    });
    
    return Client.findById(id);
  },

  // Supprimer un client (Attention aux contraintes ON DELETE sur les utilisateurs associés !)
  delete: async (id) => {
    return db('clients').where({ id }).delete();
  },
};

module.exports = Client;