const express = require('express')
const router  = express.Router()
const UtilisateurController = require('../controllers/UtilisateurController')
const auth    = require('../middlewares/auth')
const isAdmin = require('../middlewares/isAdmin')

router.get('/',              auth, isAdmin, UtilisateurController.index)
router.get('/techniciens',   auth,          UtilisateurController.getTechniciens)
router.post('/',             auth, isAdmin, UtilisateurController.store)
router.put('/:id',           auth, isAdmin, UtilisateurController.update)

module.exports = router