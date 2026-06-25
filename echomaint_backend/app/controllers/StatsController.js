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
        .whereIn('interventions.statut', ['planifiee', 'assignee', 'en_cours'])
        .count('interventions.id as total').first();

      let equipQuery = db('equipements')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('equipements.statut', 'en_panne')
        

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

      // Bug #2 — champ attendu par Dashboard.jsx : décompte des OT par statut sur la période
      const parStatutRows = await baseQuery.clone()
        .select('interventions.statut', db.raw('COUNT(*) as total'))
        .groupBy('interventions.statut');

      const interventions_par_statut = { planifiee: 0, assignee: 0, en_cours: 0, terminee: 0, annulee: 0 };
      parStatutRows.forEach(row => {
        if (Object.prototype.hasOwnProperty.call(interventions_par_statut, row.statut)) {
          interventions_par_statut[row.statut] = parseInt(row.total, 10);
        }
      });

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
          interventions_par_statut,
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
  // ════════════════════════════════════════════════════════════════════════════
  // GET /api/v1/kpi/client-dashboard
  // Tableau de bord dédié aux utilisateurs avec le rôle "client".
  // Toutes les données sont filtrées par id_client (issu du JWT).
  // Les 8 requêtes s'exécutent en parallèle via Promise.all pour minimiser
  // la latence réseau vers la base de données.
  // ════════════════════════════════════════════════════════════════════════════
  getClientDashboard: async (req, res) => {
    try {
      const { id_client } = req.user;

      if (!id_client) {
        return res.status(403).json({ message: 'Accès réservé aux utilisateurs clients.' });
      }

      const periode     = parseInt(req.query.periode || '30', 10);
      const batiment_id = req.query.batiment_id || null;

      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - periode);

      const [
        nbEquipementsRow,
        repartitionEquipRows,
        equipementsEnPanneRows,
        nbDemandesRow,
        repartitionDIRows,
        dernieresDemandes,
        nbInterventionsEnCoursRow,
        nbInterventionsTermineesRow,
        batimentsRows,
      ] = await Promise.all([

        // 1 ─ Nombre total d'équipements
        db('equipements')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .whereNull('equipements.deleted_at')
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .count('equipements.id as total')
          .first(),

        // 2 ─ Répartition par statut (donut)
        db('equipements')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .whereNull('equipements.deleted_at')
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .select('equipements.statut', db.raw('COUNT(*) as total'))
          .groupBy('equipements.statut'),

        // 3 ─ Équipements en panne (liste)
        db('equipements')
          .select(
            'equipements.id',
            'equipements.nom',
            'equipements.reference',
            'batiments.nom as batiment_nom'
          )
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .where('equipements.statut', 'en_panne')
          .whereNull('equipements.deleted_at')
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .orderBy('equipements.nom', 'asc'),

        // 4 ─ DI en attente (toutes périodes — les DI ouvertes sont toujours pertinentes)
        db('demandes_intervention')
          .join('equipements', 'demandes_intervention.equipement_id', 'equipements.id')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .where('demandes_intervention.statut', 'ouverte')
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .count('demandes_intervention.id as total')
          .first(),

        // 5 ─ Répartition DI par statut sur la période sélectionnée
        db('demandes_intervention')
          .join('equipements', 'demandes_intervention.equipement_id', 'equipements.id')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .where('demandes_intervention.created_at', '>=', dateDebut)
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .select('demandes_intervention.statut', db.raw('COUNT(*) as total'))
          .groupBy('demandes_intervention.statut'),

        // 6 ─ 5 dernières DI avec nom de l'équipement
        db('demandes_intervention')
          .select(
            'demandes_intervention.id',
            'demandes_intervention.titre',
            'demandes_intervention.statut',
            'demandes_intervention.priorite',
            'demandes_intervention.created_at',
            'equipements.nom as equipement_nom'
          )
          .join('equipements', 'demandes_intervention.equipement_id', 'equipements.id')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .orderBy('demandes_intervention.created_at', 'desc')
          .limit(5),

        // 7 ─ OT en cours sur les équipements du client
        db('interventions')
          .join('equipements', 'interventions.equipement_id', 'equipements.id')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .whereIn('interventions.statut', ['en_cours', 'assignee'])
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .count('interventions.id as total')
          .first(),

        // 8 ─ OT terminés sur la période sélectionnée
        db('interventions')
          .join('equipements', 'interventions.equipement_id', 'equipements.id')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('batiments.client_id', id_client)
          .where('interventions.statut', 'terminee')
          .where('interventions.updated_at', '>=', dateDebut)
          .modify(q => { if (batiment_id) q.where('batiments.id', batiment_id); })
          .count('interventions.id as total')
          .first(),

        // 9 ─ Liste des bâtiments du client (pour le filtre frontend)
        db('batiments')
          .select('id', 'nom')
          .where('client_id', id_client)
          .orderBy('nom', 'asc'),
      ]);

      const repartition_equipements = { actif: 0, en_panne: 0, hors_service: 0 };
      repartitionEquipRows.forEach(row => {
        if (Object.prototype.hasOwnProperty.call(repartition_equipements, row.statut)) {
          repartition_equipements[row.statut] = parseInt(row.total, 10);
        }
      });

      const repartition_demandes = { ouverte: 0, traitee: 0, rejetee: 0 };
      repartitionDIRows.forEach(row => {
        if (Object.prototype.hasOwnProperty.call(repartition_demandes, row.statut)) {
          repartition_demandes[row.statut] = parseInt(row.total, 10);
        }
      });

      return res.status(200).json({
        data: {
          nb_equipements:                  parseInt(nbEquipementsRow.total, 10)          || 0,
          nb_equipements_en_panne:         repartition_equipements.en_panne,
          nb_demandes_en_attente:          parseInt(nbDemandesRow.total, 10)             || 0,
          nb_interventions_en_cours:       parseInt(nbInterventionsEnCoursRow.total, 10) || 0,
          nb_interventions_terminees_mois: parseInt(nbInterventionsTermineesRow.total, 10)|| 0,
          repartition_equipements,
          repartition_demandes,
          dernieres_demandes:   dernieresDemandes,
          equipements_en_panne: equipementsEnPanneRows,
          batiments:            batimentsRows,
        }
      });
    } catch (error) {
      console.error('[StatsController.getClientDashboard]', error);
      return res.status(500).json({ message: 'Erreur lors du chargement du tableau de bord client.' });
    }
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GET /api/v1/kpi/technicien-dashboard
  // Tableau de bord dédié aux techniciens.
  // Toutes les requêtes filtrent par technicien_id = req.user.id (issu du JWT).
  // Les requêtes principales s'exécutent en parallèle via Promise.all.
  // ════════════════════════════════════════════════════════════════════════════
  getTechnicienDashboard: async (req, res) => {
    try {
      const techId = req.user.id;

      if (req.user.role !== 'technicien') {
        return res.status(403).json({ message: 'Accès réservé aux techniciens.' });
      }

      const periode   = parseInt(req.query.periode || '30', 10);
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - periode);

      // ─── 9 requêtes principales en parallèle ─────────────────────────────
      const [
        nbPlanifiesAujourdHuiRow,   // OT planifiés aujourd'hui (KPI 1)
        nbEnCoursRow,               // OT en cours (KPI 2)
        nbTerminesMoisRow,          // OT terminés sur 30j (KPI 3)
        mttrRow,                    // Durée moyenne de réparation (KPI 4)
        tauxClotureRow,             // Pour calculer taux de clôture (Ligne 2)
        nbEnRetardRow,              // OT en retard (Ligne 2)
        nbReouverturesRow,          // Réouvertures subies (Ligne 2)
        otAujourdHui,               // Liste OT du jour (Ligne 3 gauche)
        prochainsOT,                // 5 prochains OT planifiés (Ligne 3 droite)
      ] = await Promise.all([

        // 1 ─ Nombre d'OT planifiés pour aujourd'hui (statut planifiee ou assignee)
        //     DATE(date_planifiee) = CURDATE() compare uniquement la partie date (pas l'heure)
        db('interventions')
          .where('technicien_id', techId)
          .whereIn('statut', ['planifiee', 'assignee'])
          .whereRaw('DATE(date_planifiee) = CURDATE()')
          .count('id as total')
          .first(),

        // 2 ─ OT actuellement en cours de traitement
        db('interventions')
          .where('technicien_id', techId)
          .where('statut', 'en_cours')
          .count('id as total')
          .first(),

        // 3 ─ OT clôturés sur la période sélectionnée
        db('interventions')
          .where('technicien_id', techId)
          .where('statut', 'terminee')
          .where('updated_at', '>=', dateDebut)
          .count('id as total')
          .first(),

        // 4 ─ MTTR : moyenne de duree_reelle_minutes sur OT terminés sur la période
        db('interventions')
          .where('technicien_id', techId)
          .where('statut', 'terminee')
          .where('updated_at', '>=', dateDebut)
          .select(db.raw('AVG(duree_reelle_minutes) as mttr_avg'))
          .first(),

        // 5 ─ Taux de clôture : OT terminés / total OT sur la période
        db('interventions')
          .where('technicien_id', techId)
          .where('created_at', '>=', dateDebut)
          .select(
            db.raw('COUNT(*) as total'),
            db.raw("SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END) as termines")
          )
          .first(),

        // 6 ─ OT en retard : date planifiée dépassée, pas encore terminé ni annulé
        db('interventions')
          .where('technicien_id', techId)
          .whereNotIn('statut', ['terminee', 'annulee'])
          .whereRaw('date_planifiee < CURDATE()')
          .count('id as total')
          .first(),

        // 7 ─ Réouvertures subies sur la période sélectionnée
        db('reouvertures_ot')
          .join('interventions', 'reouvertures_ot.intervention_id', 'interventions.id')
          .where('interventions.technicien_id', techId)
          .where('reouvertures_ot.created_at', '>=', dateDebut)
          .count('reouvertures_ot.id as total')
          .first(),

        // 8 ─ OT du jour : planifiés aujourd'hui OU actuellement en cours
        //     Inclut bâtiment et équipement pour l'affichage dans la liste
        db('interventions')
          .select(
            'interventions.id',
            'interventions.titre',
            'interventions.statut',
            'interventions.priorite',
            'interventions.date_planifiee',
            'equipements.nom as equipement_nom',
            'batiments.nom as batiment_nom'
          )
          .join('equipements', 'interventions.equipement_id', 'equipements.id')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .where('interventions.technicien_id', techId)
          .where(function () {
            // Planifié aujourd'hui OU en cours (peu importe la date)
            this.whereRaw('DATE(interventions.date_planifiee) = CURDATE()')
              .orWhere('interventions.statut', 'en_cours');
          })
          .orderBy('interventions.date_planifiee', 'asc'),

        // 9 ─ Prochains OT : 5 suivants avec date >= aujourd'hui
        db('interventions')
          .select(
            'interventions.id',
            'interventions.titre',
            'interventions.type',
            'interventions.priorite',
            'interventions.date_planifiee',
            'equipements.nom as equipement_nom'
          )
          .join('equipements', 'interventions.equipement_id', 'equipements.id')
          .where('interventions.technicien_id', techId)
          .whereIn('interventions.statut', ['planifiee', 'assignee'])
          .whereRaw('interventions.date_planifiee >= CURDATE()')
          .orderBy('interventions.date_planifiee', 'asc')
          .limit(5),
      ]);

      // ─── Calculs dérivés ──────────────────────────────────────────────────

      // MTTR formaté en "Xh Ymin" (ou "—" si aucune donnée)
      const mttrMinutes = Math.round(parseFloat(mttrRow?.mttr_avg) || 0);
      const mttrHeures  = Math.floor(mttrMinutes / 60);
      const mttrReste   = mttrMinutes % 60;
      const mttr_formate = mttrMinutes > 0
        ? (mttrHeures > 0 ? `${mttrHeures}h ${mttrReste}min` : `${mttrReste}min`)
        : '—';

      // Taux de clôture arrondi en entier (0 si aucun OT)
      const totalOT    = parseInt(tauxClotureRow.total, 10) || 0;
      const terminesOT = parseInt(tauxClotureRow.termines, 10) || 0;
      const taux_cloture = totalOT > 0 ? Math.round((terminesOT / totalOT) * 100) : 0;

      // ─── Activité sur 4 segments couvrant la période sélectionnée ───────────
      // segmentDays = ceil(periode / 4) ; les 4 segments couvrent toute la fenêtre
      const segmentDays = Math.ceil(periode / 4);
      const activite_semaines = await Promise.all(
        Array.from({ length: 4 }, (_, i) => {
          const debut = new Date();
          debut.setDate(debut.getDate() - (4 - i) * segmentDays);
          debut.setHours(0, 0, 0, 0);
          const fin = new Date();
          fin.setDate(fin.getDate() - (3 - i) * segmentDays);
          fin.setHours(23, 59, 59, 999);
          const label = debut.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          return db('interventions')
            .where('technicien_id', techId)
            .where('statut', 'terminee')
            .whereBetween('updated_at', [debut, fin])
            .count('id as total')
            .first()
            .then(row => ({ semaine: label, nb: parseInt(row.total, 10) || 0 }));
        })
      );

      return res.status(200).json({
        data: {
          // ── KPI Ligne 1 ──────────────────────────────────────────────────
          nb_ot_planifies_aujourd_hui: parseInt(nbPlanifiesAujourdHuiRow.total, 10) || 0,
          nb_ot_en_cours:              parseInt(nbEnCoursRow.total, 10)              || 0,
          nb_ot_termines_mois:         parseInt(nbTerminesMoisRow.total, 10)         || 0,
          mttr_formate,

          // ── Indicateurs Ligne 2 ─────────────────────────────────────────
          taux_cloture,
          nb_ot_en_retard:  parseInt(nbEnRetardRow.total, 10)    || 0,
          nb_reouvertures:  parseInt(nbReouverturesRow.total, 10) || 0,

          // ── Listes Ligne 3 ──────────────────────────────────────────────
          ot_aujourd_hui: otAujourdHui,
          prochains_ot:   prochainsOT,

          // ── Graphique Ligne 4 ───────────────────────────────────────────
          activite_semaines,
        }
      });
    } catch (error) {
      console.error('[StatsController.getTechnicienDashboard]', error);
      return res.status(500).json({ message: 'Erreur lors du chargement du tableau de bord technicien.' });
    }
  },

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