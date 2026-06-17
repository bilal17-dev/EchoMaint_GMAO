const express = require('express');
const router = express.Router();
const EquipementController = require('../controllers/EquipementController');

// Import des middlewares de sécurité (Briques de Dev 3)
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

/**
 * 1. ROUTES DE LECTURE
 * Accessibles à tout utilisateur connecté (Admin, Technicien, Client)
 */
// Lire tous les équipements
router.get('/', auth, EquipementController.index);

// Lire un équipement précis par son ID
router.get('/:id', auth, EquipementController.show);

/**
 * 2. ROUTES D'ÉCRITURE & CONFIGURATION
 */
// Créer un équipement (Strictement réservé à l'Admin)
router.post('/', auth, isAdmin, EquipementController.store);

// Modifier un équipement (Accessible à l'Admin et au Technicien pour changer le statut ou mettre à jour)
router.put('/:id', auth, EquipementController.update);

// Supprimer un équipement (Strictement réservé à l'Admin)
router.delete('/:id', auth, isAdmin, EquipementController.destroy);

module.exports = router;