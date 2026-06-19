const Batiment = require('../models/Batiment');
const Client = require('../models/Client');

const BatimentController = {

  // GET /api/v1/batiments — Liste tous les bâtiments
  index: async (req, res) => {
    try {
      const { role, id_client } = req.user; 
      const filters = { client_id: req.query.client_id };

      const batiments = await Batiment.findAll(role, id_client, filters);
      
      return res.status(200).json({ data: batiments });
    } catch (error) {
      console.error('[BatimentController.index]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des bâtiments.' });
    }
  },

  // GET /api/v1/batiments/:id — Détail d'un bâtiment
  show: async (req, res) => {
    try {
      const { role, id_client } = req.user;

      const batiment = await Batiment.findById(req.params.id);
      if (!batiment) {
        return res.status(404).json({ message: 'Bâtiment introuvable.' });
      }
      
      // SÉCURITÉ : Un client ne peut pas voir le bâtiment d'un autre
      if (role === 'client' && batiment.client_id !== id_client) {
        return res.status(403).json({ message: 'Accès interdit à ces installations.' });
      }

      return res.status(200).json({ data: batiment });
    } catch (error) {
      console.error('[BatimentController.show]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du bâtiment.' });
    }
  },

  // POST /api/v1/batiments — Créer un bâtiment
  store: async (req, res) => {
    try {
      const { nom, client_id } = req.body;

      if (!nom || !client_id) {
        return res.status(400).json({ message: 'Le nom et le client_id sont obligatoires.' });
      }

      const client = await Client.findById(client_id);
      if (!client) {
        return res.status(404).json({ message: 'Client introuvable.' });
      }

      // On passe tout le body (nom, adresse, ville, description, client_id)
      const batiment = await Batiment.create(req.body);
      return res.status(201).json({ data: batiment, message: 'Bâtiment créé avec succès !' });
    } catch (error) {
      console.error('[BatimentController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création du bâtiment.' });
    }
  },

  // PUT /api/v1/batiments/:id — Modifier un bâtiment
  update: async (req, res) => {
    try {
      const { client_id } = req.body;

      const batiment = await Batiment.findById(req.params.id);
      if (!batiment) {
        return res.status(404).json({ message: 'Bâtiment introuvable.' });
      }

      if (client_id) {
        const client = await Client.findById(client_id);
        if (!client) return res.status(404).json({ message: 'Le nouveau client spécifié est introuvable.' });
      }

      // Transmission directe du body au modèle (gère dynamiquement ville, description, etc.)
      const updated = await Batiment.update(req.params.id, req.body);
      return res.status(200).json({ data: updated, message: 'Bâtiment mis à jour avec succès !' });
    } catch (error) {
      console.error('[BatimentController.update]', error);
      return res.status(500).json({ message: 'Erreur lors de la modification du bâtiment.' });
    }
  },

  // DELETE /api/v1/batiments/:id — Supprimer un bâtiment
  destroy: async (req, res) => {
    try {
      const batiment = await Batiment.findById(req.params.id);
      if (!batiment) {
        return res.status(404).json({ message: 'Bâtiment introuvable.' });
      }

      const hasEquipements = await Batiment.hasEquipementsActifs(req.params.id);
      if (hasEquipements) {
        return res.status(422).json({
          message: 'Impossible de supprimer ce bâtiment car il héberge encore des équipements actifs ou en panne.'
        });
      }

      await Batiment.delete(req.params.id);
      return res.status(200).json({ message: 'Bâtiment supprimé avec succès !' });
    } catch (error) {
      console.error('[BatimentController.destroy]', error);
      return res.status(500).json({ message: 'Erreur lors de la suppression du bâtiment.' });
    }
  },
};

module.exports = BatimentController;