const db = require('../../database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = {

  findByEmail: async (email) => {
    return db('users').select('*').where({ email }).first();
  },

  findById: async (id) => {
    return db('users').where({ id }).first();
  },

  findAll: async () => {
    return db('users').select('id', 'nom', 'prenom', 'email', 'role', 'id_client', 'langue', 'actif');
  },

  findTechniciens: async () => {
    return db('users').where({ role: 'technicien', actif: true })
      .select('id', 'nom', 'prenom', 'email');
  },

  create: async (data) => {
    const id = uuidv4();
    const passwordSaisi = data.password || data.mot_de_passe;
    if (!passwordSaisi) throw new Error("Le mot de passe est requis");
    
    const password_hash = await bcrypt.hash(passwordSaisi, 12);
    
    await db('users').insert({
      id,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      password_hash,          // ✅ corrigé (était mot_de_passe)
      role: data.role || 'client',
      id_client: data.id_client || null,
      langue: data.langue || 'fr',
      actif: true,
    });
    
    return User.findById(id);
  },

  update: async (id, data) => {
    if (data.password) {
      data.password_hash = await bcrypt.hash(data.password, 12);  // ✅ corrigé
      delete data.password;
    }
    return db('users').where({ id }).update(data);
  },

  toggleActif: async (id, etat) => {
    return db('users').where({ id }).update({ actif: etat });
  },

  verifierMotDePasse: async (motDePasseSaisi, hashEnBase) => {
    return await bcrypt.compare(motDePasseSaisi, hashEnBase);
  }
};

module.exports = User;