const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');
const ExportController = require('../controllers/ExportController');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

/**
 * ROUTES DE STATISTIQUES & KPI
 */
router.get('/resume', auth, StatsController.kpiResume);

// Tableau de bord agrégé pour les utilisateurs "client"
// Toutes les données sont filtrées côté backend par id_client (JWT)
router.get('/client-dashboard', auth, StatsController.getClientDashboard);

// Tableau de bord agrégé pour les techniciens
// Toutes les données sont filtrées par technicien_id = req.user.id (JWT)
router.get('/technicien-dashboard', auth, StatsController.getTechnicienDashboard);

// Nouvelles routes à ajouter
router.get('/par-equipement', auth, isAdmin, StatsController.kpiParEquipement);
router.get('/evolution', auth, isAdmin, StatsController.kpiEvolution);

// Vérifie bien que exportKpiPdf existe dans ExportController.js !
router.get('/export/pdf', auth, (req, res, next) => {
    if (typeof ExportController.exportKpiPdf !== 'function') {
        return res.status(501).json({ message: "La méthode d'export PDF n'est pas encore implémentée dans le contrôleur." });
    }
    ExportController.exportKpiPdf(req, res, next);
});

module.exports = router;