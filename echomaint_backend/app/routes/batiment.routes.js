const express = require('express');
const router = express.Router();
const BatimentController = require('../controllers/BatimentController');

// Import des middlewares de sécurité et de validation (Briques de Dev 3)
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const validerBatiment = require('../validators/batiment.validator');

/**
 * 1. ROUTES DE LECTURE
 * Accessibles à tout utilisateur connecté (Admin, Technicien, Client avec la restriction RG-06 dans le contrôleur)
 */
// Lire tous les bâtiments
router.get('/', auth, BatimentController.index);

// Lire un bâtiment précis par son ID
router.get('/:id', auth, BatimentController.show);

/**
 * 2. ROUTES D'ÉCRITURE
 * Strictement réservées à l'Administrateur connecté + Validation stricte du Body JSON incoming
 */
// Créer un bâtiment
router.post('/', auth, isAdmin, validerBatiment, BatimentController.store);

// Modifier un bâtiment
router.put('/:id', auth, isAdmin, validerBatiment, BatimentController.update);

// Supprimer un bâtiment
router.delete('/:id', auth, isAdmin, BatimentController.destroy);

module.exports = router;