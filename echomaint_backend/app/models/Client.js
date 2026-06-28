const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Client = {

  findAll: async () => {
    return db('clients').select('id', 'nom', 'email_contact', 'adresse', 'telephone', 'created_at');
  },

  findById: async (id) => {
    return db('clients').where({ id }).first();
  },

  create: async (data) => {
    const id = uuidv4();
    await db('clients').insert({
      id,
      nom: data.nom,
      email_contact: data.email_contact || null,
      adresse: data.adresse || null,
      telephone: data.telephone || null
    });
    return Client.findById(id);
  },

  update: async (id, data) => {
    const champs = { updated_at: db.fn.now() };
    if (data.nom           !== undefined) champs.nom           = data.nom;
    if (data.email_contact !== undefined) champs.email_contact = data.email_contact || null;
    if (data.adresse       !== undefined) champs.adresse       = data.adresse       || null;
    if (data.telephone     !== undefined) champs.telephone     = data.telephone     || null;
    await db('clients').where({ id }).update(champs);
    return Client.findById(id);
  },

  delete: async (id) => {
    return db('clients').where({ id }).delete();
  },
};

module.exports = Client;