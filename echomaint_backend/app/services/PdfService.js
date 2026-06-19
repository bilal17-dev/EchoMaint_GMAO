const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const PdfService = {
  /**
   * Génère un rapport PDF officiel pour une intervention donnée
   * @param {Object} data — Contient l'intervention, l'équipement, le client et les photos associées
   * @param {Object} res — L'objet de réponse Express pour streamer le PDF
   */
  genererRapportIntervention: (data, res) => {
    const { intervention, client, equipement, photos } = data;

    // 1. Initialiser le document PDF (Format A4, Marges standards)
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Configurer les en-têtes HTTP pour forcer le téléchargement du fichier PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename=Rapport_Intervention_${intervention.id.substring(0, 8)}.pdf`
    );

    // Rediriger le flux du PDF directement vers la réponse HTTP Express
    doc.pipe(res);

    // =========================================================================
    // EN-TÊTE DU RAPPORT
    // =========================================================================
    doc.fillColor('#1e3a8a').fontSize(20).text('RAPPORT OFFICIEL D\'INTERVENTION', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
    doc.moveDown(1.5);

    // =========================================================================
    // SECTION 1 : INFORMATIONS GÉNÉRALES
    // =========================================================================
    doc.fillColor('#1e293b').fontSize(14).text('1. Informations Générales', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#334155');
    doc.text(`Référence OT : ${intervention.id}`);
    doc.text(`Type d'intervention : ${intervention.type.toUpperCase()}`);
    doc.text(`Statut Actuel : ${intervention.statut.toUpperCase()}`);
    doc.text(`Date Planifiée : ${intervention.date_planifiee ? new Date(intervention.date_planifiee).toLocaleDateString('fr-FR') : 'Non planifiée'}`);
    doc.moveDown(1.5);

    // =========================================================================
    // SECTION 2 : ÉQUIPEMENT ET ENTREPRISE CLIENTE
    // =========================================================================
    doc.fillColor('#1e293b').fontSize(14).text('2. Localisation & Équipement', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#334155');
    doc.text(`Entreprise Cliente : ${client ? client.nom : 'Non spécifié'}`);
    doc.text(`Équipement : ${equipement ? equipement.nom : 'Non spécifié'}`);
    doc.moveDown(1.5);

    // =========================================================================
    // SECTION 3 : DESCRIPTION DES TRAVAUX
    // =========================================================================
    doc.fillColor('#1e293b').fontSize(14).text('3. Détails des Travaux', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#0f172a').text(`Sujet : ${intervention.titre}`, { bold: true });
    doc.moveDown(0.3);
    doc.fillColor('#475569').text(intervention.description || 'Aucune description.', { align: 'justify' });
    doc.moveDown(1.5);

    // =========================================================================
    // SECTION 4 : ANNEXES PHOTOGRAPHIQUES (Conforme CDC)
    // =========================================================================
    if (photos && photos.length > 0) {
      doc.addPage();
      doc.fillColor('#1e293b').fontSize(14).text('4. Annexes Photographiques', { underline: true });
      doc.moveDown(1);

      let x = 50;
      let y = doc.y;

      photos.forEach((photo, index) => {
        // Retour à la ligne si nécessaire
        if (index > 0 && index % 2 === 0) {
          x = 50;
          y += 180;
        }

        // Vérification de l'existence du fichier
        if (fs.existsSync(photo.chemin_fichier)) {
          doc.image(photo.chemin_fichier, x, y, { width: 220, height: 130 });
          doc.fontSize(10).fillColor('#475569').text(
            `${photo.type_photo.toUpperCase()} - ${new Date(photo.created_at).toLocaleDateString('fr-FR')}`, 
            x, y + 135, { width: 220, align: 'center' }
          );
        }
        x += 250;
      });
    }

    // =========================================================================
    // PIED DE PAGE
    // =========================================================================
    doc.y = 750;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#94a3b8').text('Document généré par le système GMAO.', { align: 'center' });
    
    doc.end();
  }
};

module.exports = PdfService;