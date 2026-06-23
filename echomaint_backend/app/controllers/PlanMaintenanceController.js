const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const PlanMaintenanceController = {
  // Lister tous les plans
  index: async (req, res) => {
    try {
      const plans = await db('plans_maintenance').select('*');
      return res.status(200).json({ data: plans });
    } catch (error) {
      console.error('[PlanMaintenanceController.index]', error);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  },

  // Créer un nouveau plan
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

      return res.status(201).json({ message: "Plan de maintenance créé avec succès.", id: planId });
    } catch (error) {
      console.error('[PlanMaintenanceController.store]', error);
      return res.status(500).json({ message: "Erreur lors de la création du plan." });
    }
  },

  // Désactiver un plan
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