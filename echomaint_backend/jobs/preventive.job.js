// Ce fichier contient le cron job qui génère automatiquement
// les interventions préventives selon la périodicité de chaque équipement

const cron = require('node-cron');

/**
 *  PLANIFICATEUR AUTOMATIQUE (CRON JOB)
 * CORRIGÉ v2.1 : S'exécute désormais chaque nuit à 00h01 pile ('1 0 * * *') 
 * comme exigé par la Section 5 du cahier des charges.
 */
cron.schedule('1 0 * * *', async () => {

  console.log(`[CRON] Lancement nocturne à 00h01 du scan des plans de maintenance — ${new Date().toISOString()}`);

  try {
    // Chargement dynamique du service à l'intérieur du cron pour éviter les dépendances circulaires
    // ou les plantages si le service est en cours d'édition.
    const preventiveService = require('../app/services/preventive.service');

    // On vérifie que la fonction existe avant de l'appeler
    if (typeof preventiveService.genererInterventionsPreventives !== 'function') {
      console.warn('[CRON] Service de maintenance préventive non disponible ou incomplet.');
      return;
    }

    // Exécution du scan et de la génération des OT au statut 'planifiee'
    const resultat = await preventiveService.genererInterventionsPreventives();
    
    console.log(`[CRON] Fin du scan. Nouveaux ordres de travail (OT) créés : ${resultat.nombreCreees}`);
    console.log(`[CRON] Traitement de maintenance préventive terminé avec succès.`);

  } catch (error) {
    console.error('[CRON] Échec critique lors de la génération automatique :', error.message);
  }

});

console.log('[CRON] Planificateur actif : exécution programmée toutes les nuits à 00h01 [Validé v2.1] ✓');