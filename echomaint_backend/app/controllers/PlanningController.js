const db = require('../../database/connection');

const PlanningController = {
  
  /**
   * GET /api/v1/planning
   * Retourne une vue consolidée des interventions sur une période donnée (max 92 jours)
   */
  getPlanning: async (req, res) => {
    try {
      const { date_debut, date_fin, technicien_id, equipement_id, type } = req.query;

      // 1. Validation : Les dates sont obligatoires
      if (!date_debut || !date_fin) {
        return res.status(400).json({ message: "Les dates de début et de fin sont obligatoires." });
      }

      // 2. Validation : Contrainte métier des 92 jours
      const debut = new Date(date_debut);
      const fin = new Date(date_fin);
      const diffTime = Math.abs(fin - debut);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 92) {
        return res.status(400).json({ message: "La période de planning ne peut pas dépasser 92 jours." });
      }

      // 3. Construction de la requête
      let query = db('interventions')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .select(
          'interventions.*', 
          'equipements.nom as equipement_nom',
          'equipements.localisation'
        )
        .whereBetween('date_planifiee', [date_debut, date_fin])
        .orderBy('date_planifiee', 'asc');

      // 4. Application des filtres dynamiques
      if (technicien_id) {
        query = query.where('interventions.technicien_id', technicien_id);
      }
      if (equipement_id) {
        query = query.where('interventions.equipement_id', equipement_id);
      }
      if (type) {
        query = query.where('interventions.type', type);
      }

      const planning = await query;

      return res.status(200).json({ 
        count: planning.length,
        data: planning 
      });

    } catch (error) {
      console.error('[PlanningController.getPlanning]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  }
};

module.exports = PlanningController;