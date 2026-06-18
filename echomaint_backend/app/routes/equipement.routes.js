const express = require('express');
const router = express.Router();
const EquipementController = require('../controllers/EquipementController');

// Import des middlewares de sécurité et de validation
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const validerEquipement = require('../validators/equipement.validator'); // Gardé de la V1 !

// 1. ROUTES DE LECTURE (Ordre correct de la V2)
router.get('/', auth, EquipementController.index);
router.get('/:id/historique', auth, EquipementController.historique);
router.get('/:id', auth, EquipementController.show);

// 2. ROUTES D'ÉCRITURE & CONFIGURATION
// Création : Sécurisée + Validation du Body (V1)
router.post('/', auth, isAdmin, validerEquipement, EquipementController.store);

// Modification : Accessible au Tech et à l'Admin (V2)
router.put('/:id', auth, EquipementController.update);

// Suppression : Strictement Admin (V1 & V2)
router.delete('/:id', auth, isAdmin, EquipementController.destroy);

module.exports = router;