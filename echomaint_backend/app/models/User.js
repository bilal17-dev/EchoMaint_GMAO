const db = require('../../database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = {

  // Trouver un utilisateur par son email (Utile pour le Login)
  findByEmail: async (email) => {
    return db('users').where({ email }).first();
  },

  // Trouver un utilisateur par son id
  findById: async (id) => {
    return db('users').where({ id }).first();
  },

  // Récupérer tous les utilisateurs (avec l'id_client pour la cohérence globale)
  findAll: async () => {
    return db('users').select('id', 'nom', 'prenom', 'email', 'role', 'id_client', 'langue', 'actif');
  },

  // Récupérer uniquement les techniciens actifs (indispensable pour assigner des interventions !)
  findTechniciens: async () => {
    return db('users').where({ role: 'technicien', actif: true })
      .select('id', 'nom', 'prenom', 'email');
  },

  // Créer un nouvel utilisateur avec cryptage du mot de passe
  create: async (data) => {
    const id = uuidv4();
    
    // On extrait le mot de passe peu importe comment il est écrit depuis le front
    const passwordSaisi = data.password || data.mot_de_passe;
    const mot_de_passe_hash = await bcrypt.hash(passwordSaisi, 12);
    
    await db('users').insert({
      id,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      mot_de_passe: mot_de_passe_hash, // CORRIGÉ : correspond exactement à ton script de migration
      role: data.role,
      id_client: data.id_client || null, // COHÉRENCE : s'associe proprement à ta nouvelle table clients
      langue: data.langue || 'fr',
      actif: true,
    });
    
    return User.findById(id);
  },

  // Vérifier le mot de passe lors de la connexion
  verifierMotDePasse: async (motDePasseSaisi, hashEnBase) => {
    return bcrypt.compare(motDePasseSaisi, hashEnBase);
  },

  // Mettre à jour la langue d'un utilisateur
  updateLangue: async (id, langue) => {
    return db('users').where({ id }).update({ langue });
  },
};

module.exports = User;