const db = require('../../database/connection');
const Intervention = require('../models/Intervention');
const crypto = require('crypto');
const cron = require('node-cron');

/**
 * Fonction 1 : Scanner les équipements pour générer les interventions initiales (via CRON)
 */
const genererInterventionsPreventives = async () => {
  let nombreCreees = 0;

  try {
    const equipements = await db('equipements')
      .where('statut', 'en_service')
      .whereNotNull('periodicite_preventive_jours')
      .where('periodicite_preventive_jours', '>', 0);

    for (const equipement of equipements) {

      // Utilisation du modèle Intervention pour vérifier l'existence
      const interventionExistante = await Intervention.getActiveIntervention(equipement.id, 'preventive');

      if (interventionExistante) {
        continue;
      }

      const datePlanifiee = new Date(equipement.date_acquisition);
      datePlanifiee.setDate(datePlanifiee.getDate() + equipement.periodicite_preventive_jours);

      // Utilisation du modèle Intervention pour la création
      await Intervention.create({
        id: crypto.randomUUID(),
        equipement_id: equipement.id,
        type: 'preventive',
        priorite: 'moyenne',
        statut: 'ouverte',
        description: `Maintenance préventive automatique — périodicité : ${equipement.periodicite_preventive_jours} jours`,
        date_planifiee: datePlanifiee,
        date_cloture: null,
        technicien_id: null
      });

      nombreCreees++;
    }
  } catch (erreur) {
    console.error('Erreur lors du scan des équipements préventifs :', erreur);
  }

  return { nombreCreees };
};

/**
 * Fonction 2 : Régénérer une intervention préventive dès qu'une autre vient d'être clôturée (RG-02)
 */
const planifierProchaineIntervention = async (equipementId, dateCloture) => {
  try {
    const equipement = await db('equipements')
      .where('id', equipementId)
      .first();

    if (!equipement || !equipement.periodicite_preventive_jours) {
      return null;
    }

    const futureDatePlanifiee = new Date(dateCloture);
    futureDatePlanifiee.setDate(futureDatePlanifiee.getDate() + equipement.periodicite_preventive_jours);

    // Utilisation du modèle Intervention pour la création
    await Intervention.create({
      id: crypto.randomUUID(),
      equipement_id: equipementId,
      type: 'preventive',
      priorite: 'moyenne',
      statut: 'ouverte',
      description: `Maintenance préventive régénérée suite à clôture — périodicité : ${equipement.periodicite_preventive_jours} jours`,
      date_planifiee: futureDatePlanifiee,
      date_cloture: null,
      technicien_id: null
    });

    console.log(`[Système] Prochaine intervention planifiée automatiquement pour l'équipement ${equipementId}`);
  } catch (erreur) {
    console.error('Erreur lors de la régénération automatique de l’intervention :', erreur);
  }
};

/**
 * LE PLANIFICATEUR AUTOMATIQUE (CRON)
 * Il tourne toutes les nuits à minuit pile : '0 0 * * *'
 */
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Lancement automatique de la vérification des équipements...');
  try {
    const resultat = await genererInterventionsPreventives();
    console.log(`[CRON] Fin du scan automatique. Interventions préventives créées : ${resultat.nombreCreees}`);
  } catch (erreur) {
    console.error('[CRON] Erreur lors de l’exécution du scan automatique :', erreur);
  }
});

console.log('[Système] Tâche planifiée CRON intégrée avec succès dans le service préventif.');

module.exports = { 
  genererInterventionsPreventives,
  planifierProchaineIntervention 
};