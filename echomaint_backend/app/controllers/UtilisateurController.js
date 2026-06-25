const User = require('../models/User');

const UtilisateurController = {

  // GET /utilisateurs — tous les utilisateurs (admin)
  index: async (req, res) => {
    try {
      const utilisateurs = await User.findAll()
      return res.status(200).json({ data: utilisateurs })
    } catch (error) {
      console.error('[UtilisateurController.index]', error)
      return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' })
    }
  },

  // GET /utilisateurs/techniciens
  getTechniciens: async (req, res) => {
    try {
      const techniciens = await User.findTechniciens()
      return res.status(200).json({ data: techniciens })
    } catch (error) {
      console.error('[UtilisateurController.getTechniciens]', error)
      return res.status(500).json({ message: 'Erreur lors de la récupération des techniciens.' })
    }
  },

  // POST /utilisateurs
  store: async (req, res) => {
    try {
      const { nom, prenom, email, password, role, id_client } = req.body
      if (!nom || !email || !password) {
        return res.status(400).json({ message: "Nom, email et mot de passe requis." })
      }
      const nouvel = await User.create({ nom, prenom, email, mot_de_passe: password, role: role || 'technicien', id_client: id_client || null })
      return res.status(201).json({ message: 'Utilisateur créé.', data: nouvel })
    } catch (error) {
      console.error('[UtilisateurController.store]', error)
      return res.status(500).json({ message: 'Erreur lors de la création.' })
    }
  },

  // Bug #3 — PUT /utilisateurs/:id/langue : modifiable par l'utilisateur lui-même ou un admin
  updateLangue: async (req, res) => {
    try {
      const { id } = req.params;
      const { langue } = req.body;

      if (!['fr', 'en'].includes(langue)) {
        return res.status(400).json({ code: 'INVALID_LANGUE', message: "La langue doit être 'fr' ou 'en'." });
      }

      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
      }

      await User.update(id, { langue });
      return res.status(200).json({ message: 'Langue mise à jour.', langue });
    } catch (error) {
      console.error('[UtilisateurController.updateLangue]', error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour de la langue.' });
    }
  },

  // PUT /utilisateurs/:id — modification complète par l'admin
  // Permet de changer : nom, prenom, email, role, actif
  update: async (req, res) => {
    try {
      const { id } = req.params
      const { actif, nom, prenom, email, role } = req.body

      // Validation du rôle si fourni — seules ces trois valeurs sont acceptées
      if (role !== undefined && !['admin', 'technicien', 'client'].includes(role)) {
        return res.status(400).json({
          code: 'INVALID_ROLE',
          message: "Le rôle doit être 'admin', 'technicien' ou 'client'.",
        })
      }

      // Protection : un admin ne peut pas changer son propre rôle
      // Cela évite qu'il se rétrograde accidentellement et perde ses droits.
      if (role !== undefined && req.user.id === id) {
        return res.status(403).json({
          code: 'SELF_ROLE_CHANGE',
          message: 'Vous ne pouvez pas modifier votre propre rôle.',
        })
      }

      // On ne met à jour que les champs présents dans la requête
      const champs = {}
      if (actif  !== undefined) champs.actif  = actif
      if (nom)                  champs.nom    = nom
      if (prenom)               champs.prenom = prenom
      if (email)                champs.email  = email
      if (role)                 champs.role   = role

      await User.update(id, champs)
      // On relit depuis la base pour retourner les données à jour (sans mot de passe)
      const updated = await User.findById(id)
      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('[UtilisateurController.update]', error)
      return res.status(500).json({ message: 'Erreur lors de la mise à jour.' })
    }
  },

  // PUT /utilisateurs/:id/statut — route dédiée pour activer ou désactiver un compte
  // Reçoit { actif: true } ou { actif: false }
  // Séparée de update() pour que le frontend puisse basculer le statut sans risquer
  // de toucher accidentellement au nom, email ou rôle.
  updateStatut: async (req, res) => {
    try {
      const { id } = req.params
      const { actif } = req.body

      // La valeur doit être explicitement un booléen JS (pas undefined, pas null)
      if (typeof actif !== 'boolean') {
        return res.status(400).json({
          message: "Le champ 'actif' est requis et doit être true ou false.",
        })
      }

      await User.update(id, { actif })
      const updated = await User.findById(id)
      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('[UtilisateurController.updateStatut]', error)
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du statut.' })
    }
  },

}

module.exports = UtilisateurController