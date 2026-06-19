const express = require('express');
const router = express.Router();
const PlanningController = require('../controllers/PlanningController');
const auth = require('../middlewares/auth');

router.get('/', auth, PlanningController.getPlanning);

module.exports = router;