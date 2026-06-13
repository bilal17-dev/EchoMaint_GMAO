 const Batiment = require('../models/Batiment');

class BatimentController {
  
  // 1. LIRE TOUS LES BÂTIMENTS
  static async index(req, res) {
    try {
      const { role, id } = req.user; 
      const batiments = await Batiment.getAll(role, id);
      return res.status(200).json(batiments);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur récupération bâtiments : ' + error.message });
    }
  }

  // 2. LIRE UN BÂTIMENT PRÉCIS
  static async show(req, res) {
    try {
      const batiment = await Batiment.getById(req.params.id);
      if (!batiment) {
        return res.status(404).json({ error: 'Bâtiment non trouvé.' });
      }
      
      // Sécurité : Un client ne peut pas tricher dans l'URL pour voir le bâtiment d'un autre
      if (req.user.role === 'client' && batiment.client_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès interdit à ce bâtiment.' });
      }

      return res.status(200).json(batiment);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur récupération bâtiment : ' + error.message });
    }
  }

  // 3. CRÉER UN BÂTIMENT
  static async store(req, res) {
    try {
      const { nom, adresse, client_id } = req.body;
      await Batiment.create({ nom, adresse, client_id });
      return res.status(201).json({ message: 'Bâtiment créé avec succès !' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur création bâtiment : ' + error.message });
    }
  }

  // 4. MODIFIER UN BÂTIMENT
  static async update(req, res) {
    try {
      const { nom, adresse, client_id } = req.body;
      const affectedRows = await Batiment.update(req.params.id, { nom, adresse, client_id });
      
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Bâtiment non trouvé.' });
      }
      return res.status(200).json({ message: 'Bâtiment mis à jour avec succès !' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur modification bâtiment : ' + error.message });
    }
  }

  // 5. SUPPRIMER UN BÂTIMENT
  static async destroy(req, res) {
    try {
      const affectedRows = await Batiment.delete(req.params.id);
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Bâtiment non trouvé.' });
      }
      return res.status(200).json({ message: 'Bâtiment supprimé avec succès !' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur suppression bâtiment : ' + error.message });
    }
  }
}

module.exports = BatimentController;
