const Batiment = require('../models/Batiment');
const Client = require('../models/Client');

const BatimentController = {
  index: async (req, res) => {
    try {
      const { role, id_client } = req.user; 
      const batiments = await Batiment.findAll(role, id_client, { client_id: req.query.client_id });
      return res.status(200).json({ data: batiments });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  },

  store: async (req, res) => {
    try {
      // Le validateur a déjà vérifié nom et client_id
      const client = await Client.findById(req.body.client_id);
      if (!client) return res.status(404).json({ message: 'Client introuvable.' });

      const batiment = await Batiment.create(req.body);
      return res.status(201).json({ data: batiment, message: 'Bâtiment créé !' });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors de la création.' });
    }
  },

  update: async (req, res) => {
    try {
      const batiment = await Batiment.findById(req.params.id);
      if (!batiment) return res.status(404).json({ message: 'Bâtiment introuvable.' });

      if (req.body.client_id) {
        const client = await Client.findById(req.body.client_id);
        if (!client) return res.status(404).json({ message: 'Nouveau client introuvable.' });
      }

      const updated = await Batiment.update(req.params.id, req.body);
      return res.status(200).json({ data: updated, message: 'Bâtiment mis à jour !' });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors de la modification.' });
    }
  },

  destroy: async (req, res) => {
    try {
      const batiment = await Batiment.findById(req.params.id);
      if (!batiment) return res.status(404).json({ message: 'Bâtiment introuvable.' });

      if (await Batiment.hasEquipementsActifs(req.params.id)) {
        return res.status(422).json({ message: 'Ce bâtiment contient des équipements actifs.' });
      }

      await Batiment.delete(req.params.id);
      return res.status(200).json({ message: 'Bâtiment supprimé !' });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors de la suppression.' });
    }
  }
};

module.exports = BatimentController;