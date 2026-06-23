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

  // PUT /utilisateurs/:id
  update: async (req, res) => {
    try {
      const { id } = req.params
      const { actif, nom, prenom, email, role } = req.body
      const champs = {}
      if (actif  !== undefined) champs.actif  = actif
      if (nom)                  champs.nom    = nom
      if (prenom)               champs.prenom = prenom
      if (email)                champs.email  = email
      if (role)                 champs.role   = role

      await User.update(id, champs)
      const updated = await User.findById(id)
      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('[UtilisateurController.update]', error)
      return res.status(500).json({ message: 'Erreur lors de la mise à jour.' })
    }
  }

}

module.exports = UtilisateurController