const User = require('../models/User');

const UtilisateurController = {
  store: async (req, res) => {
    try {
      const { nom, prenom, email, mot_de_passe, role, id_client } = req.body;
      
      // Validation simple
      if (!nom || !email || !mot_de_passe) {
        return res.status(400).json({ message: "Nom, email et mot de passe requis." });
      }

      const nouvelUtilisateur = await User.create({ 
        nom, prenom, email, mot_de_passe, role, id_client 
      });

      return res.status(201).json({ 
        message: 'Utilisateur/Technicien créé avec succès', 
        data: nouvelUtilisateur 
      });
    } catch (error) {
      console.error('[UtilisateurController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création en base.' });
    }
  }
};

module.exports = UtilisateurController;