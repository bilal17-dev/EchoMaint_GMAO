const Intervention = require('../models/Intervention');
const Equipement   = require('../models/Equipement');
const preventiveService  = require('../services/preventive.service');
// Service de génération de rapport PDF (extrait du contrôleur pour séparation des responsabilités)
const interventionService = require('../services/intervention.service');
const db   = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');
const fs   = require('fs');
const path = require('path');

const TRANSITIONS = {
  planifiee: ['assignee', 'annulee'],
  assignee:  ['en_cours', 'annulee'],
  en_cours:  ['terminee'],
  terminee:  ['en_cours'],
  annulee:   [],
};

const InterventionController = {

  // ── GET /interventions ────────────────────────────────────────────────────
  index: async (req, res) => {
    try {
      const filtres = { ...req.query }

      // Isolation technicien : ne voit que ses propres OT
      if (req.user.role === 'technicien') filtres.technicien_id = req.user.id

      // Isolation client : ne voit que les interventions dont l'équipement
      // appartient à un bâtiment de SON entreprise (batiments.client_id).
      // Sans ce filtre un client pourrait lister les OT de toute la base.
      if (req.user.role === 'client') {
        if (!req.user.id_client) {
          return res.status(403).json({ message: "Compte client non associé à une entreprise." })
        }
        filtres.client_id = req.user.id_client
      }

      const interventions = await Intervention.findAll(filtres)
      return res.status(200).json({ data: interventions.map(i => ({ ...i, start: i.date_planifiee, title: i.titre })) })
    } catch (error) {
      console.error('[InterventionController.index]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── GET /interventions/:id ────────────────────────────────────────────────
  show: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      // Isolation client : on vérifie que l'intervention appartient bien
      // à un bâtiment de l'entreprise du client connecté.
      // On retourne 403 (et non 404) pour ne pas divulguer l'existence de l'OT.
      if (req.user.role === 'client') {
        if (!req.user.id_client || intervention.batiment_client_id !== req.user.id_client) {
          return res.status(403).json({ message: "Accès refusé : cette intervention ne vous appartient pas." })
        }
      }

      // ── Technicien ───────────────────────────────────────────────────────
      // findById ne fait pas de JOIN sur users — on charge séparément pour ne pas
      // alourdir toutes les requêtes internes qui utilisent aussi findById.
      if (intervention.technicien_id) {
        const tech = await db('users')
          .where({ id: intervention.technicien_id })
          .select('nom', 'prenom', 'email')
          .first()
        if (tech) {
          intervention.technicien_nom    = tech.nom
          intervention.technicien_prenom = tech.prenom
          intervention.technicien_email  = tech.email
        }
      }

      // ── Équipement : champs supplémentaires ──────────────────────────────
      // findById ne sélectionne que equipements.nom — on récupère la référence ici.
      if (intervention.equipement_id) {
        const equip = await db('equipements')
          .where({ id: intervention.equipement_id })
          .select('reference', 'marque', 'modele', 'numero_serie')
          .first()
        if (equip) {
          intervention.equipement_reference   = equip.reference
          intervention.equipement_marque      = equip.marque
          intervention.equipement_modele      = equip.modele
          intervention.equipement_numero_serie = equip.numero_serie
        }
      }

      // ── Commentaires avec nom de l'auteur ────────────────────────────────
      intervention.commentaires = await db('commentaires_intervention')
        .join('users', 'commentaires_intervention.user_id', 'users.id')
        .where('commentaires_intervention.intervention_id', req.params.id)
        .select('commentaires_intervention.*', 'users.nom', 'users.prenom')
        .orderBy('commentaires_intervention.created_at', 'asc')

      // ── Réouvertures avec nom de l'auteur ────────────────────────────────
      intervention.reouvertures = await db('reouvertures_ot')
        .join('users', 'reouvertures_ot.user_id', 'users.id')
        .where('reouvertures_ot.intervention_id', req.params.id)
        .select('reouvertures_ot.*', 'users.nom', 'users.prenom')
        .orderBy('reouvertures_ot.created_at', 'asc')

      // ── rapport_url ──────────────────────────────────────────────────────
      // On expose une URL d'API relative, pas le chemin disque absolu.
      // null  →  OT pas encore clôturé, ou rouvert (rapport invalidé)
      // string → rapport disponible, le frontend peut le télécharger via fetch+Blob
      intervention.rapport_url = intervention.rapport_pdf_chemin
        ? `/api/v1/interventions/${req.params.id}/rapport`
        : null

      return res.status(200).json({ data: intervention })
    } catch (error) {
      console.error('[InterventionController.show]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions ───────────────────────────────────────────────────
  store: async (req, res) => {
    try {
      const { equipement_id, type, priorite, titre, description, date_planifiee, technicien_id, plan_maintenance_id } = req.body
      if (!equipement_id || !type || !titre) return res.status(400).json({ message: "Champs obligatoires manquants." })

      let typeNettoye = type.toLowerCase().trim()
      if (typeNettoye === 'preventive')                        typeNettoye = 'preventif'
      if (typeNettoye === 'curatif' || typeNettoye === 'correctif') typeNettoye = 'curatif'

      if (typeNettoye === 'curatif') await Equipement.update(equipement_id, { statut: 'en_panne' })

      let datePlanifiee = date_planifiee ? new Date(date_planifiee) : new Date()
      if (isNaN(datePlanifiee.getTime())) return res.status(400).json({ message: "Format de date invalide." })

      const intervention = await Intervention.create({
        id: uuidv4(), titre, description, type: typeNettoye,
        priorite: priorite || 'normale',
        statut: technicien_id ? 'assignee' : 'planifiee',
        date_planifiee: datePlanifiee,
        equipement_id, technicien_id: technicien_id || null,
        plan_maintenance_id: plan_maintenance_id || null
      })
      return res.status(201).json({ data: intervention, message: "OT créé avec succès." })
    } catch (error) {
      console.error('[InterventionController.store]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions/:id/assigner ─────────────────────────────────────
  assigner: async (req, res) => {
    try {
      const { technicien_id } = req.body
      if (!technicien_id) return res.status(400).json({ message: "technicien_id est obligatoire." })

      const technicien = await db('users').where({ id: technicien_id, role: 'technicien' }).first()
      if (!technicien) return res.status(400).json({ message: "L'utilisateur sélectionné n'est pas un technicien." })

      const intervention = await Intervention.findById(req.params.id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      if (!TRANSITIONS[intervention.statut]?.includes('assignee'))
        return res.status(422).json({ error: 'INVALID_TRANSITION', message: `Impossible d'assigner depuis le statut "${intervention.statut}".` })

      const updated = await Intervention.update(req.params.id, { technicien_id, statut: 'assignee' })
      return res.status(200).json({ data: updated, message: "Technicien assigné." })
    } catch (error) {
      console.error('[InterventionController.assigner]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions/:id/demarrer ─────────────────────────────────────
  demarrer: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      if (!TRANSITIONS[intervention.statut]?.includes('en_cours'))
        return res.status(422).json({ error: 'INVALID_TRANSITION', message: `Impossible de démarrer depuis le statut "${intervention.statut}".` })

      if (req.user.role === 'technicien' && intervention.technicien_id !== req.user.id)
        return res.status(403).json({ message: "Vous n'êtes pas assigné à cette intervention." })

      const updated = await Intervention.update(req.params.id, { statut: 'en_cours', date_debut_reelle: new Date() })
      return res.status(200).json({ data: updated, message: "Intervention démarrée." })
    } catch (error) {
      console.error('[InterventionController.demarrer]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions/:id/cloturer ─────────────────────────────────────
  cloturer: async (req, res) => {
    try {
      const { id } = req.params
      const { commentaire_cloture, duree_reelle_minutes } = req.body

      if (!commentaire_cloture || commentaire_cloture.trim().length < 10)
        return res.status(400).json({ message: "Le commentaire doit faire au moins 10 caractères." })
      if (!duree_reelle_minutes || parseInt(duree_reelle_minutes) <= 0)
        return res.status(400).json({ message: "La durée réelle doit être un entier positif." })

      const intervention = await Intervention.findById(id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      if (!TRANSITIONS[intervention.statut]?.includes('terminee'))
        return res.status(422).json({ error: 'INVALID_TRANSITION', message: "Action impossible." })

      await Intervention.update(id, {
        statut: 'terminee',
        date_fin_reelle: new Date(),
        commentaire_cloture: commentaire_cloture.trim(),
        duree_reelle_minutes: parseInt(duree_reelle_minutes)
      })

      if (intervention.type === 'curatif')
        await Equipement.update(intervention.equipement_id, { statut: 'actif' })

      if (intervention.type === 'preventif' && intervention.plan_maintenance_id)
        await preventiveService.planifierProchaineIntervention(intervention.plan_maintenance_id, new Date())

      // ── Génération rapport PDF via intervention.service.js ──────────────
      // Non bloquant : un échec PDF ne doit pas annuler la clôture de l'OT
      try {
        const cheminPDF = await interventionService.genererRapportPDF(
          id,
          commentaire_cloture.trim(),
          parseInt(duree_reelle_minutes)
        )
        await db('interventions').where({ id }).update({ rapport_pdf_chemin: cheminPDF })
      } catch (pdfError) {
        console.error('[cloturer] Erreur génération PDF (non bloquant):', pdfError)
      }

      return res.status(200).json({ message: "Intervention clôturée avec succès." })
    } catch (error) {
      console.error('[InterventionController.cloturer]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions/:id/rouvrir ──────────────────────────────────────
  rouvrir: async (req, res) => {
    try {
      const { motif } = req.body
      if (!motif || motif.trim().length < 20)
        return res.status(422).json({ error: 'REOPEN_MOTIF_REQUIRED', message: "Le motif doit contenir au moins 20 caractères." })

      const intervention = await Intervention.findById(req.params.id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      if (intervention.statut !== 'terminee')
        return res.status(422).json({ error: 'INVALID_TRANSITION', message: `Impossible de rouvrir depuis le statut "${intervention.statut}".` })

      await db('reouvertures_ot').insert({
        id: uuidv4(),
        intervention_id: req.params.id,
        user_id: req.user.id,
        motif: motif.trim(),
        statut_precedent: intervention.statut,
        created_at: new Date()
      })

      const updated = await Intervention.update(req.params.id, {
        statut: 'en_cours',
        rapport_pdf_chemin: null
      })
      return res.status(200).json({ data: updated, message: "Intervention réouverte." })
    } catch (error) {
      console.error('[InterventionController.rouvrir]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions/:id/annuler ──────────────────────────────────────
  annuler: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      if (!TRANSITIONS[intervention.statut]?.includes('annulee'))
        return res.status(422).json({ error: 'INVALID_TRANSITION', message: `Impossible d'annuler depuis le statut "${intervention.statut}".` })

      const updated = await Intervention.update(req.params.id, { statut: 'annulee' })
      return res.status(200).json({ data: updated, message: "Intervention annulée." })
    } catch (error) {
      console.error('[InterventionController.annuler]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── DELETE /interventions/:id ─────────────────────────────────────────────
  destroy: async (req, res) => {
    try {
      await db('photos_intervention').where({ intervention_id: req.params.id }).delete()
      await db('commentaires_intervention').where({ intervention_id: req.params.id }).delete()
      await db('interventions').where({ id: req.params.id }).delete()
      return res.status(200).json({ message: "Supprimé avec succès." })
    } catch (error) {
      console.error('[InterventionController.destroy]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions/:id/photos ────────────────────────────────────────
  uploaderPhoto: async (req, res) => {
    try {
      const { id } = req.params
      const { type_photo } = req.body

      if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu." })
      if (!['avant', 'apres'].includes(type_photo))
        return res.status(400).json({ message: "type_photo doit être 'avant' ou 'apres'." })

      const intervention = await Intervention.findById(id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      if (!['assignee', 'en_cours'].includes(intervention.statut))
        return res.status(422).json({ error: "OT_NOT_IN_VALID_STATUS", message: "Upload impossible : statut invalide." })

      const photos = await db('photos_intervention').where({ intervention_id: id })
      const totalOctets = photos.reduce((sum, p) => sum + (p.taille_octets || 0), 0)
      if (totalOctets + req.file.size > 50 * 1024 * 1024)
        return res.status(422).json({ error: "TOTAL_SIZE_EXCEEDED", message: "Taille totale > 50 Mo." })

      await db('photos_intervention').insert({
        id: uuidv4(),
        intervention_id: id,
        type_photo,
        chemin_fichier: req.file.path,
        nom_original: req.file.originalname,
        taille_octets: req.file.size,
        created_at: new Date()
      })

      const photosMAJ = await db('photos_intervention').where({ intervention_id: id })
      return res.status(201).json({ data: photosMAJ, message: "Photo uploadée." })
    } catch (error) {
      console.error('[InterventionController.uploaderPhoto]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── GET /interventions/:id/photos ─────────────────────────────────────────
  recupererPhotos: async (req, res) => {
    try {
      const photos = await db('photos_intervention')
        .where({ intervention_id: req.params.id })
        .orderBy('created_at', 'asc')
      return res.status(200).json({ data: photos })
    } catch (error) {
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── DELETE /photos/:id ────────────────────────────────────────────────────
  supprimerPhoto: async (req, res) => {
    try {
      const photo = await db('photos_intervention').where({ id: req.params.id }).first()
      if (!photo) return res.status(404).json({ message: "Photo non trouvée." })
      if (fs.existsSync(photo.chemin_fichier)) fs.unlinkSync(photo.chemin_fichier)
      await db('photos_intervention').where({ id: req.params.id }).delete()
      return res.status(200).json({ message: "Photo supprimée." })
    } catch (error) {
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── GET /interventions/:id/rapport ────────────────────────────────────────
  telechargerRapport: async (req, res) => {
    try {
      const intervention = await Intervention.findById(req.params.id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      if (intervention.statut !== 'terminee')
        return res.status(403).json({ error: "RAPPORT_NOT_AVAILABLE", message: "Rapport disponible uniquement pour les OT clôturés." })

      if (!intervention.rapport_pdf_chemin || !fs.existsSync(intervention.rapport_pdf_chemin))
        return res.status(503).json({ error: "RAPPORT_NOT_AVAILABLE", message: "Rapport PDF non disponible." })

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="rapport_${req.params.id}.pdf"`)
      fs.createReadStream(intervention.rapport_pdf_chemin).pipe(res)
    } catch (error) {
      console.error('[InterventionController.telechargerRapport]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── POST /interventions/:id/commentaires ──────────────────────────────────
  ajouterCommentaire: async (req, res) => {
    try {
      const { contenu } = req.body
      if (!contenu || contenu.trim().length === 0)
        return res.status(400).json({ message: "Le contenu du commentaire est requis." })

      const intervention = await Intervention.findById(req.params.id)
      if (!intervention) return res.status(404).json({ message: "Intervention non trouvée." })

      await db('commentaires_intervention').insert({
        id: uuidv4(),
        intervention_id: req.params.id,
        user_id: req.user.id,
        contenu: contenu.trim(),
        created_at: new Date()
      })

      const commentaires = await db('commentaires_intervention')
        .join('users', 'commentaires_intervention.user_id', 'users.id')
        .where('commentaires_intervention.intervention_id', req.params.id)
        .select('commentaires_intervention.*', 'users.nom', 'users.prenom')
        .orderBy('commentaires_intervention.created_at', 'asc')

      return res.status(201).json({ data: commentaires, message: "Commentaire ajouté." })
    } catch (error) {
      console.error('[InterventionController.ajouterCommentaire]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

  // ── PUT /interventions/:id/replanifier ────────────────────────────────────
  // Permet de déplacer la date planifiée d'un OT qui n'a pas encore démarré.
  // Droits :
  //   - Admin    → peut replanifier n'importe quel OT en statut planifiee/assignee
  //   - Technicien → uniquement ses propres OT (technicien_id = son ID)
  replanifier: async (req, res) => {
    try {
      const { id } = req.params
      const { nouvelle_date_planifiee } = req.body

      // ── Validation 1 : champ obligatoire ──────────────────────────────
      if (!nouvelle_date_planifiee) {
        return res.status(422).json({
          message: "Le champ 'nouvelle_date_planifiee' est requis (format YYYY-MM-DD).",
        })
      }

      // ── Validation 2 : format YYYY-MM-DD ─────────────────────────────
      // On découpe manuellement pour construire une date locale (minuit heure locale).
      // new Date("YYYY-MM-DD") interpréterait en UTC et pourrait donner le jour précédent
      // dans certains fuseaux horaires — ce découpage évite ce piège.
      const parties = nouvelle_date_planifiee.split('-').map(Number)
      if (parties.length !== 3 || parties.some(isNaN)) {
        return res.status(422).json({ message: "Format de date invalide. Utilisez YYYY-MM-DD." })
      }
      const [annee, mois, jour] = parties
      const nouvelleDate = new Date(annee, mois - 1, jour) // minuit heure locale

      // ── Validation 3 : pas dans le passé ─────────────────────────────
      // On compare avec le début de la journée d'aujourd'hui pour autoriser la date du jour
      const aujourd_hui = new Date()
      aujourd_hui.setHours(0, 0, 0, 0)
      if (nouvelleDate < aujourd_hui) {
        return res.status(422).json({ message: "La nouvelle date ne peut pas être dans le passé." })
      }

      // ── Existence de l'OT ─────────────────────────────────────────────
      const intervention = await Intervention.findById(id)
      if (!intervention) {
        return res.status(404).json({ message: "Intervention non trouvée." })
      }

      // ── Vérification des droits d'accès ──────────────────────────────
      // Un technicien ne peut replanifier que ses propres OT.
      if (req.user.role !== 'admin') {
        if (intervention.technicien_id !== req.user.id) {
          return res.status(403).json({
            message: "Vous ne pouvez replanifier que vos propres interventions.",
          })
        }
      }

      // ── Validation 4 : statut compatible ─────────────────────────────
      // Un OT déjà démarré (en_cours), terminé ou annulé ne peut plus être déplacé.
      if (!['planifiee', 'assignee'].includes(intervention.statut)) {
        return res.status(422).json({
          code: 'STATUT_INVALIDE',
          message: `Impossible de replanifier un OT en statut '${intervention.statut}'. Seuls les statuts 'planifiee' et 'assignee' sont autorisés.`,
        })
      }

      // ── Mise à jour en base ───────────────────────────────────────────
      await db('interventions').where({ id }).update({
        date_planifiee: nouvelleDate,
        updated_at:     db.fn.now(),
      })

      // Retourne l'OT complet pour que le frontend puisse mettre à jour son état local
      const updated = await Intervention.findById(id)
      return res.status(200).json({
        message: "Intervention replanifiée avec succès.",
        data: updated,
      })
    } catch (error) {
      console.error('[InterventionController.replanifier]', error)
      return res.status(500).json({ message: "Erreur serveur." })
    }
  },

};

module.exports = InterventionController;