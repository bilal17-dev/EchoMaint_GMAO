const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

// Assure-toi d'avoir ces deux lignes :
router.get('/', ClientController.index);
router.post('/', ClientController.store); // C'est sans doute ce qui manque !

module.exports = router;