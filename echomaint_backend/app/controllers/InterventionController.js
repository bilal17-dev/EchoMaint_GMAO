const Intervention = require('../models/Intervention');
const Equipement = require('../models/Equipement');
const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Contrat de la machine à états finis pour le cycle de vie des OT (RG-STATUS)
const TRANSITIONS = {
  a_planifier: ['assignee', 'annulee'],
  assignee:    ['en_cours', 'annulee'],
  en_cours:    ['terminee'],
  terminee:    ['en_cours'], // Réouverture autorisée (engendre un historique)
  annulee:     [],           // État final
};

const InterventionController = {

  // GET /api/v1/interventions — Liste toutes les interventions avec filtres
  index: async (req, res) => {
    try {
      // Les filtres du req.query sont gérés dynamiquement par le modèle (statut, type, priorite...)
      const interventions = await Intervention.findAll(req.query);
      return res.status(200).json({ data: interventions });
    } catch (error) {
      console.error('[InterventionController.index]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des interventions.' });
    }
  },

  // POST /api/v1/interventions — Créer un ordre de travail
  store: async (req, res) => {
    try {
      const { equipement_id, type, priorite, titre, description, date_planifiee, technicien_id } = req.body;

      if (!equipement_id || !type || !titre) {
        return res.status(400).json({ message: "Le titre, l'équipement et le type de maintenance sont obligatoires." });
      }

      const id = uuidv4();
      const statutInitial = 'a_planifier';

      // SÉCURITÉ MÉTIER : Si c'est une panne (type 'correctif' ou 'curatif'), l'équipement passe instantanément 'en_panne'
      if (type === 'correctif' || type === 'curatif') {
        await Equipement.updateStatut(equipement_id, 'en_panne');
      }

      const intervention = await Intervention.create({
        id,
        titre,
        description,
        type, // 'correctif' ou 'preventif'
        priorite: priorite || 'moyenne',
        statut: statutInitial,
        date_planifiee: date_planifiee ? new Date(date_planifiee) : new Date(),
        equipement_id,
        technicien_id: technicien_id || null
      });

      return res.status(201).json({ data: intervention, message: 'Ordre de travail créé avec succès !' });
    } catch (error) {
      console.error('[InterventionController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création de l\'intervention.' });
    }
  },

  // GET /api/v1/interventions/:id — Fiche et détails complets d'un OT (avec Photos, Comm & PDF)
  show: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' });

      // Injection de l'URL du fichier de restitution si le chemin physique existe
      if (intervention.rapport_pdf_chemin) {
        intervention.rapport_url = `/api/v1/interventions/${req.params.id}/rapport`;
      } else {
        intervention.rapport_url = null;
      }

      return res.status(200).json({ data: intervention });
    } catch (error) {
      console.error('[InterventionController.show]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'intervention.' });
    }
  },

  // POST /api/v1/interventions/:id/assigner — Assigner un technicien qualifié
  assigner: async (req, res) => {
    try {
      const { technicien_id } = req.body;
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' });

      // Validation de la transition d'état
      if (!TRANSITIONS[intervention.statut]?.includes('assignee')) {
        return res.status(422).json({
          code: 'INVALID_TRANSITION',
          message: `Impossible de passer du statut "${intervention.statut}" à "assignee".`
        });
      }

      // Vérification de l'existence et du rôle de l'utilisateur ciblé
      const technicien = await db('users').where({ id: technicien_id, role: 'technicien' }).first();
      if (!technicien) {
        return res.status(422).json({ message: 'Le technicien sélectionné est invalide.' });
      }

      const updated = await Intervention.update(req.params.id, {
        statut: 'assignee',
        technicien_id,
      });

      return res.status(200).json({ data: updated, message: 'Technicien assigné avec succès.' });
    } catch (error) {
      console.error('[InterventionController.assigner]', error);
      return res.status(500).json({ message: 'Erreur lors de l\'assignation.' });
    }
  },

  // POST /api/v1/interventions/:id/demarrer — Lancement des travaux sur le terrain
  demarrer: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' });

      if (!TRANSITIONS[intervention.statut]?.includes('en_cours')) {
        return res.status(422).json({
          code: 'INVALID_TRANSITION',
          message: `Impossible de passer du statut "${intervention.statut}" à "en_cours".`
        });
      }

      const updated = await Intervention.update(req.params.id, {
        statut: 'en_cours',
        date_debut_reelle: db.fn.now(),
      });

      return res.status(200).json({ data: updated, message: 'Intervention marquée comme en cours.' });
    } catch (error) {
      console.error('[InterventionController.demarrer]', error);
      return res.status(500).json({ message: 'Erreur lors du démarrage.' });
    }
  },

  // POST /api/v1/interventions/:id/cloturer — Clôture, rapport technique et déclenchements automatisés
  cloturer: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' });

      if (!TRANSITIONS[intervention.statut]?.includes('terminee')) {
        return res.status(422).json({
          code: 'INVALID_TRANSITION',
          message: `Action impossible. L'intervention est actuellement au statut "${intervention.statut}".`
        });
      }

      const dateCloture = new Date();

      // Compilateur du rapport PDF (Service optionnel tiers)
      let rapport_pdf_chemin = null;
      try {
        const { genererRapportPDF } = require('../services/rapport.service');
        rapport_pdf_chemin = await genererRapportPDF(intervention, req.user);
      } catch (pdfError) {
        console.warn('[PDF_SERVICE_OFFLINE] Création du fichier ignorée:', pdfError.message);
      }

      const updated = await Intervention.update(req.params.id, {
        statut: 'terminee',
        date_fin_reelle: dateCloture,
        commentaire_cloture: req.body.commentaire_cloture,
        duree_reelle_minutes: req.body.duree_reelle_minutes,
        rapport_pdf_chemin,
      });

      // REMISE EN SERVICE : Si la machine était déclarée en panne et qu'elle est cochée comme résolue
      if (req.body.resolu && intervention.equipement_statut === 'en_panne') {
        await Equipement.updateStatut(intervention.equipement_id, 'actif');
      }

      // RÈGLE MÉTIER COMPLÈTE (RG-02 / RG-OT-05) : Automatisme pour la maintenance préventive récurrente
      if (intervention.type === 'preventif' || intervention.type === 'preventive') {
        try {
          const preventiveService = require('../services/preventive.service');
          console.log(`[RG-02] Déclenchement de l'algorithme d'anticipation pour la machine ${intervention.equipement_id}.`);
          
          await preventiveService.planifierProchaineIntervention(
            intervention.equipement_id, 
            dateCloture
          );

          // Si un calendrier de plan de maintenance global est rattaché
          if (intervention.plan_maintenance_id) {
            await db('plans_maintenance')
              .where({ id: intervention.plan_maintenance_id })
              .update({ derniere_generation: dateCloture });
          }
        } catch (serviceError) {
          console.error('[PREVENTIVE_SERVICE_ERROR] Échec de recalcul de récurrence:', serviceError.message);
        }
      }

      return res.status(200).json({ data: updated, message: 'Ordre de travail clôturé avec succès.' });
    } catch (error) {
      console.error('[InterventionController.cloturer]', error);
      return res.status(500).json({ message: 'Erreur lors de la clôture.' });
    }
  },

  // POST /api/v1/interventions/:id/rouvrir — Réouverture motivée par l'encadrement (Admin/Tech)
  rouvrir: async (req, res) => {
    try {
      const { motif } = req.body;
      if (!motif) return res.status(400).json({ message: "Un motif écrit de réouverture est obligatoire." });

      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' });

      if (intervention.statut !== 'terminee') {
        return res.status(422).json({ message: 'Seule une intervention clôturée peut être rouverte.' });
      }

      // Journalisation de la réouverture (Traçabilité audit)
      await Intervention.enregistrerReouverture(
        req.params.id,
        req.user.id, // ID de la session du superviseur
        motif,
        intervention.statut
      );

      // Réinitialisation de l'état de l'OT pour renvoi sur le terrain
      const updated = await Intervention.update(req.params.id, {
        statut: 'en_cours',
        rapport_pdf_chemin: null,
        date_fin_reelle: null,
        commentaire_cloture: null,
        duree_reelle_minutes: null,
      });

      return res.status(200).json({ data: updated, message: 'Ordre de travail rouvert et renvoyé en cours.' });
    } catch (error) {
      console.error('[InterventionController.rouvrir]', error);
      return res.status(500).json({ message: 'Erreur lors de la réouverture de l\'intervention.' });
    }
  },

  // POST /api/v1/interventions/:id/annuler — Abandonner une intervention
  annuler: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' });

      if (!TRANSITIONS[intervention.statut]?.includes('annulee')) {
        return res.status(422).json({
          code: 'INVALID_TRANSITION',
          message: `Impossible d'annuler une intervention à l'étape "${intervention.statut}".`
        });
      }

      const updated = await Intervention.update(req.params.id, { statut: 'annulee' });
      return res.status(200).json({ data: updated, message: 'Intervention annulée.' });
    } catch (error) {
      console.error('[InterventionController.annuler]', error);
      return res.status(500).json({ message: 'Erreur lors de l\'annulation.' });
    }
  },

  // GET /api/v1/interventions/:id/rapport — Téléchargement du fichier de restitution PDF (RG-RAPPORT-01)
  rapport: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id);
      if (!intervention) return res.status(404).json({ message: 'Intervention introuvable.' });

      // RG-RAPPORT-01 : Accessible uniquement si l'état technique final est atteint
      if (intervention.statut !== 'terminee') {
        return res.status(422).json({ message: 'Le rapport n\'est disponible que pour les interventions clôturées.' });
      }

      if (!intervention.rapport_pdf_chemin) {
        return res.status(503).json({ message: 'Le rapport PDF n\'a pas pu être généré pour cette intervention.' });
      }

      return res.sendFile(path.resolve(intervention.rapport_pdf_chemin));
    } catch (error) {
      console.error('[InterventionController.rapport]', error);
      return res.status(500).json({ message: 'Erreur lors du téléchargement du rapport.' });
    }
  },
};

module.exports = InterventionController;