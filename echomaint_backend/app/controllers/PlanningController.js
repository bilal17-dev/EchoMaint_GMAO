const db = require('../../database/connection');

const PlanningController = {

  getPlanning: async (req, res) => {
    try {
      const { date_debut, date_fin, technicien_id, batiment_id, equipement_id, statut } = req.query;

      if (!date_debut || !date_fin) {
        return res.status(400).json({ message: "Les dates de début et de fin sont obligatoires." });
      }

      const debut = new Date(date_debut);
      const fin   = new Date(date_fin);
      const diffDays = Math.ceil(Math.abs(fin - debut) / (1000 * 60 * 60 * 24));

      if (diffDays > 92) {
        return res.status(400).json({ message: "La période ne peut pas dépasser 92 jours." });
      }

      let query = db('interventions')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments',   'equipements.batiment_id',    'batiments.id')
        .leftJoin('users as technicien', 'interventions.technicien_id', 'technicien.id')
        .select(
          'interventions.id',
          'interventions.titre',
          'interventions.type',
          'interventions.statut',
          'interventions.priorite',
          'interventions.date_planifiee',
          'interventions.technicien_id',
          'equipements.nom  as equipement_nom',
          'equipements.id   as equipement_id',
          'batiments.nom    as batiment_nom',
          'batiments.id     as batiment_id',
          'technicien.nom   as technicien_nom',
          'technicien.prenom as technicien_prenom'
        )
        .whereBetween('interventions.date_planifiee', [date_debut, date_fin])
        .orderBy('interventions.date_planifiee', 'asc');

      // RG-PLAN-01 : un technicien ne voit que ses propres OT
      if (req.user.role === 'technicien') {
        query = query.where('interventions.technicien_id', req.user.id);
      } else if (technicien_id) {
        query = query.where('interventions.technicien_id', technicien_id);
      }

      if (batiment_id)   query = query.where('batiments.id',         batiment_id);
      if (equipement_id) query = query.where('equipements.id',        equipement_id);
      if (statut)        query = query.where('interventions.statut',  statut);

      const planning = await query;

      return res.status(200).json({ data: planning });

    } catch (error) {
      console.error('[PlanningController.getPlanning]', error);
      return res.status(500).json({ message: "Erreur serveur lors du chargement du planning." });
    }
  }
};

module.exports = PlanningController;