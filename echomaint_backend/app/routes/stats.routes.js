 const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');

// Import du middleware d'authentification global
const auth = require('../middlewares/auth');

/**
 * ROUTES DE STATISTIQUES & TABLEAUX DE BORD (KPI)
 * Accessibles à tout utilisateur connecté (Le filtrage RG-06 est géré dans le contrôleur)
 */
router.get('/resume', auth, StatsController.kpiResume);

module.exports = router;
