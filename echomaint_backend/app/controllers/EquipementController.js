const Equipement = require('../models/Equipement');
const db = require('../../database/connection');

const EquipementController = {
  index: async (req, res) => {
    try {
      const { role, id_client } = req.user;
      const equipements = await Equipement.findAll(role, id_client, req.query);
      return res.status(200).json({ data: equipements });
    } catch (error) {
      console.error('[EquipementController.index]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération.' });
    }
  },

  show: async (req, res) => {
    try {
      const { role, id_client } = req.user;
      const equipement = await Equipement.findById(req.params.id);

      // 404 : équipement inexistant ou soft-deleté
      if (!equipement) return res.status(404).json({ message: 'Équipement introuvable.' });

      // Contrôle d'accès pour le rôle "client" :
      // Equipement.findById expose désormais batiments.client_id as client_id.
      // Un client ne peut consulter que les équipements appartenant à ses propres bâtiments.
      if (role === 'client' && equipement.client_id !== id_client) {
        return res.status(403).json({ message: 'Accès non autorisé à cet équipement.' });
      }

      // Stats interventions calculées côté serveur pour alléger le frontend
      const stats30j = await db('interventions')
        .where({ equipement_id: req.params.id, statut: 'terminee' })
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
        .count('id as total').first();

      const derniere = await db('interventions')
        .where({ equipement_id: req.params.id }).whereNotIn('statut', ['annulee'])
        .orderBy('created_at', 'desc').select('created_at').first();

      return res.status(200).json({
        data: {
          ...equipement,
          nb_interventions_30j: parseInt(stats30j.total) || 0,
          derniere_intervention: derniere?.created_at || null
        }
      });
    } catch (error) {
      console.error('[EquipementController.show]', error);
      return res.status(500).json({ message: 'Erreur récupération.' });
    }
  },

  store: async (req, res) => {
    try {
      if (!req.body.nom || !req.body.batiment_id) 
        return res.status(400).json({ message: 'Nom et batiment_id obligatoires.' });

      const equipement = await Equipement.create(req.body);
      return res.status(201).json({ data: equipement, message: 'Créé avec succès !' });
    } catch (error) {
      console.error('[EquipementController.store]', error);
      return res.status(500).json({ message: 'Erreur création.' });
    }
  },

  update: async (req, res) => {
    try {
      const updated = await Equipement.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Introuvable.' });
      return res.status(200).json({ data: updated, message: 'Mis à jour !' });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur mise à jour.' });
    }
  },

  destroy: async (req, res) => {
    try {
      if (await Equipement.hasOTActifs(req.params.id)) 
        return res.status(422).json({ message: 'Impossible de supprimer : interventions en cours.' });
      
      await Equipement.delete(req.params.id);
      return res.status(200).json({ message: 'Archivé !' });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur suppression.' });
    }
  },

  historique: async (req, res) => {
    try {
      const { role, id_client } = req.user;

      // Contrôle d'accès identique à show() : un client ne peut consulter
      // l'historique que des équipements qui lui appartiennent.
      if (role === 'client') {
        const equipement = await Equipement.findById(req.params.id);
        if (!equipement) return res.status(404).json({ message: 'Équipement introuvable.' });
        if (equipement.client_id !== id_client) {
          return res.status(403).json({ message: 'Accès non autorisé à cet équipement.' });
        }
      }

      const interventions = await db('interventions')
        .select('interventions.*', db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom"))
        .leftJoin('users', 'interventions.technicien_id', 'users.id')
        .where({ equipement_id: req.params.id })
        .whereIn('statut', ['terminee', 'annulee'])
        .orderBy('updated_at', 'desc');

      return res.status(200).json({ data: interventions });
    } catch (error) {
      return res.status(500).json({ message: 'Erreur historique.' });
    }
  }
};

module.exports = EquipementController;