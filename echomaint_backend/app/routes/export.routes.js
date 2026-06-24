const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/ExportController');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

router.get('/interventions', auth, isAdmin, ExportController.exportOT);
router.get('/kpi', auth, isAdmin, ExportController.exportKpiPdf);

module.exports = router;