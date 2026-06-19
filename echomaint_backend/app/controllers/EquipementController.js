const Equipement = require('../models/Equipement');
const Batiment = require('../models/Batiment');
const db = require('../../database/connection');

const EquipementController = {

  index: async (req, res) => {
    try {
      const { role, id_client } = req.user;
      const filters = {
        batiment_id: req.query.batiment_id,
        statut: req.query.statut,
        search: req.query.search,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        client_id: req.query.client_id
      };
      const equipements = await Equipement.findAll(role, id_client, filters);
      return res.status(200).json({ data: equipements });
    } catch (error) {
      console.error('[EquipementController.index]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des équipements.' });
    }
  },

  show: async (req, res) => {
    try {
      const { role, id_client } = req.user;
      const { id } = req.params;
      const equipement = await Equipement.findById(id);
      
      if (!equipement) return res.status(404).json({ message: 'Équipement introuvable.' });

      if (role === 'client' && equipement.client_id !== id_client) {
        return res.status(403).json({ message: 'Accès interdit à cet équipement.' });
      }

      const ilYa30Jours = new Date();
      ilYa30Jours.setDate(ilYa30Jours.getDate() - 30);
      
      const stats30j = await db('interventions')
        .where({ equipement_id: id, statut: 'terminee' })
        .where('created_at', '>=', ilYa30Jours)
        .count('id as total')
        .first();

      const derniereIntervention = await db('interventions')
        .where({ equipement_id: id })
        .whereNotIn('statut', ['annulee'])
        .orderBy('created_at', 'desc')
        .select('created_at')
        .first();

      return res.status(200).json({ 
        data: { 
          ...equipement, 
          nb_interventions_30j: parseInt(stats30j.total, 10) || 0, 
          derniere_intervention_date: derniereIntervention ? derniereIntervention.created_at : null 
        }
      });
    } catch (error) {
      console.error('[EquipementController.show]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'équipement.' });
    }
  },

  store: async (req, res) => {
    try {
      const { nom, batiment_id, code_inventaire } = req.body;
      if (!nom || !batiment_id) return res.status(400).json({ message: 'Le nom et le batiment_id sont obligatoires.' });

      if (code_inventaire) {
        const doublon = await db('equipements').where({ batiment_id, code_inventaire }).whereNull('deleted_at').first();
        if (doublon) return res.status(409).json({ message: 'Un équipement avec ce code inventaire existe déjà.' });
      }

      const equipement = await Equipement.create(req.body);
      return res.status(201).json({ data: equipement, message: 'Équipement créé avec succès !' });
    } catch (error) {
      console.error('[EquipementController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création de l\'équipement.' });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await Equipement.findById(id);
      if (!existing) return res.status(404).json({ message: 'Équipement introuvable.' });

      const equipement = await Equipement.update(id, req.body);
      return res.status(200).json({ data: equipement, message: 'Équipement mis à jour avec succès !' });
    } catch (error) {
      console.error('[EquipementController.update]', error);
      return res.status(500).json({ message: 'Erreur lors de la modification de l\'équipement.' });
    }
  },

  destroy: async (req, res) => {
    try {
      const hasOT = await Equipement.hasOTActifs(req.params.id);
      if (hasOT) return res.status(422).json({ message: 'Impossible de supprimer cet équipement car il est associé à des interventions en cours.' });
      
      await Equipement.delete(req.params.id);
      return res.status(200).json({ message: 'Équipement archivé avec succès !' });
    } catch (error) {
      console.error('[EquipementController.destroy]', error);
      return res.status(500).json({ message: 'Erreur lors de la suppression de l\'équipement.' });
    }
  },

  historique: async (req, res) => {
    try {
      const interventions = await db('interventions')
        .select('interventions.*', db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom"))
        .leftJoin('users', 'interventions.technicien_id', 'users.id')
        .where({ equipement_id: req.params.id })
        .whereIn('statut', ['terminee', 'annulee'])
        .orderBy('updated_at', 'desc');
        
      return res.status(200).json({ data: interventions });
    } catch (error) {
      console.error('[EquipementController.historique]', error);
      return res.status(500).json({ message: 'Erreur lors du calcul de l\'historique.' });
    }
  }
};

module.exports = EquipementController;