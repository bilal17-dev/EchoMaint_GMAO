const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const auth = require('../middlewares/auth');

// Routes publiques
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Renouvelle le JWT via le refreshToken
router.post('/refresh', AuthController.refresh);

// Mot de passe oublié : envoie un email avec le lien de réinitialisation
router.post('/forgot-password', AuthController.forgotPassword);

// Réinitialisation du mot de passe : valide le token et met à jour le mot de passe
router.post('/reset-password', AuthController.resetPassword);

// Route protégée
router.post('/logout', auth, AuthController.logout);


module.exports = router;