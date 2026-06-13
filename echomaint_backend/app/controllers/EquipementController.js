 const Equipement = require('../models/Equipement');

class EquipementController {
  
  // 1. LISTER TOUS LES ÉQUIPEMENTS
  static async index(req, res) {
    try {
      const { role, id } = req.user;
      const equipements = await Equipement.getAll(role, id);
      return res.status(200).json(equipements);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur récupération équipements : ' + error.message });
    }
  }

  // 2. FICHE DÉTAILLÉE D'UN ÉQUIPEMENT
  static async show(req, res) {
    try {
      const equipement = await Equipement.getById(req.params.id);
      if (!equipement) {
        return res.status(404).json({ error: 'Équipement non trouvé.' });
      }

      // Restriction de sécurité pour le profil Client
      if (req.user.role === 'client' && equipement.client_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès interdit à cet équipement.' });
      }

      return res.status(200).json(equipement);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur récupération détail équipement : ' + error.message });
    }
  }

  // 3. CRÉER UN ÉQUIPEMENT
  static async store(req, res) {
    try {
      await Equipement.create(req.body);
      return res.status(201).json({ message: 'Équipement créé avec succès !' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur création équipement : ' + error.message });
    }
  }

  // 4. MODIFIER / GESTION DES STATUTS D'UN ÉQUIPEMENT
  static async update(req, res) {
    try {
      const affectedRows = await Equipement.update(req.params.id, req.body);
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Équipement non trouvé.' });
      }
      return res.status(200).json({ message: 'Équipement/Statut mis à jour avec succès !' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur modification équipement : ' + error.message });
    }
  }

  // 5. SUPPRIMER UN ÉQUIPEMENT
  static async destroy(req, res) {
    try {
      const affectedRows = await Equipement.delete(req.params.id);
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Équipement non trouvé.' });
      }
      return res.status(200).json({ message: 'Équipement supprimé avec succès !' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur suppression équipement : ' + error.message });
    }
  }
}

module.exports = EquipementController;
