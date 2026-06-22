const db = require('../../database/connection');

const StatsController = {
  // GET /api/v1/kpi/resume — Tableau de bord des indicateurs de performance (KPI)
  kpiResume: async (req, res) => {
    try {
      const { role, id_client } = req.user;
      const periode = req.query.periode || '30';
      const batiment_id = req.query.batiment_id;

      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - parseInt(periode, 10));

      let baseQuery = db('interventions')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('interventions.created_at', '>=', dateDebut);

      if (batiment_id) baseQuery = baseQuery.where('batiments.id', batiment_id);
      if (role === 'client') baseQuery = baseQuery.where('batiments.client_id', id_client);

      const mttrResult = await baseQuery.clone()
        .whereIn('interventions.type', ['curatif', 'correctif'])
        .andWhere('interventions.statut', 'terminee')
        .select(db.raw('SUM(duree_reelle_minutes) as total_minutes'), db.raw('COUNT(*) as nb_curatifs')).first();

      const nbCuratifs = parseInt(mttrResult.nb_curatifs, 10) || 0;
      const mttr = nbCuratifs > 0 ? Math.round(mttrResult.total_minutes / nbCuratifs) : null;

      const totaux = await baseQuery.clone()
        .where('interventions.statut', 'terminee')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN interventions.type IN ("preventif", "preventive") THEN 1 ELSE 0 END) as nb_preventif'),
          db.raw('SUM(CASE WHEN interventions.type IN ("curatif", "correctif") THEN 1 ELSE 0 END) as nb_curatif')
        ).first();

      const totalInterventionsCloses = parseInt(totaux.total, 10) || 0;
      const taux_preventif = totalInterventionsCloses > 0 ? Math.round((parseInt(totaux.nb_preventif, 10) / totalInterventionsCloses) * 100) : 0;

      const ot_en_retard = await baseQuery.clone()
        .where('interventions.date_planifiee', '<', db.fn.now())
        .whereIn('interventions.statut', ['a_planifier', 'assignee', 'en_cours'])
        .count('interventions.id as total').first();

      let equipQuery = db('equipements')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('equipements.statut', 'en_panne')
        .whereNull('equipements.deleted_at');

      if (batiment_id) equipQuery = equipQuery.where('equipements.batiment_id', batiment_id);
      if (role === 'client') equipQuery = equipQuery.where('batiments.client_id', id_client);
      const nb_equipements_en_panne = await equipQuery.count('equipements.id as total').first();

      let reouverturesQuery = db('reouvertures_ot')
        .join('interventions', 'reouvertures_ot.intervention_id', 'interventions.id')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('reouvertures_ot.created_at', '>=', dateDebut);

      if (batiment_id) reouverturesQuery = reouverturesQuery.where('batiments.id', batiment_id);
      if (role === 'client') reouverturesQuery = reouverturesQuery.where('batiments.client_id', id_client);
      const reouvertures = await reouverturesQuery.count('reouvertures_ot.id as total').first();

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
  /**
   * GET /api/v1/kpi/par-equipement
   * Retourne le top 5 des équipements et le top 5 des bâtiments
   * ayant eu le plus d'interventions curatives sur les 12 derniers mois.
   * Le "value" retourné est un pourcentage par rapport au total des OT curatifs.
   */
  
  kpiParEquipement: async (req, res) => {
    try {
      // On calcule la date d'il y a 12 mois
      const ilYa12Mois = new Date();
      ilYa12Mois.setMonth(ilYa12Mois.getMonth() - 12);

      // On compte le nombre total d'OT curatifs sur la période
      // pour pouvoir calculer un pourcentage juste après
      const totalCuratifs = await db('interventions')
        .where({ type: 'curatif' })
        .where('created_at', '>=', ilYa12Mois)
        .count('id as total')
        .first();

      const total = parseInt(totalCuratifs.total) || 1; // évite une division par zéro

      // ─── Top 5 équipements ────────────────────────────────────────────────
      // On compte le nombre d'OT curatifs par équipement, on trie du plus
      // grand au plus petit, et on garde seulement les 5 premiers
      const parEquipementBrut = await db('interventions')
        .select('equipements.nom')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .where('interventions.type', 'curatif')
        .where('interventions.created_at', '>=', ilYa12Mois)
        .groupBy('equipements.id', 'equipements.nom')
        .count('interventions.id as nb')
        .orderBy('nb', 'desc')
        .limit(5);

      // On transforme le nombre brut en pourcentage pour chaque équipement
      const par_equipement = parEquipementBrut.map(item => ({
        name: item.nom,
        value: Math.round((item.nb / total) * 1000) / 10 // arrondi à 1 décimale
      }));

      // ─── Top 5 bâtiments ──────────────────────────────────────────────────
      const parBatimentBrut = await db('interventions')
        .select('batiments.nom')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('interventions.type', 'curatif')
        .where('interventions.created_at', '>=', ilYa12Mois)
        .groupBy('batiments.id', 'batiments.nom')
        .count('interventions.id as nb')
        .orderBy('nb', 'desc')
        .limit(5);

      const par_batiment = parBatimentBrut.map(item => ({
        name: item.nom,
        value: Math.round((item.nb / total) * 1000) / 10
      }));

      return res.status(200).json({
        data: { par_equipement, par_batiment }
      });

    } catch (error) {
      console.error('[StatsController.kpiParEquipement]', error);
      return res.status(500).json({ message: 'Erreur lors du calcul des statistiques par équipement.' });
    }
  },

  /**
   * GET /api/v1/kpi/evolution
   * Retourne le nombre d'interventions par mois sur les 12 derniers mois,
   * regroupées en 3 catégories : ouvertes, en cours, clôturées.
   */
  kpiEvolution: async (req, res) => {
    try {
      const moisLabels = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
                           'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

      const resultats = [];
      const maintenant = new Date();

      // On boucle sur les 12 derniers mois, du plus ancien au plus récent
      for (let i = 11; i >= 0; i--) {
        const dateDebutMois = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
        const dateFinMois = new Date(maintenant.getFullYear(), maintenant.getMonth() - i + 1, 0, 23, 59, 59);

        // Statuts "ouvertes" = planifiee + assignee
        const ouvertes = await db('interventions')
          .whereIn('statut', ['planifiee', 'assignee'])
          .whereBetween('created_at', [dateDebutMois, dateFinMois])
          .count('id as total').first();

        // Statut "en cours"
        const enCours = await db('interventions')
          .where('statut', 'en_cours')
          .whereBetween('created_at', [dateDebutMois, dateFinMois])
          .count('id as total').first();

        // Statut "clôturées" = terminee
        const cloturees = await db('interventions')
          .where('statut', 'terminee')
          .whereBetween('created_at', [dateDebutMois, dateFinMois])
          .count('id as total').first();

        resultats.push({
          month: moisLabels[dateDebutMois.getMonth()],
          ouvertes: parseInt(ouvertes.total) || 0,
          enCours: parseInt(enCours.total) || 0,
          cloturees: parseInt(cloturees.total) || 0,
        });
      }

      return res.status(200).json({ data: resultats });

    } catch (error) {
      console.error('[StatsController.kpiEvolution]', error);
      return res.status(500).json({ message: 'Erreur lors du calcul de l\'évolution des interventions.' });
    }
  },
};

module.exports = StatsController;