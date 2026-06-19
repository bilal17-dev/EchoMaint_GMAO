const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const auth = require('../middlewares/auth');

// Routes publiques
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Route protégée
router.post('/logout', auth, AuthController.logout);


module.exports = router;