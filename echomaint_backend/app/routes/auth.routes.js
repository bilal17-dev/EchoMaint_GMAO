const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const auth = require('../middlewares/auth');

// Routes publiques
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Bug #1 — route manquante : renouvelle le JWT via le refreshToken (expire jamais côté frontend)
router.post('/refresh', AuthController.refresh);

// Route protégée
router.post('/logout', auth, AuthController.logout);


module.exports = router;