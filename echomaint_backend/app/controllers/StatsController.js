 const db = require('../../database/connection');

const StatsController = {

  // GET /api/v1/kpi/resume — Tableau de bord des indicateurs de performance (KPI)
  kpiResume: async (req, res) => {
    try {
      // 1. SÉCURITÉ (RG-06) : Extraction du rôle et de l'id_client du token JWT
      const { role, id_client } = req.user;
      const periode = req.query.periode || '30';
      const batiment_id = req.query.batiment_id;

      // Calcul de la borne temporelle (Fenêtre glissante)
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - parseInt(periode, 10));

      // 2. REQUÊTE DE BASE HARMONISÉE (Jointures pour filtres & sécurité)
      let baseQuery = db('interventions')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('interventions.created_at', '>=', dateDebut);

      // Application des filtres hiérarchiques
      if (batiment_id) {
        baseQuery = baseQuery.where('batiments.id', batiment_id);
      }

      // CLOISONNEMENT STRICT : Si c'est un client, il ne voit QUE ses bâtiments
      if (role === 'client') {
        baseQuery = baseQuery.where('batiments.client_id', id_client);
      }

      // 3. CALCUL DU MTTR (Mean Time To Repair — Temps moyen de réparation)
      // Ajustement : Prise en compte de 'curatif' ou 'correctif'
      const mttrResult = await baseQuery.clone()
        .whereIn('interventions.type', ['curatif', 'correctif'])
        .andWhere('interventions.statut', 'terminee')
        .select(
          db.raw('SUM(duree_reelle_minutes) as total_minutes'),
          db.raw('COUNT(*) as nb_curatifs')
        ).first();

      const nbCuratifs = parseInt(mttrResult.nb_curatifs, 10) || 0;
      const mttr = nbCuratifs > 0
        ? Math.round(mttrResult.total_minutes / nbCuratifs)
        : null;

      // 4. CALCUL DU RATIO DE MAINTENANCE (Préventif vs Curatif)
      // Ajustement : Prise en compte des deux variantes orthographiques de ta base
      const totaux = await baseQuery.clone()
        .where('interventions.statut', 'terminee')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN interventions.type IN ("preventif", "preventive") THEN 1 ELSE 0 END) as nb_preventif'),
          db.raw('SUM(CASE WHEN interventions.type IN ("curatif", "correctif") THEN 1 ELSE 0 END) as nb_curatif')
        ).first();

      const totalInterventionsCloses = parseInt(totaux.total, 10) || 0;
      const taux_preventif = totalInterventionsCloses > 0
        ? Math.round((parseInt(totaux.nb_preventif, 10) / totalInterventionsCloses) * 100)
        : 0;

      // 5. COMPTAGE DES OT EN RETARD
      // Ajustement : Changement du statut 'planifiee' par 'a_planifier' issu de ton InterventionController
      const ot_en_retard = await baseQuery.clone()
        .where('interventions.date_planifiee', '<', db.fn.now())
        .whereIn('interventions.statut', ['a_planifier', 'assignee', 'en_cours'])
        .count('interventions.id as total').first();

      // 6. COMPTAGE DES ÉQUIPEMENTS ACTUELLEMENT EN PANNE
      let equipQuery = db('equipements')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('equipements.statut', 'en_panne')
        .whereNull('equipements.deleted_at');

      if (batiment_id) equipQuery = equipQuery.where('equipements.batiment_id', batiment_id);
      if (role === 'client') equipQuery = equipQuery.where('batiments.client_id', id_client);
      
      const nb_equipements_en_panne = await equipQuery.count('equipements.id as total').first();

      // 7. COMPTAGE DES RÉOUVERTURES TECHNIQUE (Sécurisé par périmètre de droits)
      let reouverturesQuery = db('reouvertures_ot')
        .join('interventions', 'reouvertures_ot.intervention_id', 'interventions.id')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('reouvertures_ot.created_at', '>=', dateDebut);

      if (batiment_id) reouverturesQuery = reouverturesQuery.where('batiments.id', batiment_id);
      if (role === 'client') reouverturesQuery = reouverturesQuery.where('batiments.client_id', id_client);

      const reouvertures = await reouverturesQuery.count('reouvertures_ot.id as total').first();

      // 8. RETOUR DES INDICATEURS DE CONTRÔLE DE GESTION
      return res.status(200).json({
        data: {
          periode_jours: parseInt(periode, 10),
          mttr_minutes: mttr,
          mttr_heures: mttr ? Math.round((mttr / 60) * 10) / 10 : null,
          taux_preventif,
          taux_curatif: totalInterventionsCloses > 0 ? (100 - taux_preventif) : 0,
          ot_en_retard: parseInt(ot_en_retard.total, 10) || 0,
          nb_interventions_periode: totalInterventionsCloses,
          nb_equipements_en_panne: parseInt(nb_equipements_en_panne.total, 10) || 0,
          nb_reouvertures_periode: parseInt(reouvertures.total, 10) || 0,
        }
      });

    } catch (error) {
      console.error('[StatsController.kpiResume]', error);
      return res.status(500).json({ message: 'Une erreur serveur est survenue lors de l\'extraction des indicateurs.' });
    }
  },
};

module.exports = StatsController;
