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

  // GET /api/v1/clients/:id
  show: async (req, res) => {
    try {
      const client = await Client.findById(req.params.id);
      if (!client) return res.status(404).json({ message: 'Client introuvable.' });
      return res.status(200).json({ data: client });
    } catch (error) {
      console.error('[ClientController.show]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération du client.' });
    }
  },

  // POST /api/v1/clients
  store: async (req, res) => {
    try {
      const { nom, adresse, telephone, email_contact } = req.body;
      if (!nom) return res.status(400).json({ message: 'Le nom du client est requis.' });
      const nouveauClient = await Client.create({ nom, adresse, telephone, email_contact });
      return res.status(201).json({ message: 'Client créé avec succès !', data: nouveauClient });
    } catch (error) {
      console.error('[ClientController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création du client.' });
    }
  },

  // PUT /api/v1/clients/:id
  update: async (req, res) => {
    try {
      const { nom, adresse, telephone, email_contact } = req.body;
      const champs = {};
      if (nom           !== undefined) champs.nom           = nom;
      if (adresse       !== undefined) champs.adresse       = adresse;
      if (telephone     !== undefined) champs.telephone     = telephone;
      if (email_contact !== undefined) champs.email_contact = email_contact;
      await Client.update(req.params.id, champs);
      const updated = await Client.findById(req.params.id);
      return res.status(200).json({ data: updated });
    } catch (error) {
      console.error('[ClientController.update]', error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du client.' });
    }
  },
};

module.exports = ClientController;