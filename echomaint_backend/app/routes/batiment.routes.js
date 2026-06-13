 const express = require('express');
const router = express.Router();
const BatimentController = require('../controllers/BatimentController');

// Import des briques de Dev 3
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const validerBatiment = require('../validators/batiment.validator');

// Routes de lecture (accessibles à tout utilisateur connecté)
router.get('/', auth, BatimentController.index);
router.get('/:id', auth, BatimentController.show);

// Routes d'écriture (Seul l'admin a les droits, et on valide les données entrantes)
router.post('/', auth, isAdmin, validerBatiment, BatimentController.store);
router.put('/:id', auth, isAdmin, validerBatiment, BatimentController.update);
router.delete('/:id', auth, isAdmin, BatimentController.destroy);

module.exports = router;
