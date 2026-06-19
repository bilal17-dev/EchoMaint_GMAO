const db = require('../../database/connection');

const ReouvertureOT = {
  /**
   * Enregistrer une nouvelle réouverture dans le journal d'audit
   * Conforme aux exigences strictes de la Roadmap v2.1
   */
  create: async (data) => {
    return db('reouvertures_ot').insert(data);
  },

  /**
   * Récupérer l'historique complet des réouvertures pour un OT spécifique
   * Utile pour l'affichage et la génération du rapport PDF final (Journée 7)
   */
  findByIntervention: async (interventionId) => {
    return db('reouvertures_ot')
      .join('users', 'reouvertures_ot.user_id', '=', 'users.id')
      .where('reouvertures_ot.intervention_id', interventionId)
      .select(
        'reouvertures_ot.id as reouverture_id',
        'reouvertures_ot.intervention_id',
        'reouvertures_ot.motif',
        'reouvertures_ot.statut_precedent',
        'reouvertures_ot.created_at as date_reouverture',
        'users.id as admin_id',
        'users.nom as admin_nom',
        'users.prenom as admin_prenom'
      )
      .orderBy('reouvertures_ot.created_at', 'desc');
  }
};

module.exports = ReouvertureOT;