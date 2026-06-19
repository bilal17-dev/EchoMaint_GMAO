const db = require('../../database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = {

  findByEmail: async (email) => {
    // Ajoute .select('*') pour être sûr de récupérer TOUS les champs dont mot_de_passe
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
    // On s'assure que le mot de passe est bien présent
    if (!passwordSaisi) throw new Error("Le mot de passe est requis");
    
    const mot_de_passe_hash = await bcrypt.hash(passwordSaisi, 12);
    
    await db('users').insert({
      id,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      mot_de_passe: mot_de_passe_hash,
      role: data.role || 'client',
      id_client: data.id_client || null,
      langue: data.langue || 'fr',
      actif: true,
    });
    
    return User.findById(id);
  },

  // AJOUT UTILE : Mise à jour générique du profil
  update: async (id, data) => {
    // Si un nouveau mot de passe est fourni, on le re-hache
    if (data.password) {
      data.mot_de_passe = await bcrypt.hash(data.password, 12);
      delete data.password;
    }
    return db('users').where({ id }).update(data);
  },

  // AJOUT UTILE : Désactivation (Soft delete logique)
  toggleActif: async (id, etat) => {
    return db('users').where({ id }).update({ actif: etat });
  },

  verifierMotDePasse: async (motDePasseSaisi, hashEnBase) => { 
    console.log("Comparaison entre:", motDePasseSaisi, "et", hashEnBase);
    const resultat = await bcrypt.compare(motDePasseSaisi, hashEnBase);
    console.log("Résultat de bcrypt :", resultat);
    return resultat;
   
  }
};

module.exports = User;