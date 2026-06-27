const DemandeIntervention = require('../models/DemandeIntervention');
const Intervention = require('../models/Intervention');
const Equipement = require('../models/Equipement');
const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const DemandeInterventionController = {

  // ── GET /demandes-intervention ────────────────────────────────────────────
  index: async (req, res) => {
    try {
      // Client → uniquement ses propres DI ; Admin → tout avec filtres optionnels
      const filtres = {};
      if (req.user.role === 'client') {
        filtres.client_id = req.user.id_client;
      } else {
        if (req.query.statut)    filtres.statut    = req.query.statut;
        if (req.query.client_id) filtres.client_id = req.query.client_id;
      }

      const demandes = await DemandeIntervention.findAll(filtres);
      return res.status(200).json({ data: demandes });
    } catch (err) {
      console.error('[DemandeInterventionController.index]', err.message, err.stack);
      return res.status(500).json({ message: err.message || 'Erreur serveur.' });
    }
  },

  // ── GET /demandes-intervention/:id ────────────────────────────────────────
  show: async (req, res) => {
    try {
      const demande = await DemandeIntervention.findById(req.params.id);
      if (!demande) return res.status(404).json({ message: 'Demande non trouvée.' });

      // Un client ne peut pas consulter la DI d'une autre entreprise
      if (req.user.role === 'client' && demande.client_id !== req.user.id_client) {
        return res.status(403).json({ message: 'Accès refusé.' });
      }

      return res.status(200).json({ data: demande });
    } catch (err) {
      console.error('[DemandeInterventionController.show]', err.message, err.stack);
      return res.status(500).json({ message: err.message || 'Erreur serveur.' });
    }
  },

  // ── POST /demandes-intervention ───────────────────────────────────────────
  store: async (req, res) => {
    try {
      const { equipement_id, titre, description, priorite } = req.body;

      if (!equipement_id || !titre || !description) {
        return res.status(400).json({ message: "L'équipement, le titre et la description sont obligatoires." });
      }

      // Le client_id vient du JWT pour éviter toute usurpation
      const client_id = req.user.id_client;
      if (!client_id && req.user.role === 'client') {
        return res.status(400).json({ message: "Votre compte utilisateur n'est rattaché à aucune entreprise cliente." });
      }

      const nouvelleDI = {
        id: uuidv4(),
        client_id: client_id || req.body.client_id,
        equipement_id,
        titre,
        description,
        priorite: priorite || 'normale',
        statut: 'ouverte',
      };

      const resultat = await DemandeIntervention.create(nouvelleDI);
      return res.status(201).json({ data: resultat, message: 'Demande créée avec succès.' });
    } catch (err) {
      console.error('[DemandeInterventionController.store]', err.message, err.stack);
      return res.status(500).json({ message: err.message || 'Erreur serveur.' });
    }
  },

  // ── POST /demandes-intervention/:id/rejeter ───────────────────────────────
  rejeter: async (req, res) => {
    try {
      const { motif_rejet } = req.body;

      if (!motif_rejet || motif_rejet.trim().length < 10) {
        return res.status(422).json({ message: 'Le motif de rejet doit contenir au moins 10 caractères.' });
      }

      const demande = await DemandeIntervention.findById(req.params.id);
      if (!demande) return res.status(404).json({ message: 'Demande non trouvée.' });

      if (demande.statut !== 'ouverte') {
        return res.status(422).json({ message: `Impossible de rejeter une demande déjà traitée (statut actuel : ${demande.statut}).` });
      }

      const miseAJour = await DemandeIntervention.update(req.params.id, {
        statut: 'rejetee',
        motif_rejet: motif_rejet.trim(),
      });

      return res.status(200).json({ data: miseAJour, message: 'Demande rejetée avec succès.' });
    } catch (err) {
      console.error('[DemandeInterventionController.rejeter]', err.message, err.stack);
      return res.status(500).json({ message: err.message || 'Erreur serveur.' });
    }
  },

  // ── POST /demandes-intervention/:id/valider ───────────────────────────────
  // Convertit la DI en OT curatif dans une transaction atomique.
  validerEtConvertir: async (req, res) => {
    const transaction = await db.transaction();
    try {
      const demande = await DemandeIntervention.findById(req.params.id);
      if (!demande) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Demande non trouvée.' });
      }

      if (demande.statut !== 'ouverte') {
        await transaction.rollback();
        return res.status(422).json({ message: 'Cette demande a déjà été traitée.' });
      }

      const interventionId = uuidv4();

      await transaction('interventions').insert({
        id: interventionId,
        titre: `[DI-Convertie] ${demande.titre}`,
        description: demande.description,
        type: 'curatif',
        priorite: demande.priorite,
        statut: 'planifiee',
        equipement_id: demande.equipement_id,
        demande_intervention_id: demande.id,
        date_planifiee: new Date(Date.now() + 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await transaction('demandes_intervention')
        .where({ id: req.params.id })
        .update({ statut: 'traitee', intervention_id: interventionId, updated_at: new Date() });

      await transaction('equipements')
        .where({ id: demande.equipement_id })
        .update({ statut: 'en_panne', updated_at: new Date() });

      await transaction.commit();

      const demandeTraitee = await DemandeIntervention.findById(req.params.id);
      return res.status(200).json({ data: demandeTraitee, message: 'Demande validée et convertie en OT.' });
    } catch (err) {
      await transaction.rollback();
      console.error('[DemandeInterventionController.validerEtConvertir]', err.message, err.stack);
      return res.status(500).json({ message: err.message || 'Erreur serveur.' });
    }
  },
};

module.exports = DemandeInterventionController;
