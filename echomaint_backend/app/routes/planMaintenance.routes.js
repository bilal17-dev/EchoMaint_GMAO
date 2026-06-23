const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/PlanMaintenanceController');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

// Routes protégées
router.get('/', auth, PlanController.index);
router.post('/', auth, isAdmin, PlanController.store);
router.delete('/:id', auth, isAdmin, PlanController.destroy);
router.put('/:id', auth, isAdmin, PlanController.update);

module.exports = router;