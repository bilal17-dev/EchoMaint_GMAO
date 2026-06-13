// Ce fichier contient le cron job qui génère automatiquement
// les interventions préventives selon la périodicité de chaque équipement

// node-cron permet de programmer des tâches automatiques
// On l'installe avec : npm install node-cron
const cron = require('node-cron');

// On importe le service qui contient la logique métier (RG-02)
// Ce service est créé par Dev 1 — on l'appelle ici
const preventiveService = require('../app/services/preventive.service');

// On programme la tâche pour qu'elle s'exécute tous les jours à minuit
// Le format cron "0 0 * * *" signifie : minute 0, heure 0, tous les jours
cron.schedule('0 0 * * *', async () => {

  console.log(`[CRON] Démarrage de la vérification des interventions préventives — ${new Date().toISOString()}`);

  try {
    // On appelle le service de Dev 1 qui contient la logique RG-02 :
    // Pour chaque équipement, si date_acquisition + periodicite_preventive_jours
    // est dépassée et qu'aucune intervention préventive n'est planifiée,
    // on en crée une automatiquement
    const resultat = await preventiveService.genererInterventionsPreventives();

    console.log(`[CRON] Interventions générées : ${resultat.nombreCreees}`);
    console.log(`[CRON] Vérification terminée avec succès.`);

  } catch (error) {
    console.error('[CRON] Erreur lors de la génération des interventions préventives :', error.message);
  }

});

console.log('[CRON] Planificateur d\'interventions préventives actif (exécution tous les jours à minuit)');