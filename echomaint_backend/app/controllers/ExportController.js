const { Parser } = require('json2csv');
const Intervention = require('../models/Intervention');
const db = require('../../database/connection');

const ExportController = {
  
  // Export des interventions au format CSV
  exportOT: async (req, res) => {
    try {
      const interventions = await Intervention.findAll(req.query); 

      if (!interventions || interventions.length === 0) {
        return res.status(404).json({ message: "Aucune intervention trouvée pour l'export." });
      }

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(interventions);
      
      res.header('Content-Type', 'text/csv');
      res.attachment('interventions_export.csv');
      return res.send(csv);

    } catch (error) {
      console.error('[ExportController.exportOT]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  },

  // Export des indicateurs (KPI) au format PDF
  exportKpiPdf: async (req, res) => {
    try {
      // Pour l'instant, cette méthode est un placeholder pour éviter l'erreur de démarrage.
      // Tu pourras y intégrer une bibliothèque comme 'pdfkit' ou 'puppeteer' plus tard.
      return res.status(200).json({ 
        message: "La fonctionnalité d'export PDF est en cours de développement." 
      });
    } catch (error) {
      console.error('[ExportController.exportKpiPdf]', error);
      return res.status(500).json({ message: res.translate('error_serveur') });
    }
  }
};

module.exports = ExportController;