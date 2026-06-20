const { Parser } = require('json2csv');
const Intervention = require('../models/Intervention');

const ExportController = {
  // Export des interventions en CSV
  exportOT: async (req, res) => {
    try {
      const interventions = await Intervention.findAll(req.query);
      if (!interventions || interventions.length === 0) {
        return res.status(404).json({ message: "Aucune donnée disponible pour l'export." });
      }

      const fields = ['id', 'titre', 'equipement_nom', 'equipement_reference', 'statut', 'date_planifiee'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(interventions);
      
      res.header('Content-Type', 'text/csv');
      res.attachment('interventions.csv');
      return res.send(csv);
    } catch (error) {
      console.error('[ExportController.exportOT]', error);
      return res.status(500).json({ message: "Erreur lors de l'export CSV." });
    }
  },

  // Méthode ajoutée pour satisfaire la route /api/v1/stats/export/pdf
  // Pour le moment, elle renvoie une réponse indiquant qu'elle est en cours de développement
  exportKpiPdf: async (req, res) => {
    try {
      // Logique future pour générer un PDF avec des bibliothèques comme 'pdfkit' ou 'puppeteer'
      return res.status(501).json({ 
        message: "La fonctionnalité d'export PDF est en cours de développement." 
      });
    } catch (error) {
      console.error('[ExportController.exportKpiPdf]', error);
      return res.status(500).json({ message: "Erreur serveur lors de l'export PDF." });
    }
  }
};

module.exports = ExportController;