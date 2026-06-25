const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const PlanMaintenanceController = {

  // ── GET /plans-maintenance ────────────────────────────────────────────────
  // Retourne tous les plans avec les infos de l'équipement lié
  index: async (req, res) => {
    try {
      const plans = await db('plans_maintenance')
        .select('plans_maintenance.*', 'equipements.nom as equipement_nom')
        .leftJoin('equipements', 'plans_maintenance.equipement_id', 'equipements.id')
        .orderBy('plans_maintenance.created_at', 'desc');
      return res.status(200).json({ data: plans });
    } catch (error) {
      console.error('[PlanMaintenanceController.index]', error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },

  // ── GET /equipements/:id/plans-maintenance ────────────────────────────────
  // Liste uniquement les plans rattachés à un équipement précis
  getByEquipement: async (req, res) => {
    try {
      const { id } = req.params; // id de l'équipement
      const plans = await db('plans_maintenance')
        .where({ equipement_id: id })
        .orderBy('created_at', 'desc');
      return res.status(200).json({ data: plans });
    } catch (error) {
      console.error('[PlanMaintenanceController.getByEquipement]', error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },

  // ── POST /plans-maintenance ───────────────────────────────────────────────
  // Crée un nouveau plan de maintenance préventive
  store: async (req, res) => {
    try {
      const { equipement_id, label, periodicite_jours, gamme_taches } = req.body;

      if (!equipement_id || !label || !periodicite_jours) {
        return res.status(400).json({ message: "Champs obligatoires manquants." });
      }

      // RG-PM-03 : la périodicité doit être un entier >= 1
      const periode = parseInt(periodicite_jours, 10);
      if (!Number.isInteger(periode) || periode < 1) {
        return res.status(422).json({
          error: 'INVALID_PERIODICITE',
          message: 'La périodicité doit être un entier supérieur ou égal à 1 jour. (RG-PM-03)'
        });
      }

      const planId = uuidv4();
      await db('plans_maintenance').insert({
        id: planId,
        equipement_id,
        label,
        periodicite_jours: periode,
        gamme_taches: JSON.stringify(gamme_taches ?? []),
        actif: true,
        created_at: new Date()
      });

      const plan = await db('plans_maintenance').where({ id: planId }).first();
      return res.status(201).json({ message: "Plan créé.", data: plan });
    } catch (error) {
      console.error('[PlanMaintenanceController.store]', error);
      return res.status(500).json({ message: "Erreur lors de la création." });
    }
  },

  // ── PUT /plans-maintenance/:id ────────────────────────────────────────────
  // Modifie un plan existant (label, périodicité, gamme de tâches, statut actif)
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { actif, label, periodicite_jours, gamme_taches } = req.body;

      // ── Validation RG-PM-03 : périodicité ──────────────────────────────
      // On ne valide que si le champ est présent dans la requête
      if (periodicite_jours !== undefined) {
        const periode = parseInt(periodicite_jours, 10);
        if (!Number.isInteger(periode) || periode < 1) {
          return res.status(422).json({
            error: 'INVALID_PERIODICITE',
            message: 'La périodicité doit être un entier supérieur ou égal à 1 jour. (RG-PM-03)'
          });
        }
      }

      // ── Validation structure gamme_taches ──────────────────────────────
      // Chaque tâche doit avoir : ordre (number), libelle (string non vide), obligatoire (boolean)
      if (gamme_taches !== undefined) {
        if (!Array.isArray(gamme_taches)) {
          return res.status(422).json({
            error: 'INVALID_GAMME_TACHES',
            message: 'gamme_taches doit être un tableau JSON.'
          });
        }
        const structureValide = gamme_taches.every(t =>
          typeof t.ordre === 'number' &&
          typeof t.libelle === 'string' && t.libelle.trim().length > 0 &&
          typeof t.obligatoire === 'boolean'
        );
        if (!structureValide) {
          return res.status(422).json({
            error: 'INVALID_GAMME_TACHES',
            message: 'Chaque tâche doit avoir : ordre (number), libelle (string), obligatoire (boolean).'
          });
        }
      }

      // Construit l'objet de mise à jour avec uniquement les champs fournis
      const champs = {};
      if (actif !== undefined)          champs.actif = actif;
      if (label !== undefined)          champs.label = label;
      if (periodicite_jours !== undefined)
        champs.periodicite_jours = parseInt(periodicite_jours, 10);
      if (gamme_taches !== undefined)   champs.gamme_taches = JSON.stringify(gamme_taches);

      await db('plans_maintenance').where({ id }).update(champs);
      const plan = await db('plans_maintenance').where({ id }).first();
      return res.status(200).json({ data: plan });
    } catch (error) {
      console.error('[PlanMaintenanceController.update]', error);
      return res.status(500).json({ message: "Erreur lors de la mise à jour." });
    }
  },

  // ── DELETE /plans-maintenance/:id ─────────────────────────────────────────
  // Supprime physiquement un plan (pas de deleted_at dans le schéma actuel)
  // Bloqué si des OT ouverts sont encore liés à ce plan
  destroy: async (req, res) => {
    try {
      const { id } = req.params;

      // Vérifie qu'aucun OT en cours ne référence ce plan
      // Les statuts "terminee" et "annulee" sont considérés comme fermés
      const otActifs = await db('interventions')
        .where({ plan_maintenance_id: id })
        .whereNotIn('statut', ['terminee', 'annulee'])
        .count('id as total')
        .first();

      if (parseInt(otActifs.total, 10) > 0) {
        return res.status(422).json({
          error: 'OT_ACTIFS_LIES',
          message: `Suppression impossible : ${otActifs.total} ordre(s) de travail en cours sont liés à ce plan. Clôturez-les d'abord.`
        });
      }

      // Suppression physique (la table plans_maintenance n'a pas de colonne deleted_at)
      await db('plans_maintenance').where({ id }).delete();
      return res.status(200).json({ message: "Plan de maintenance supprimé." });
    } catch (error) {
      console.error('[PlanMaintenanceController.destroy]', error);
      return res.status(500).json({ message: "Erreur lors de la suppression." });
    }
  }

};

module.exports = PlanMaintenanceController;
