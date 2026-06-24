const { Parser } = require('json2csv');
const db = require('../../database/connection');
const Intervention = require('../models/Intervention');

const ExportController = {

  exportOT: async (req, res) => {
    try {
      const interventions = await Intervention.findAll(req.query);
      if (!interventions || interventions.length === 0)
        return res.status(404).json({ message: "Aucune donnée disponible." });

      const format = req.query.format || 'csv';

      if (format === 'csv') {
        const fields = ['id', 'titre', 'type', 'statut', 'priorite', 'equipement_nom', 'batiment_nom', 'technicien_nom', 'date_planifiee', 'date_debut_reelle', 'date_fin_reelle', 'duree_reelle_minutes'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(interventions);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="echomaint_interventions_${Date.now()}.csv"`);
        return res.send('\uFEFF' + csv);
      }

      if (format === 'pdf') {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="echomaint_interventions_${Date.now()}.pdf"`);
        doc.pipe(res);

        doc.fillColor('#1e3a8a').fontSize(16).text('EchoMaint — Liste des interventions', { align: 'center' });
        doc.fontSize(10).fillColor('#64748b').text(`Généré le ${new Date().toLocaleString('fr-FR')} — ${interventions.length} OT`, { align: 'center' });
        doc.moveDown();

        // En-têtes tableau
        const cols = [
          { label: 'Titre',       w: 160 },
          { label: 'Type',        w: 60  },
          { label: 'Statut',      w: 65  },
          { label: 'Priorité',    w: 55  },
          { label: 'Équipement',  w: 90  },
          { label: 'Bâtiment',    w: 90  },
          { label: 'Technicien',  w: 90  },
          { label: 'Date planif.',w: 70  },
          { label: 'Durée (min)', w: 60  },
        ]

        let startX = 40
        let y = doc.y

        // Header row
        doc.rect(startX, y, cols.reduce((s,c) => s+c.w, 0), 18).fill('#1e3a8a')
        let x = startX
        cols.forEach(col => {
          doc.fillColor('#ffffff').fontSize(8).text(col.label, x + 3, y + 5, { width: col.w - 6 })
          x += col.w
        })
        y += 18

        // Data rows
        interventions.forEach((ot, idx) => {
          if (y > 520) { doc.addPage({ layout: 'landscape' }); y = 40 }
          const bg = idx % 2 === 0 ? '#F8FAFC' : '#ffffff'
          doc.rect(startX, y, cols.reduce((s,c) => s+c.w, 0), 16).fill(bg)
          x = startX
          const vals = [
            (ot.titre || '').substring(0, 30),
            ot.type || '—',
            ot.statut || '—',
            ot.priorite || '—',
            (ot.equipement_nom || '—').substring(0, 15),
            (ot.batiment_nom || '—').substring(0, 15),
            (ot.technicien_nom || 'Non assigné').substring(0, 15),
            ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString('fr-FR') : '—',
            ot.duree_reelle_minutes || '—',
          ]
          vals.forEach((val, i) => {
            doc.fillColor('#1e293b').fontSize(7).text(String(val), x + 3, y + 4, { width: cols[i].w - 6 })
            x += cols[i].w
          })
          y += 16
        })

        doc.end()
        return
      }

      return res.status(400).json({ error: 'INVALID_EXPORT_FORMAT', message: "Format invalide. Utilisez 'csv' ou 'pdf'." });
    } catch (error) {
      console.error('[ExportController.exportOT]', error);
      return res.status(500).json({ message: "Erreur lors de l'export." });
    }
  },

  exportKpiPdf: async (req, res) => {
    try {
      const format = req.query.format || 'pdf'
      const periode = parseInt(req.query.periode || '30', 10)
      const batiment_id = req.query.batiment_id

      const dateDebut = new Date()
      dateDebut.setDate(dateDebut.getDate() - periode)

      // Récupérer les KPI depuis la BDD
      let baseQuery = db('interventions')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('interventions.created_at', '>=', dateDebut)
      if (batiment_id) baseQuery = baseQuery.where('batiments.id', batiment_id)

      const mttrResult = await baseQuery.clone()
        .where({ 'interventions.type': 'curatif', 'interventions.statut': 'terminee' })
        .select(db.raw('SUM(duree_reelle_minutes) as total'), db.raw('COUNT(*) as nb'))
        .first()

      const totaux = await baseQuery.clone()
        .where('interventions.statut', 'terminee')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN interventions.type = "preventif" THEN 1 ELSE 0 END) as nb_prev'),
          db.raw('SUM(CASE WHEN interventions.type = "curatif" THEN 1 ELSE 0 END) as nb_cur')
        ).first()

      const enRetard = await baseQuery.clone()
        .where('interventions.date_planifiee', '<', new Date())
        .whereIn('interventions.statut', ['planifiee', 'assignee', 'en_cours'])
        .count('interventions.id as total').first()

      const nbPanne = await db('equipements')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('equipements.statut', 'en_panne')
        .count('equipements.id as total').first()

      const nbCuratifs = parseInt(mttrResult?.nb || 0)
      const mttr = nbCuratifs > 0 ? Math.round(mttrResult.total / nbCuratifs) : null
      const totalOT = parseInt(totaux?.total || 0)
      const tauxPreventif = totalOT > 0 ? Math.round((parseInt(totaux.nb_prev) / totalOT) * 100) : 0

      const kpis = [
        { label: 'Période analysée',        valeur: `${periode} jours` },
        { label: 'MTTR (temps moy. répar.)',  valeur: mttr ? `${mttr} min (${Math.round(mttr/60*10)/10}h)` : 'Aucun OT curatif clôturé' },
        { label: 'Taux préventif',           valeur: `${tauxPreventif}%` },
        { label: 'Taux curatif',             valeur: `${100 - tauxPreventif}%` },
        { label: 'OT en retard',             valeur: String(parseInt(enRetard?.total || 0)) },
        { label: 'Interventions (période)',   valeur: String(totalOT) },
        { label: 'Équipements en panne',     valeur: String(parseInt(nbPanne?.total || 0)) },
      ]

      if (format === 'csv') {
        const lignes = [
          'Indicateur;Valeur',
          ...kpis.map(k => `"${k.label}";"${k.valeur}"`)
        ].join('\n')
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="echomaint_kpi_${Date.now()}.csv"`)
        return res.send('\uFEFF' + lignes)
      }

      if (format === 'pdf') {
        const PDFDocument = require('pdfkit')
        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="echomaint_kpi_${Date.now()}.pdf"`)
        doc.pipe(res)

        // En-tête
        doc.fillColor('#1e3a8a').fontSize(20).text('EchoMaint — Tableau de bord KPI', { align: 'center' })
        doc.moveDown(0.3)
        doc.fillColor('#64748b').fontSize(11).text(`Période : ${periode} jours | Généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' })
        doc.moveDown()
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke()
        doc.moveDown()

        // KPI cards
        kpis.forEach((kpi, i) => {
          const yPos = doc.y
          const bg = i % 2 === 0 ? '#F8FAFC' : '#ffffff'
          doc.rect(50, yPos, 495, 36).fill(bg)
          doc.fillColor('#64748b').fontSize(11).text(kpi.label, 60, yPos + 8, { width: 280 })
          doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold').text(kpi.valeur, 340, yPos + 7, { width: 200, align: 'right' })
          doc.font('Helvetica')
          doc.moveDown(0.3)
        })

        doc.moveDown()
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke()
        doc.moveDown(0.5)
        doc.fillColor('#94a3b8').fontSize(9).text('Document généré automatiquement par EchoMaint GMAO', { align: 'center' })

        doc.end()
        return
      }

      return res.status(400).json({ error: 'INVALID_EXPORT_FORMAT', message: "Format invalide." })
    } catch (error) {
      console.error('[ExportController.exportKpiPdf]', error)
      return res.status(500).json({ message: "Erreur lors de l'export KPI." })
    }
  }
}

module.exports = ExportController