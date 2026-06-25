const express = require('express')
const router  = express.Router()
const UtilisateurController = require('../controllers/UtilisateurController')
const auth    = require('../middlewares/auth')
const isAdmin = require('../middlewares/isAdmin')

router.get('/',              auth, isAdmin, UtilisateurController.index)
router.get('/techniciens',   auth,          UtilisateurController.getTechniciens)
router.post('/',             auth, isAdmin, UtilisateurController.store)
// Route Bug #3 — modifiable par l'utilisateur lui-même ou un admin (sans isAdmin)
router.put('/:id/langue',    auth,          UtilisateurController.updateLangue)
// Route dédiée pour activer/désactiver un compte — doit être avant /:id pour qu'Express
// ne confonde pas "statut" avec un UUID.
router.put('/:id/statut',    auth, isAdmin, UtilisateurController.updateStatut)
router.put('/:id',           auth, isAdmin, UtilisateurController.update)

module.exports = router