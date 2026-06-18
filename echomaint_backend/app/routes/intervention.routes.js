const express = require('express');
const router = express.Router();
const InterventionController = require('../controllers/InterventionController');

// Import des middlewares de sécurité et de contrôle d'accès
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const isTechnicien = require('../middlewares/isTechnicien');

// Import des validateurs de données
const { validerCloture, validerReouverture } = require('../validators/intervention.validator');

// =========================================================================
// 1. ROUTES DE LECTURE (Accessibles à tout utilisateur connecté)
// =========================================================================
// Lister toutes les interventions avec filtres
router.get('/', auth, InterventionController.index);

// Afficher les détails d'une intervention précise
router.get('/:id', auth, InterventionController.show);

// Téléchargement du rapport de restitution PDF (Seulement si cloturée)
router.get('/:id/rapport', auth, InterventionController.rapport);

// =========================================================================
// 2. ROUTES DE CRÉATION ET CONFIGURATION (Réservées à l'Administrateur)
// =========================================================================
// Créer un nouvel ordre de travail
router.post('/', auth, isAdmin, InterventionController.store);

// Assigner un technicien qualifié à un OT
router.post('/:id/assigner', auth, isAdmin, InterventionController.assigner);

// Réouverture motivée suite à un contrôle qualité (Nécessite une validation du motif)
router.post('/:id/rouvrir', auth, isAdmin, validerReouverture, InterventionController.rouvrir);

// Abandon ou annulation définitive d'une intervention
router.post('/:id/annuler', auth, isAdmin, InterventionController.annuler);

// =========================================================================
// 3. ROUTES TERRAIN / CYCLE DE VIE (Réservées aux Techniciens)
// =========================================================================
// Lancement des travaux sur le terrain
router.post('/:id/demarrer', auth, isTechnicien, InterventionController.demarrer);

// Clôture technique et rapport d'intervention (Nécessite la validation des KPI comme la durée)
router.post('/:id/cloturer', auth, isTechnicien, validerCloture, InterventionController.cloturer);

module.exports = router;