const Intervention = require('../models/Intervention');
const Equipement = require('../models/Equipement');
const preventiveService = require('../services/preventive.service');
const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const TRANSITIONS = {
  planifiee: ['assignee', 'annulee'],
  assignee: ['en_cours', 'annulee'],
  en_cours: ['terminee'],
  terminee: ['en_cours'],
  annulee: [],
};

const InterventionController = {
  // index optimisé pour le planning (formatage des données)
  index: async (req, res) => {
    try {
      const interventions = await Intervention.findAll(req.query);
      
      // Normalisation des données pour le calendrier (ajout des champs attendus par le front)
      const formattedData = interventions.map(i => ({
        ...i,
        start: i.date_planifiee, 
        title: i.titre
      }));
      
      return res.status(200).json({ data: formattedData });
    } catch (error) {
      console.error('[InterventionController.index]', error);
      return res.status(500).json({ message: "Erreur serveur lors de la récupération." });
    }
  },

  show: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." });
      return res.status(200).json({ data: intervention });
    } catch (error) {
      console.error('[InterventionController.show]', error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },

  store: async (req, res) => {
    try {
      const { equipement_id, type, priorite, titre, description, date_planifiee, technicien_id, plan_maintenance_id } = req.body;
      if (!equipement_id || !type || !titre) return res.status(400).json({ message: "Champs obligatoires manquants." });

      let typeNettoye = type.toLowerCase().trim();
      if (typeNettoye === 'preventive') typeNettoye = 'preventif';
      if (typeNettoye === 'curatif' || typeNettoye === 'correctif') typeNettoye = 'curatif';

      if (typeNettoye === 'curatif') await Equipement.update(equipement_id, { statut: 'en_panne' });

      // Gestion sécurisée de la date
      let datePlanifiee = date_planifiee ? new Date(date_planifiee) : new Date();
      if (isNaN(datePlanifiee.getTime())) {
        return res.status(400).json({ message: "Format de date invalide." });
      }

      const intervention = await Intervention.create({
        id: uuidv4(), titre, description, type: typeNettoye,
        priorite: priorite || 'normale',
        statut: technicien_id ? 'assignee' : 'planifiee',
        date_planifiee: datePlanifiee,
        equipement_id, technicien_id: technicien_id || null, plan_maintenance_id: plan_maintenance_id || null
      });

      return res.status(201).json({ data: intervention, message: "Demande créée avec succès." });
    } catch (error) {
      console.error('[InterventionController.store]', error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },

  cloturer: async (req, res) => {
    try {
      const { id } = req.params;
      const { commentaire_cloture, duree_reelle } = req.body;
      const intervention = await Intervention.findById(id);
      
      if (!intervention || !TRANSITIONS[intervention.statut].includes('terminee')) 
        return res.status(422).json({ message: "Action impossible." });

      await Intervention.update(id, {
        statut: 'terminee', date_fin_reelle: new Date(),
        commentaire_cloture, duree_reelle_minutes: duree_reelle
      });

      if (intervention.type === 'curatif') await Equipement.update(intervention.equipement_id, { statut: 'actif' });
      if (intervention.type === 'preventif' && intervention.plan_maintenance_id) 
        await preventiveService.planifierProchaineIntervention(intervention.plan_maintenance_id, new Date());

      return res.status(200).json({ message: "Intervention clôturée." });
    } catch (error) {
      console.error('[InterventionController.cloturer]', error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },

  destroy: async (req, res) => {
    try {
      const { id } = req.params;
      await db('photos_intervention').where({ intervention_id: id }).delete();
      await db('commentaires_intervention').where({ intervention_id: id }).delete();
      await db('interventions').where({ id }).delete();
      return res.status(200).json({ message: "Supprimé avec succès." });
    } catch (error) {
      console.error('[InterventionController.destroy]', error);
      return res.status(500).json({ message: "Erreur serveur lors de la suppression." });
    }
  },

  telechargerRapport: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  recupererPhotos: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  assigner: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  rouvrir: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  annuler: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  demarrer: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  ajouterCommentaire: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  uploaderPhoto: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
  supprimerPhoto: async (req, res) => res.status(501).json({ message: "Non implémenté" }),
};

module.exports = InterventionController;