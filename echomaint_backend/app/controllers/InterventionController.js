const Intervention = require('../models/Intervention');
const Equipement   = require('../models/Equipement');
const preventiveService = require('../services/preventive.service');
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
      if (req.user.role === 'technicien') filtres.technicien_id = req.user.id
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

      // Charger commentaires avec nom de l'auteur
      intervention.commentaires = await db('commentaires_intervention')
        .join('users', 'commentaires_intervention.user_id', 'users.id')
        .where('commentaires_intervention.intervention_id', req.params.id)
        .select('commentaires_intervention.*', 'users.nom', 'users.prenom')
        .orderBy('commentaires_intervention.created_at', 'asc')

      // Charger réouvertures
      intervention.reouvertures = await db('reouvertures_ot')
        .join('users', 'reouvertures_ot.user_id', 'users.id')
        .where('reouvertures_ot.intervention_id', req.params.id)
        .select('reouvertures_ot.*', 'users.nom', 'users.prenom')
        .orderBy('reouvertures_ot.created_at', 'asc')

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

      // ── Génération rapport PDF ──────────────────────────────────────────
      try {
        const PDFDocument = require('pdfkit')
        const interventionComplete = await Intervention.findById(id)
        const equipement = await db('equipements')
          .join('batiments', 'equipements.batiment_id', 'batiments.id')
          .join('clients',   'batiments.client_id',    'clients.id')
          .where('equipements.id', interventionComplete.equipement_id)
          .select('equipements.*', 'batiments.nom as batiment_nom', 'clients.nom as client_nom')
          .first()
        const technicien = interventionComplete.technicien_id
          ? await db('users').where({ id: interventionComplete.technicien_id }).select('nom', 'prenom').first()
          : null
        const photos = await db('photos_intervention').where({ intervention_id: id })

        const rapportDir = path.join(__dirname, '../../storage/rapports')
        if (!fs.existsSync(rapportDir)) fs.mkdirSync(rapportDir, { recursive: true })
        const rapportPath = path.join(rapportDir, `rapport_${id}.pdf`)

        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        const stream = fs.createWriteStream(rapportPath)
        doc.pipe(stream)

        // En-tête
        doc.fillColor('#1e3a8a').fontSize(20).text('RAPPORT D\'INTERVENTION', { align: 'center' })
        doc.moveDown(0.5)
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke()
        doc.moveDown(1)

        // Infos générales
        doc.fillColor('#1e293b').fontSize(13).text('Informations générales', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11).fillColor('#334155')
        doc.text(`Référence OT    : ${id}`)
        doc.text(`Type            : ${interventionComplete.type}`)
        doc.text(`Priorité        : ${interventionComplete.priorite}`)
        doc.text(`Date planifiée  : ${interventionComplete.date_planifiee ? new Date(interventionComplete.date_planifiee).toLocaleDateString('fr-FR') : '—'}`)
        doc.text(`Début réel      : ${interventionComplete.date_debut_reelle ? new Date(interventionComplete.date_debut_reelle).toLocaleString('fr-FR') : '—'}`)
        doc.text(`Fin réelle      : ${new Date().toLocaleString('fr-FR')}`)
        doc.text(`Durée réelle    : ${duree_reelle_minutes} minutes`)
        doc.moveDown(1)

        // Équipement
        doc.fillColor('#1e293b').fontSize(13).text('Équipement & localisation', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11).fillColor('#334155')
        doc.text(`Équipement : ${equipement?.nom ?? '—'} (Réf. ${equipement?.reference ?? '—'})`)
        doc.text(`Bâtiment   : ${equipement?.batiment_nom ?? '—'}`)
        doc.text(`Client     : ${equipement?.client_nom ?? '—'}`)
        doc.moveDown(1)

        // Technicien
        doc.fillColor('#1e293b').fontSize(13).text('Technicien', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11).fillColor('#334155')
        doc.text(technicien ? `${technicien.prenom} ${technicien.nom}` : 'Non assigné')
        doc.moveDown(1)

        // Description & clôture
        doc.fillColor('#1e293b').fontSize(13).text('Détails des travaux', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11).fillColor('#334155')
        doc.text(`Description         : ${interventionComplete.description || '—'}`)
        doc.text(`Commentaire clôture : ${commentaire_cloture.trim()}`)
        doc.moveDown(1)

        // Photos
        if (photos.length > 0) {
          doc.addPage()
          doc.fillColor('#1e293b').fontSize(13).text('Photos d\'intervention', { underline: true })
          doc.moveDown(1)
          let x = 50, y = doc.y
          photos.forEach((photo, index) => {
            if (index > 0 && index % 2 === 0) { x = 50; y += 190 }
            if (fs.existsSync(photo.chemin_fichier)) {
              doc.image(photo.chemin_fichier, x, y, { width: 200, height: 140 })
              doc.fontSize(9).fillColor('#475569')
                .text(`${photo.type_photo.toUpperCase()} — ${new Date(photo.created_at).toLocaleDateString('fr-FR')}`, x, y + 145, { width: 200, align: 'center' })
            }
            x += 260
          })
        }

        // Pied de page
        const pageCount = doc.bufferedPageRange?.().count ?? 1
        doc.y = 750
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke()
        doc.moveDown(0.5)
        doc.fontSize(9).fillColor('#94a3b8')
          .text(`Document généré le ${new Date().toLocaleString('fr-FR')} — EchoMaint GMAO`, { align: 'center' })

        doc.end()

        await new Promise((resolve, reject) => {
          stream.on('finish', resolve)
          stream.on('error', reject)
        })

        await db('interventions').where({ id }).update({ rapport_pdf_chemin: rapportPath })
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
};

module.exports = InterventionController;