const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

router.get('/',    ClientController.index);
router.post('/',   ClientController.store);
router.get('/:id', ClientController.show);
router.put('/:id', ClientController.update);

module.exports = router;