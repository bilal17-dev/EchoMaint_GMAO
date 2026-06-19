const Intervention = require('../models/Intervention');
const Equipement = require('../models/Equipement');
const preventiveService = require('../services/preventive.service');
const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const TRANSITIONS = {
  planifiee: ['assignee', 'annulee'],
  assignee: ['en_cours', 'annulee'],
  en_cours: ['terminee'],
  terminee: ['en_cours'],
  annulee: [],
};

const InterventionController = {

  index: async (req, res) => {
    try {
      const interventions = await Intervention.findAll(req.query);
      return res.status(200).json({ data: interventions });
    } catch (error) {
      console.error('[InterventionController.index]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  store: async (req, res) => {
    try {
      const { equipement_id, type, priorite, titre, description, date_planifiee, technicien_id, plan_maintenance_id } = req.body;
      
      if (!equipement_id || !type || !titre) {
        return res.status(400).json({ message: "Le titre, l'équipement et le type de maintenance sont obligatoires." });
      }

      let typeNettoye = type.toLowerCase().trim();
      if (typeNettoye === 'preventive') typeNettoye = 'preventif';
      if (typeNettoye === 'curatif' || typeNettoye === 'correctif') typeNettoye = 'curatif'; 

      if (typeNettoye !== 'curatif' && typeNettoye !== 'preventif') {
        return res.status(400).json({ message: "Le type d'intervention doit être 'curatif' ou 'preventif'." });
      }

      if (typeNettoye === 'curatif') {
        await Equipement.updateStatut(equipement_id, 'en_panne');
      }

      const id = uuidv4();
      const statutInitial = technicien_id ? 'assignee' : 'planifiee';

      const intervention = await Intervention.create({
        id, titre, description,
        type: typeNettoye, 
        priorite: priorite || 'normale',
        statut: statutInitial,
        date_planifiee: date_planifiee ? new Date(date_planifiee) : new Date(),
        equipement_id,
        technicien_id: technicien_id || null,
        plan_maintenance_id: plan_maintenance_id || null
      });

      return res.status(201).json({ data: intervention, message: res.translate('di_creee') });
    } catch (error) {
      console.error('[InterventionController.store]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  cloturer: async (req, res) => {
    try {
      const { id } = req.params;
      const { commentaire_cloture, duree_reelle } = req.body;
      
      const intervention = await Intervention.findById(id);
      if (!intervention) return res.status(404).json({ message: res.translate('not_found') });

      if (!TRANSITIONS[intervention.statut].includes('terminee')) {
        return res.status(422).json({ message: "Transition interdite." });
      }

      await Intervention.update(id, {
        statut: 'terminee',
        date_fin_reelle: new Date(),
        commentaire_cloture,
        duree_reelle_minutes: duree_reelle
      });

      if (intervention.type === 'curatif') {
        await Equipement.updateStatut(intervention.equipement_id, 'actif');
      }

      if (intervention.type === 'preventif' && intervention.plan_maintenance_id) {
        await preventiveService.planifierProchaineIntervention(intervention.plan_maintenance_id, new Date());
      }

      return res.status(200).json({ message: res.translate('di_validee') });
    } catch (error) {
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  show: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: res.translate('not_found') });

      intervention.photos = await db('photos_intervention').where({ intervention_id: req.params.id });
      intervention.commentaires = await db('commentaires_intervention')
        .select('commentaires_intervention.*', 'users.nom as auteur_nom')
        .join('users', 'users.id', 'commentaires_intervention.user_id')
        .where({ intervention_id: req.params.id });

      return res.status(200).json({ data: intervention });
    } catch (error) {
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  destroy: async (req, res) => {
    try {
      const { id } = req.params;
      const intervention = await Intervention.findById(id);
      
      if (!intervention) return res.status(404).json({ message: res.translate('not_found') });

      if (intervention.statut === 'terminee') {
        return res.status(403).json({ message: "Impossible de supprimer un historique clôturé." });
      }

      await db('photos_intervention').where({ intervention_id: id }).delete();
      await db('commentaires_intervention').where({ intervention_id: id }).delete();
      await db('interventions').where({ id }).delete();

      return res.status(200).json({ message: "Supprimé avec succès." });
    } catch (error) {
      console.error('[InterventionController.destroy]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  uploaderPhoto: async (req, res) => {
    try {
      const { id } = req.params;
      const { type_photo } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier reçu." });
      }

      // Validation stricte pour l'ENUM MySQL ('avant' ou 'apres')
      const typeValide = (type_photo === 'apres') ? 'apres' : 'avant';

      // Insertion complète en respectant toutes les colonnes NOT NULL
      await db('photos_intervention').insert({
        id: uuidv4(),
        intervention_id: id,
        type_photo: typeValide,
        chemin_fichier: req.file.path,
        nom_original: req.file.originalname,
        taille_octets: req.file.size,
        created_at: new Date(),
        updated_at: new Date()
      });

      return res.status(201).json({ message: "Photo ajoutée avec succès." });
    } catch (error) {
      console.error('[InterventionController.uploaderPhoto] Erreur SQL:', error);
      return res.status(500).json({ message: "Erreur lors de l'enregistrement en base." });
    }
  },

  assigner: async (req, res) => { return res.status(200).json({ message: "Action à implémenter selon les besoins métier." }); },
  rouvrir: async (req, res) => { return res.status(200).json({ message: "Action à implémenter selon les besoins métier." }); },
  annuler: async (req, res) => { return res.status(200).json({ message: "Action à implémenter selon les besoins métier." }); },
  demarrer: async (req, res) => { return res.status(200).json({ message: "Action à implémenter selon les besoins métier." }); },
  ajouterCommentaire: async (req, res) => { return res.status(200).json({ message: "Action à implémenter selon les besoins métier." }); },
  supprimerPhoto: async (req, res) => { return res.status(200).json({ message: "Action à implémenter selon les besoins métier." }); },
  telechargerRapport: async (req, res) => { return res.status(200).json({ message: "Rapport en préparation." }); },
  recupererPhotos: async (req, res) => { return res.status(200).json({ data: [] }); }
};

module.exports = InterventionController;