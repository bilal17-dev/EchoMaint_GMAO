const db = require('../../database/connection');

const KpiController = {
  getResume: async (req, res) => {
    try {
      // 1. Calcul du MTTR (Interventions curatives terminées uniquement)
      const mttrData = await db('interventions')
        .where({ type: 'curatif', statut: 'terminee' })
        .avg('duree_reelle_minutes as average_mttr');

      // 2. Répartition Préventif vs Curatif
      const distribution = await db('interventions')
        .select('type')
        .count('* as total')
        .groupBy('type');

      // 3. OT en retard (Planifié mais pas terminé, date dépassée)
      const enRetard = await db('interventions')
        .where('statut', '!=', 'terminee')
        .andWhere('date_planifiee', '<', new Date())
        .count('* as total');

      return res.status(200).json({
        mttr_minutes: mttrData[0].average_mttr || 0,
        distribution,
        ot_en_retard: enRetard[0].total
      });
    } catch (error) {
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  }
};

module.exports = KpiController;