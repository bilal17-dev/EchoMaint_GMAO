 const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// Route publique pour l'inscription (Dev 1)
router.post('/register', AuthController.register);

// Route publique pour la connexion (Dev 1 -> donne le token à Dev 2)
router.post('/login', AuthController.login);

// Route pour la déconnexion
router.post('/logout', AuthController.logout);

module.exports = router;
