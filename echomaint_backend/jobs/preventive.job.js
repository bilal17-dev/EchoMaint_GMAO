// Ce fichier contient le cron job qui génère automatiquement
// les interventions préventives selon la périodicité de chaque équipement

const cron = require('node-cron');

// Ce cron job s'exécute tous les jours à minuit (00h00)
// Il vérifie les équipements dont la maintenance préventive est due
// et crée automatiquement les interventions selon la règle RG-02

cron.schedule('0 0 * * *', async () => {

  console.log(`[CRON] Démarrage vérification préventive — ${new Date().toISOString()}`);

  try {
    // On charge le service ICI à l'intérieur du cron (pas en haut du fichier)
    // Comme ça le serveur démarre normalement même si Dev 1 n'a pas encore
    // rempli preventive.service.js
    const preventiveService = require('../app/services/preventive.service');

    // On vérifie que la fonction existe avant de l'appeler
    if (typeof preventiveService.genererInterventionsPreventives !== 'function') {
      console.warn('[CRON] genererInterventionsPreventives pas encore disponible');
      return;
    }

    const resultat = await preventiveService.genererInterventionsPreventives();
    console.log(`[CRON] Interventions créées : ${resultat.nombreCreees}`);
    console.log(`[CRON] Terminé avec succès.`);

  } catch (error) {
    console.warn('[CRON] Erreur génération préventive :', error.message);
  }

});

console.log('[CRON] Planificateur actif — exécution tous les jours à minuit.');
