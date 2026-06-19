const Client = require('../models/Client');

const ClientController = {
  // GET /api/v1/clients
  index: async (req, res) => {
    try {
      const clients = await Client.findAll();
      return res.status(200).json({ data: clients });
    } catch (error) {
      console.error('[ClientController.index]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des clients.' });
    }
  },

  // POST /api/v1/clients
  store: async (req, res) => {
    try {
      // On ne récupère que les champs qui existent dans ta base de données
      const { nom, adresse, telephone } = req.body;
      
      if (!nom) {
        return res.status(400).json({ message: 'Le nom du client est requis.' });
      }

      // On transmet un objet propre contenant uniquement les colonnes valides
      const nouveauClient = await Client.create({ 
        nom, 
        adresse, 
        telephone 
      });
      
      return res.status(201).json({ 
        message: 'Client créé avec succès !', 
        data: nouveauClient 
      });
    } catch (error) {
      console.error('[ClientController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création du client.' });
    }
  }
};

module.exports = ClientController;