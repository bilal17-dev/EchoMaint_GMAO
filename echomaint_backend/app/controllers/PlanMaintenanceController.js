const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const PlanMaintenanceController = {

  index: async (req, res) => {
    try {
      const plans = await db('plans_maintenance').select('*');
      return res.status(200).json({ data: plans });
    } catch (error) {
      console.error('[PlanMaintenanceController.index]', error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },

  store: async (req, res) => {
    try {
      const { equipement_id, label, periodicite_jours, gamme_taches } = req.body;
      if (!equipement_id || !label || !periodicite_jours) {
        return res.status(400).json({ message: "Champs obligatoires manquants." });
      }
      const planId = uuidv4();
      await db('plans_maintenance').insert({
        id: planId,
        equipement_id,
        label,
        periodicite_jours,
        gamme_taches: JSON.stringify(gamme_taches),
        actif: true,
        created_at: new Date()
      });
      return res.status(201).json({ message: "Plan créé.", id: planId });
    } catch (error) {
      console.error('[PlanMaintenanceController.store]', error);
      return res.status(500).json({ message: "Erreur lors de la création." });
    }
  },

  // ← update DOIT être ici, dans l'objet, avant destroy
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { actif, label, periodicite_jours, gamme_taches } = req.body;

      const champs = {};
      if (actif !== undefined)  champs.actif = actif;
      if (label)                champs.label = label;
      if (periodicite_jours)    champs.periodicite_jours = periodicite_jours;
      if (gamme_taches)         champs.gamme_taches = JSON.stringify(gamme_taches);

      await db('plans_maintenance').where({ id }).update(champs);
      const plan = await db('plans_maintenance').where({ id }).first();
      return res.status(200).json({ data: plan });
    } catch (error) {
      console.error('[PlanMaintenanceController.update]', error);
      return res.status(500).json({ message: "Erreur lors de la mise à jour." });
    }
  },

  destroy: async (req, res) => {
    try {
      const { id } = req.params;
      await db('plans_maintenance').where({ id }).update({ actif: false });
      return res.status(200).json({ message: "Plan désactivé." });
    } catch (error) {
      return res.status(500).json({ message: "Erreur lors de la désactivation." });
    }
  }

};

module.exports = PlanMaintenanceController;