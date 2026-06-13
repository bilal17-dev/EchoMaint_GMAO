// Service de génération automatique des interventions préventives
// Règle RG-02 : une intervention préventive est créée automatiquement
// à date_acquisition + periodicite_preventive_jours
// puis régénérée à chaque clôture

const db = require('../../database/connection');

const genererInterventionsPreventives = async () => {

  let nombreCreees = 0;

  // On récupère tous les équipements en service avec une périodicité définie
  const equipements = await db('equipements')
    .where('statut', 'en_service')
    .whereNotNull('periodicite_preventive_jours');

  for (const equipement of equipements) {

    // On cherche s'il existe déjà une intervention préventive non clôturée
    // pour cet équipement — on ne crée pas en double
    const interventionExistante = await db('interventions')
      .where('equipement_id', equipement.id)
      .where('type', 'preventive')
      .whereNot('statut', 'cloturee')
      .first();

    if (interventionExistante) {
      // Une intervention préventive est déjà en cours pour cet équipement
      continue;
    }

    // On calcule la prochaine date de maintenance
    // date_acquisition + periodicite_preventive_jours
    const datePlanifiee = new Date(equipement.date_acquisition);
    datePlanifiee.setDate(datePlanifiee.getDate() + equipement.periodicite_preventive_jours);

    // On crée l'intervention préventive automatiquement
    await db('interventions').insert({
      id: require('crypto').randomUUID(),
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

  return { nombreCreees };
};

module.exports = { genererInterventionsPreventives }; 
