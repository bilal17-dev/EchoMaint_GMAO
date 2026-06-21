const express = require('express');
const router = express.Router();
const UtilisateurController = require('../controllers/UtilisateurController');
const auth = require('../middlewares/auth'); // Optionnel : pour protéger la création

// Route POST pour créer un technicien
router.post('/', UtilisateurController.store);
//  Route GET pour récupérer les techniciens (utilisée par le frontend)
router.get('/techniciens', UtilisateurController.getTechniciens);

module.exports = router;