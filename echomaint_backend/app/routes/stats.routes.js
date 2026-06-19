const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');
const ExportController = require('../controllers/ExportController'); // Import nécessaire

// Import du middleware d'authentification global
const auth = require('../middlewares/auth');

/**
 * ROUTES DE STATISTIQUES & TABLEAUX DE BORD (KPI)
 * Accessibles à tout utilisateur connecté
 */
router.get('/resume', auth, StatsController.kpiResume);

// Nouvelle route pour l'export PDF du rapport KPI
router.get('/export/pdf', auth, ExportController.exportKpiPdf);

module.exports = router;