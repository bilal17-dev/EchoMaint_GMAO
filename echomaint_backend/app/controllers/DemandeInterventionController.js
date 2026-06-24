const DemandeIntervention = require('../models/DemandeIntervention');
const Intervention = require('../models/Intervention');
const Equipement = require('../models/Equipement');
const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const DemandeInterventionController = {

  /**
   * 1. GET /api/v1/demandes — Liste toutes les DI (Filtres pour l'Admin)
   */
  index: async (req, res) => {
    try {
      // Si l'utilisateur connecté est un client, il ne voit QUE ses propres demandes
      const filtres = {};
      if (req.user.role === 'client') {
        filtres.client_id = req.user.id_client; // ID de son entreprise stocké dans son compte user
      } else {
        // Si c'est l'admin, il peut filtrer par les query params de l'URL
        if (req.query.statut) filtres.statut = req.query.statut;
        if (req.query.client_id) filtres.client_id = req.query.client_id;
      }

      const demandes = await DemandeIntervention.findAll(filtres);
      return res.status(200).json({ data: demandes });
    } catch (error) {
      console.error('[DemandeInterventionController.index]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  /**
   * 2. GET /api/v1/demandes/:id — Fiche détaillée d'une DI
   */
  show: async (req, res) => {
    try {
      const demande = await DemandeIntervention.findById(req.params.id);
      if (!demande) {
        return res.status(404).json({ message: res.translate('not_found') });
      }

      // Sécurité : Un client ne peut pas voir la DI d'une autre entreprise
      if (req.user.role === 'client' && demande.client_id !== req.user.id_client) {
        return res.status(403).json({ message: res.translate('forbidden') });
      }

      return res.status(200).json({ data: demande });
    } catch (error) {
      console.error('[DemandeInterventionController.show]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  /**
   * 3. POST /api/v1/demandes — Soumission d'une nouvelle DI par le Client
   */
  store: async (req, res) => {
    try {
      const { equipement_id, titre, description, priorite } = req.body;

      // Validation des champs obligatoires du CDC
      if (!equipement_id || !titre || !description) {
        return res.status(400).json({ message: 'L\'équipement, le titre et la description sont obligatoires.' });
      }

      // Récupération sécurisée du client_id de l'entreprise (via le user authentifié)
      const client_id = req.user.id_client;
      if (!client_id && req.user.role === 'client') {
        return res.status(400).json({ message: 'Votre compte utilisateur n\'est rattaché à aucune entreprise cliente.' });
      }

      const nouvelleDI = {
        id: uuidv4(),
        client_id: client_id || req.body.client_id, // Permet aussi à l'admin de saisir pour un client
        equipement_id,
        titre,
        description,
        priorite: priorite || 'normale',
        statut: 'ouverte' // Forcé à la création
      };

      const resultat = await DemandeIntervention.create(nouvelleDI);
      return res.status(201).json({ 
        data: resultat, 
        message: res.translate('di_creee') 
      });
    } catch (error) {
      console.error('[DemandeInterventionController.store]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  /**
   * 4. POST /api/v1/demandes/:id/rejeter — Rejet motivé par l'Admin (CDC J4)
   */
  rejeter: async (req, res) => {
    try {
      const { motif_rejet } = req.body;

      // Le motif de rejet est une contrainte stricte de gestion
      if (!motif_rejet || motif_rejet.trim().length < 10) {
        return res.status(422).json({ message: res.translate('motif_requis') });
      }

      const demande = await DemandeIntervention.findById(req.params.id);
      if (!demande) {
        return res.status(404).json({ message: res.translate('not_found') });
      }

      if (demande.statut !== 'ouverte') {
        return res.status(422).json({ message: `Impossible de rejeter une demande déjà traitée (Statut actuel: ${demande.statut}).` });
      }

      const miseAJour = await DemandeIntervention.update(req.params.id, {
        statut: 'rejetee',
        motif_rejet: motif_rejet.trim()
      });

      return res.status(200).json({ 
        data: miseAJour, 
        message: res.translate('di_rejettee') 
      });
    } catch (error) {
      console.error('[DemandeInterventionController.rejeter]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  /**
   * 5. POST /api/v1/demandes/:id/valider — FONCTION CRUCIALE DE CONVERSION EN OT CURATIF
   */
  validerEtConvertir: async (req, res) => {
    // Utilisation d'une transaction Knex pour garantir que TOUT passe ou TOUT échoue (Zéro désynchronisation)
    const transaction = await db.transaction();

    try {
      const demande = await DemandeIntervention.findById(req.params.id);
      if (!demande) {
        await transaction.rollback();
        return res.status(404).json({ message: res.translate('not_found') });
      }

      if (demande.statut !== 'ouverte') {
        await transaction.rollback();
        return res.status(422).json({ message: 'Cette demande a déjà été traitée.' });
      }

      // A. Génération de l'UUID pour le nouvel Ordre de Travail (OT)
      const interventionId = uuidv4();

      // B. Création automatique de l'intervention curative (Héritage des données de la DI)
      await transaction('interventions').insert({
        id: interventionId,
        titre: `[DI-Convertie] ${demande.titre}`,
        description: demande.description,
        type: 'curatif', // Forcé en curatif selon le CDC
        priorite: demande.priorite,
        statut: 'planifiee',
        equipement_id: demande.equipement_id,
        demande_intervention_id: demande.id, // Liaison bidirectionnelle pour la Journée 4
        date_planifiee: new Date(Date.now() + 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date()
      });

      // C. Mise à jour de la demande d'intervention (Liaison vers l'OT + Statut 'validee')
      await transaction('demandes_intervention')
        .where({ id: req.params.id })
        .update({
          statut: 'traitee',
          intervention_id: interventionId,
          updated_at: new Date()
        });

      // D. Force le statut de l'équipement lié à 'en_panne' (Exigence stricte CDC)
      await transaction('equipements')
        .where({ id: demande.equipement_id })
        .update({
          statut: 'en_panne',
          updated_at: new Date()
        });

      // Validation définitive de toutes les requêtes en BDD
      await transaction.commit();

      // Récupération de la demande mise à jour pour la réponse
      const demandeTraitee = await DemandeIntervention.findById(req.params.id);

      return res.status(200).json({
        data: demandeTraitee,
        message: res.translate('di_validee')
      });

    } catch (error) {
      // En cas de bug, on annule tout pour garder une base propre
      await transaction.rollback();
      console.error('[DemandeInterventionController.validerEtConvertir]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  }
};

module.exports = DemandeInterventionController;