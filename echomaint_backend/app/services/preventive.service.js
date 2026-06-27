const db = require('../../database/connection');
const Intervention = require('../models/Intervention');
const crypto = require('crypto');

/**
 * Service de maintenance préventive
 * Conforme v2.1 : Utilise 'plans_maintenance' comme source de vérité
 */
const preventiveService = {

  /**
   * Scan nocturne (CRON) : Génère les OT préventifs en attente
   */
  genererInterventionsPreventives: async () => {
    let nombreCreees = 0;
    const interventionsCreees = [];

    try {
      // 1. Récupérer tous les plans actifs
      const plans = await db('plans_maintenance').where({ actif: true });

      for (const plan of plans) {
        // 2. RG-PM-01 : Vérifier s'il existe déjà un OT préventif actif pour ce plan
        // On vérifie le plan_maintenance_id pour éviter les doublons sur un même plan
        const interventionExistante = await db('interventions')
          .where({ plan_maintenance_id: plan.id })
          .whereIn('statut', ['planifiee', 'assignee', 'en_cours'])
          .first();

        if (interventionExistante) continue;

        // 3. Calcul de l'échéance
        const derniereGen = plan.derniere_generation ? new Date(plan.derniere_generation) : new Date(plan.created_at);
        const dateProchaine = new Date(derniereGen);
        dateProchaine.setDate(dateProchaine.getDate() + plan.periodicite_jours);

        // Si la date est passée ou égale à aujourd'hui, on génère l'OT
        if (dateProchaine <= new Date()) {
          const otId = crypto.randomUUID();

          await Intervention.create({
            id: otId,
            equipement_id: plan.equipement_id,
            plan_maintenance_id: plan.id, // Lien vers le plan
            type: 'preventif',
            priorite: 'normale',
            statut: 'planifiee',
            titre: `[Préventif] ${plan.label}`,
            description: `Maintenance préventive automatique générée via plan : ${plan.label}`,
            date_planifiee: dateProchaine,
            // Injection de la gamme de tâches (JSON) du plan vers l'OT
            gamme_taches: plan.gamme_taches
          });

          // 4. Mise à jour de la dernière génération sur le plan
          await db('plans_maintenance').where({ id: plan.id }).update({
            derniere_generation: new Date()
          });

          interventionsCreees.push({
            id: otId,
            titre: `[Préventif] ${plan.label}`,
            plan_id: plan.id,
            plan_label: plan.label,
            equipement_id: plan.equipement_id,
            date_planifiee: dateProchaine.toISOString(),
            periodicite_jours: plan.periodicite_jours,
          });
          nombreCreees++;
        }
      }
    } catch (erreur) {
      console.error('[preventiveService] Erreur lors du scan automatique :', erreur);
    }

    return { nombreCreees, interventionsCreees };
  },

  /**
   * Régénération automatique après clôture (RG-02)
   */
  planifierProchaineIntervention: async (planId, dateCloture) => {
    try {
      const plan = await db('plans_maintenance').where({ id: planId }).first();
      if (!plan || !plan.actif) return;

      const futureDate = new Date(dateCloture);
      futureDate.setDate(futureDate.getDate() + plan.periodicite_jours);

      await Intervention.create({
        id: crypto.randomUUID(),
        equipement_id: plan.equipement_id,
        plan_maintenance_id: plan.id,
        type: 'preventif',
        priorite: 'normale',
        statut: 'planifiee',
        titre: `[Préventif] ${plan.label}`,
        description: `Maintenance préventive régénérée suite à clôture.`,
        date_planifiee: futureDate,
        gamme_taches: plan.gamme_taches
      });

      console.log(`[GMAO] Cycle préventif relancé pour le plan ${planId}`);
    } catch (erreur) {
      console.error('[preventiveService] Erreur lors de la régénération :', erreur);
    }
  }
};

module.exports = preventiveService;