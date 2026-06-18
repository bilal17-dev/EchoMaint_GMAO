const Batiment = require('../models/Batiment');
const Client = require('../models/Client');

const BatimentController = {

  // GET /api/v1/batiments — Liste tous les bâtiments (Sécurisée selon le rôle RG-06)
  index: async (req, res) => {
    try {
      // req.user provient de ton middleware d'authentification (JWT)
      const { role, id_client } = req.user; 
      const filters = { client_id: req.query.client_id };

      // On passe le rôle et l'id_client de la session au modèle pour filtrer à la source
      const batiments = await Batiment.findAll(role, id_client, filters);
      
      return res.status(200).json({ data: batiments });
    } catch (error) {
      console.error('[BatimentController.index]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des bâtiments.' });
    }
  },

  // GET /api/v1/batiments/:id — Détail d'un bâtiment (Vérification stricte des droits)
  show: async (req, res) => {
    try {
      const { role, id_client } = req.user;

      const batiment = await Batiment.findById(req.params.id);
      if (!batiment) {
        return res.status(404).json({ message: 'Bâtiment introuvable.' });
      }
      
      // SÉCURITÉ : Un client ne peut pas tricher dans l'URL pour voir le bâtiment d'un autre
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
      const { nom, adresse, client_id } = req.body;

      if (!nom || !client_id) {
        return res.status(400).json({ message: 'Le nom et le client_id sont obligatoires.' });
      }

      // Vérifier de manière sécurisée que le client cible existe bien en base
      const client = await Client.findById(client_id);
      if (!client) {
        return res.status(404).json({ message: 'Client introuvable.' });
      }

      const batiment = await Batiment.create({ nom, adresse, client_id });
      return res.status(201).json({ data: batiment, message: 'Bâtiment créé avec succès !' });
    } catch (error) {
      console.error('[BatimentController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création du bâtiment.' });
    }
  },

  // PUT /api/v1/batiments/:id — Modifier un bâtiment
  update: async (req, res) => {
    try {
      const { nom, adresse, client_id } = req.body;

      const batiment = await Batiment.findById(req.params.id);
      if (!batiment) {
        return res.status(404).json({ message: 'Bâtiment introuvable.' });
      }

      // Si on change le client associé, on s'assure qu'il existe
      if (client_id) {
        const client = await Client.findById(client_id);
        if (!client) return res.status(404).json({ message: 'Le nouveau client spécifié est introuvable.' });
      }

      const updated = await Batiment.update(req.params.id, { nom, adresse, client_id });
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

      // SÉCURITÉ GMAO (RG-REF-03) : Impossible de supprimer si le bâtiment contient des équipements
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