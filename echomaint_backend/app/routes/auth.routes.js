const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// On importe le middleware auth pour la déconnexion
const auth = require('../middlewares/auth');

// Routes publiques : Pas de middleware ici, n'importe qui doit pouvoir y accéder
// Route pour l'inscription (Dev 1)
router.post('/register', AuthController.register);

// Route pour la connexion (Dev 1 -> fournit le token à Dev 2)
router.post('/login', AuthController.login);


// Route protégée : Il faut être connecté pour pouvoir se déconnecter
// Route pour la déconnexion
router.post('/logout', auth, AuthController.logout);

module.exports = router;