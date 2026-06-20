const { Parser } = require('json2csv');
const Intervention = require('../models/Intervention');

const ExportController = {
  exportOT: async (req, res) => {
    try {
      const interventions = await Intervention.findAll(req.query);
      if (!interventions.length) return res.status(404).json({ message: "Aucune donnée." });

      const fields = ['id', 'titre', 'equipement_nom', 'equipement_reference', 'statut', 'date_planifiee'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(interventions);
      
      res.header('Content-Type', 'text/csv');
      res.attachment('interventions.csv');
      return res.send(csv);
    } catch (error) {
      return res.status(500).json({ message: "Erreur export." });
    }
  }
};

module.exports = ExportController;