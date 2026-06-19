const express = require('express');
const router = express.Router();

const InterventionController = require('../controllers/InterventionController');
const ExportController = require('../controllers/ExportController'); // Import du contrôleur d'export

const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const handleUploadPhoto = require('../middlewares/upload.middleware');
const { validerCloture, validerReouverture } = require('../validators/intervention.validator');

// 1. LECTURE
router.get('/', auth, InterventionController.index);
router.get('/export/csv', auth, ExportController.exportOT); // Route pour exporter les interventions en CSV
router.get('/:id', auth, InterventionController.show);
router.get('/:id/rapport', auth, InterventionController.telechargerRapport);
router.get('/:id/photos', auth, InterventionController.recupererPhotos);

// 2. ADMINISTRATION
router.post('/', auth, isAdmin, InterventionController.store);
router.delete('/:id', auth, isAdmin, InterventionController.destroy);
router.post('/:id/assigner', auth, isAdmin, InterventionController.assigner);
router.post('/:id/rouvrir', auth, isAdmin, validerReouverture, InterventionController.rouvrir);
router.post('/:id/annuler', auth, isAdmin, InterventionController.annuler);

// 3. TERRAIN / CYCLE DE VIE
router.post('/:id/demarrer', auth, InterventionController.demarrer);
router.post('/:id/cloturer', auth, validerCloture, InterventionController.cloturer);
// Nouvelle route pour les commentaires
router.post('/:id/commentaires', auth, InterventionController.ajouterCommentaire);

// 4. PHOTOS
router.post('/:id/photos', auth, handleUploadPhoto, InterventionController.uploaderPhoto);
router.delete('/photos/:id', auth, InterventionController.supprimerPhoto);

module.exports = router;