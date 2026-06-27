const express = require('express');
const router = express.Router();
const preventiveService = require('../services/preventive.service');

/**
 * GET /api/v1/debug/run-cron
 * Déclenche manuellement le scan de maintenance préventive (équivalent au CRON 00h01).
 * UNIQUEMENT disponible en NODE_ENV=development.
 */
router.get('/run-cron', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Cette route de débogage est uniquement disponible en environnement de développement.'
    });
  }

  try {
    const debut = Date.now();
    const resultat = await preventiveService.genererInterventionsPreventives();
    const dureeMs = Date.now() - debut;

    return res.json({
      success: true,
      executedAt: new Date().toISOString(),
      dureeMs,
      nombreCreees: resultat.nombreCreees,
      interventionsCreees: resultat.interventionsCreees
    });
  } catch (err) {
    console.error('[DEBUG /run-cron] Erreur :', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
