// ExportController.js — EchoMaint GMAO
// Gère les exports CSV et PDF pour les interventions (OT) et les KPI.
//
// Routes associées (export.routes.js) :
//   GET /api/v1/exports/interventions?format=csv|pdf&[filtres]
//   GET /api/v1/exports/kpi?format=csv|pdf&periode=30&[batiment_id]
//
// Filtres supportés pour les interventions (tous optionnels) :
//   statut, type, priorite, batiment_id, technicien_id,
//   date_planifiee_debut, date_planifiee_fin

const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const db = require('../../database/connection');
const Intervention = require('../models/Intervention');

const ExportController = {

  // ══════════════════════════════════════════════════════════════════════════
  // exportOT — GET /exports/interventions?format=csv|pdf&[filtres]
  //
  // Récupère les OT via Intervention.findAll() (tous les filtres query params
  // sont propagés — statut, type, priorite, batiment_id, technicien_id,
  // date_planifiee_debut, date_planifiee_fin).
  // Génère ensuite un CSV ou un PDF paysage A4 selon le paramètre format.
  // ══════════════════════════════════════════════════════════════════════════
  exportOT: async (req, res) => {
    try {
      // Tous les query params sont passés à findAll — les filtres sont appliqués
      // côté modèle depuis la correction de Intervention.js.
      const interventions = await Intervention.findAll(req.query);
      if (!interventions || interventions.length === 0)
        return res.status(404).json({ message: 'Aucune donnée disponible pour les filtres sélectionnés.' });

      const format = req.query.format || 'csv';

      // ── Export CSV ────────────────────────────────────────────────────────
      if (format === 'csv') {
        // Colonnes exportées — nb_reouvertures inclus (colonne directe sur la table).
        const fields = [
          'id',
          'titre',
          'type',
          'statut',
          'priorite',
          'equipement_nom',
          'batiment_nom',
          'technicien_nom',
          'date_planifiee',
          'date_debut_reelle',
          'date_fin_reelle',
          'duree_reelle_minutes',
          'nb_reouvertures',
        ];

        const parser = new Parser({ fields });
        const csv    = parser.parse(interventions);

        // BOM UTF-8 (﻿) pour que Excel ouvre directement sans problème d'encodage.
        const dateStr = new Date().toISOString().split('T')[0];
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.header('Content-Disposition', `attachment; filename="echomaint_interventions_${dateStr}.csv"`);
        return res.send('﻿' + csv);
      }

      // ── Export PDF ────────────────────────────────────────────────────────
      if (format === 'pdf') {
        // A4 paysage — donne ~762 pt de largeur utile (841,9 - 2×40 marges).
        const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });

        const dateStr = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="echomaint_interventions_${dateStr}.pdf"`);
        doc.pipe(res);

        // ── En-tête du document ─────────────────────────────────────────
        doc.fillColor('#1e3a8a').fontSize(16).font('Helvetica-Bold')
           .text('EchoMaint — Liste des interventions', { align: 'center' });
        doc.font('Helvetica');
        doc.fontSize(9).fillColor('#64748b')
           .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });

        // Ligne récapitulant les filtres actifs (rassure sur le périmètre de l'export)
        const filtresDesc = [];
        if (req.query.statut)               filtresDesc.push(`Statut : ${req.query.statut}`);
        if (req.query.type)                 filtresDesc.push(`Type : ${req.query.type}`);
        if (req.query.priorite)             filtresDesc.push(`Priorité : ${req.query.priorite}`);
        if (req.query.batiment_id)          filtresDesc.push('Bâtiment filtré');
        if (req.query.technicien_id)        filtresDesc.push('Technicien filtré');
        if (req.query.date_planifiee_debut) filtresDesc.push(`Du : ${req.query.date_planifiee_debut}`);
        if (req.query.date_planifiee_fin)   filtresDesc.push(`Au : ${req.query.date_planifiee_fin}`);

        if (filtresDesc.length > 0) {
          doc.fontSize(8).fillColor('#475569')
             .text(`Filtres appliqués : ${filtresDesc.join(' | ')}`, { align: 'center' });
        }
        doc.moveDown(0.8);

        // ── Définition des colonnes ─────────────────────────────────────
        // Chaque colonne a un label, une largeur (pt) et une fonction qui
        // extrait la valeur depuis l'objet OT.
        // Total : 762 pt → tient en A4 paysage avec marges 40 pt.
        const cols = [
          { label: 'Titre',        w: 150, val: (ot) => (ot.titre || '').substring(0, 27)                              },
          { label: 'Type',         w: 55,  val: (ot) => ot.type || '—'                                                  },
          { label: 'Statut',       w: 62,  val: (ot) => ot.statut || '—'                                                },
          { label: 'Priorité',     w: 52,  val: (ot) => ot.priorite || '—'                                              },
          { label: 'Équipement',   w: 100, val: (ot) => (ot.equipement_nom || '—').substring(0, 16)                     },
          { label: 'Bâtiment',     w: 90,  val: (ot) => (ot.batiment_nom || '—').substring(0, 14)                       },
          { label: 'Technicien',   w: 90,  val: (ot) => (ot.technicien_nom || 'Non assigné').substring(0, 14)           },
          { label: 'Date planif.', w: 68,  val: (ot) => ot.date_planifiee ? new Date(ot.date_planifiee).toLocaleDateString('fr-FR') : '—' },
          { label: 'Durée (min)',  w: 55,  val: (ot) => String(ot.duree_reelle_minutes ?? '—')                          },
          { label: 'Réouv.',       w: 40,  val: (ot) => String(ot.nb_reouvertures ?? 0)                                 },
        ];

        const totalW  = cols.reduce((s, c) => s + c.w, 0); // 762
        const startX  = 40;
        const ROW_H   = 16; // hauteur ligne données
        const HDR_H   = 18; // hauteur ligne en-tête
        let   y       = doc.y;
        let   x;

        // ── Ligne d'en-tête (fond indigo) ───────────────────────────────
        doc.rect(startX, y, totalW, HDR_H).fill('#1e3a8a');
        x = startX;
        cols.forEach(col => {
          doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
             .text(col.label, x + 3, y + 5, { width: col.w - 6, lineBreak: false });
          x += col.w;
        });
        doc.font('Helvetica');
        y += HDR_H;

        // ── Lignes de données (zébrées) ─────────────────────────────────
        interventions.forEach((ot, idx) => {
          // Saut de page si on dépasse le bas de la zone utile (530 pt en paysage)
          if (y > 530) {
            doc.addPage({ size: 'A4', layout: 'landscape' });
            y = 40;

            // Répéter l'en-tête sur la nouvelle page pour la lisibilité
            doc.rect(startX, y, totalW, HDR_H).fill('#1e3a8a');
            x = startX;
            cols.forEach(col => {
              doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
                 .text(col.label, x + 3, y + 5, { width: col.w - 6, lineBreak: false });
              x += col.w;
            });
            doc.font('Helvetica');
            y += HDR_H;
          }

          const bg = idx % 2 === 0 ? '#F8FAFC' : '#ffffff';
          doc.rect(startX, y, totalW, ROW_H).fill(bg);
          x = startX;
          cols.forEach(col => {
            doc.fillColor('#1e293b').fontSize(7)
               .text(String(col.val(ot)), x + 3, y + 4, { width: col.w - 6, lineBreak: false });
            x += col.w;
          });
          y += ROW_H;
        });

        // ── Pied de page ────────────────────────────────────────────────
        doc.moveDown(0.8);
        doc.moveTo(startX, doc.y).lineTo(startX + totalW, doc.y).strokeColor('#cbd5e1').stroke();
        doc.moveDown(0.3);
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
           .text(
             `Total : ${interventions.length} ordre(s) de travail exporté(s) — EchoMaint GMAO`,
             { align: 'center' }
           );

        doc.end();
        return;
      }

      return res.status(400).json({
        error: 'INVALID_EXPORT_FORMAT',
        message: "Format invalide. Utilisez 'csv' ou 'pdf'.",
      });
    } catch (error) {
      console.error('[ExportController.exportOT]', error);
      return res.status(500).json({ message: "Erreur lors de l'export des interventions." });
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // exportKpiPdf — GET /exports/kpi?format=csv|pdf&periode=30&[batiment_id]
  //
  // Calcule les KPI directement en BDD (MTTR, taux préventif, OT en retard,
  // équipements en panne, réouvertures) pour la période et le bâtiment
  // demandés, puis génère un CSV ou un PDF.
  // ══════════════════════════════════════════════════════════════════════════
  exportKpiPdf: async (req, res) => {
    try {
      const format     = req.query.format || 'pdf';
      const periode    = parseInt(req.query.periode || '30', 10);
      const batiment_id = req.query.batiment_id;

      // Date de début de la fenêtre d'analyse
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - periode);

      // Base de la requête : interventions sur la période, filtrées par bâtiment si fourni
      let baseQuery = db('interventions')
        .join('equipements', 'interventions.equipement_id', 'equipements.id')
        .join('batiments',   'equipements.batiment_id',     'batiments.id')
        .where('interventions.created_at', '>=', dateDebut);
      if (batiment_id) baseQuery = baseQuery.where('batiments.id', batiment_id);

      // MTTR : temps moyen de réparation sur les OT curatifs clôturés
      const mttrResult = await baseQuery.clone()
        .where({ 'interventions.type': 'curatif', 'interventions.statut': 'terminee' })
        .select(
          db.raw('SUM(duree_reelle_minutes) as total'),
          db.raw('COUNT(*) as nb')
        )
        .first();

      // Totaux préventif/curatif terminés (pour calculer les taux)
      const totaux = await baseQuery.clone()
        .where('interventions.statut', 'terminee')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw("SUM(CASE WHEN interventions.type = 'preventif' THEN 1 ELSE 0 END) as nb_prev"),
          db.raw("SUM(CASE WHEN interventions.type = 'curatif'   THEN 1 ELSE 0 END) as nb_cur")
        )
        .first();

      // OT en retard : date planifiée dépassée et pas encore terminés/annulés
      const enRetard = await baseQuery.clone()
        .where('interventions.date_planifiee', '<', new Date())
        .whereIn('interventions.statut', ['planifiee', 'assignee', 'en_cours'])
        .count('interventions.id as total')
        .first();

      // Équipements en panne (périmètre bâtiment si filtré)
      let panneQuery = db('equipements')
        .join('batiments', 'equipements.batiment_id', 'batiments.id')
        .where('equipements.statut', 'en_panne');
      if (batiment_id) panneQuery = panneQuery.where('batiments.id', batiment_id);
      const nbPanne = await panneQuery.count('equipements.id as total').first();

      // Réouvertures sur la période — nb_reouvertures est calculé depuis reouvertures_ot,
      // pas une colonne de la table interventions.
      const nbReouvertures = await baseQuery.clone()
        .whereExists(function () {
          this.select('id')
            .from('reouvertures_ot')
            .whereRaw('reouvertures_ot.intervention_id = interventions.id')
        })
        .count('interventions.id as total')
        .first();

      // Calculs dérivés
      const nbCuratifs     = parseInt(mttrResult?.nb   || 0);
      const mttr           = nbCuratifs > 0 ? Math.round(mttrResult.total / nbCuratifs) : null;
      const totalTermines  = parseInt(totaux?.total    || 0);
      const tauxPreventif  = totalTermines > 0 ? Math.round((parseInt(totaux.nb_prev) / totalTermines) * 100) : 0;

      // Tableau des indicateurs à exporter
      const kpis = [
        { label: 'Période analysée',          valeur: `${periode} jours` },
        { label: 'MTTR (temps moy. répar.)',   valeur: mttr ? `${mttr} min (${(mttr / 60).toFixed(1)} h)` : 'Aucun OT curatif clôturé' },
        { label: 'Taux préventif',             valeur: `${tauxPreventif} %` },
        { label: 'Taux curatif',               valeur: `${100 - tauxPreventif} %` },
        { label: 'OT en retard',               valeur: String(parseInt(enRetard?.total || 0)) },
        { label: 'Interventions clôturées',    valeur: String(totalTermines) },
        { label: 'Équipements en panne',       valeur: String(parseInt(nbPanne?.total || 0)) },
        { label: 'OT avec réouvertures',       valeur: String(parseInt(nbReouvertures?.total || 0)) },
      ];

      // ── Export CSV KPI ────────────────────────────────────────────────────
      if (format === 'csv') {
        // Format simple : une ligne par indicateur, séparateur point-virgule (compatible Excel FR)
        const lignes = [
          'Indicateur;Valeur',
          ...kpis.map(k => `"${k.label}";"${k.valeur}"`),
          '',
          `"Période";"${periode} jours"`,
          `"Bâtiment";"${batiment_id ? batiment_id : 'Tous'}"`,
          `"Généré le";"${new Date().toLocaleDateString('fr-FR')}"`,
        ].join('\n');

        const dateStr = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="echomaint_kpi_${dateStr}.csv"`);
        return res.send('﻿' + lignes); // BOM pour Excel
      }

      // ── Export PDF KPI ────────────────────────────────────────────────────
      if (format === 'pdf') {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        const dateStr = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="echomaint_kpi_${dateStr}.pdf"`);
        doc.pipe(res);

        // ── En-tête ────────────────────────────────────────────────────
        doc.fillColor('#1e3a8a').fontSize(20).font('Helvetica-Bold')
           .text('EchoMaint — Tableau de bord KPI', { align: 'center' });
        doc.font('Helvetica').moveDown(0.3);
        doc.fillColor('#64748b').fontSize(11)
           .text(
             `Période : ${periode} jours | Généré le ${new Date().toLocaleString('fr-FR')}`,
             { align: 'center' }
           );
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
        doc.moveDown(0.8);

        // ── Lignes KPI (style carte zébrée) ───────────────────────────
        kpis.forEach((kpi, i) => {
          const yPos = doc.y;
          const bg   = i % 2 === 0 ? '#F8FAFC' : '#ffffff';
          doc.rect(50, yPos, 495, 36).fill(bg);
          // Libellé (gauche)
          doc.fillColor('#64748b').fontSize(11).font('Helvetica')
             .text(kpi.label, 60, yPos + 10, { width: 280 });
          // Valeur (droite, en gras)
          doc.fillColor('#1e293b').fontSize(13).font('Helvetica-Bold')
             .text(kpi.valeur, 340, yPos + 9, { width: 200, align: 'right' });
          doc.font('Helvetica');
          // moveDown(0.3) avance doc.y d'environ 1 ligne de 11pt × 1.2 interligne
          doc.moveDown(0.3);
        });

        // ── Pied de page ───────────────────────────────────────────────
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
        doc.moveDown(0.5);
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
           .text('Document généré automatiquement par EchoMaint GMAO', { align: 'center' });

        doc.end();
        return;
      }

      return res.status(400).json({
        error: 'INVALID_EXPORT_FORMAT',
        message: "Format invalide. Utilisez 'csv' ou 'pdf'.",
      });
    } catch (error) {
      console.error('[ExportController.exportKpiPdf]', error);
      return res.status(500).json({ message: "Erreur lors de l'export KPI." });
    }
  },
};

module.exports = ExportController;
