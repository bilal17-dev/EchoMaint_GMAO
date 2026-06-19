const express = require('express');
const router = express.Router();
const DemandeInterventionController = require('../controllers/DemandeInterventionController');

// Import des middlewares de sécurité et de contrôle d'accès
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

// =========================================================================
// 1. ROUTES DE LECTURE (Filtrées automatiquement selon le rôle de l'utilisateur)
// =========================================================================
// Lister toutes les demandes d'intervention
router.get('/', auth, DemandeInterventionController.index);

// Consulter les détails d'une demande spécifique
router.get('/:id', auth, DemandeInterventionController.show);

// =========================================================================
// 2. ROUTE DE CRÉATION (Accessible principalement aux Clients)
// =========================================================================
// Soumettre un nouveau signalement de panne / DI
router.post('/', auth, DemandeInterventionController.store);

// =========================================================================
// 3. ROUTES DE TRAITEMENT ET VALIDATION (Strictement réservées à l'Admin)
// =========================================================================
// Rejeter une demande avec l'obligation de fournir un motif écrit
router.post('/:id/rejeter', auth, isAdmin, DemandeInterventionController.rejeter);

// Valider une demande et la convertir automatiquement en Ordre de Travail curatif
router.post('/:id/valider', auth, isAdmin, DemandeInterventionController.validerEtConvertir);

module.exports = router;