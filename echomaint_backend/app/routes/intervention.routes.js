const express = require('express');
const router = express.Router();
const InterventionController = require('../controllers/InterventionController');


const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

// Route pour créer une intervention (Seul un admin connecté peut le faire)
router.post('/', auth, isAdmin, InterventionController.create);

// Route pour mettre à jour / clôturer une intervention (Un utilisateur connecté peut le faire, ex: le technicien)
router.put('/:id', auth, InterventionController.update);

module.exports = router;