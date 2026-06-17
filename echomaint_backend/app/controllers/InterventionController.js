const crypto = require('crypto');
const preventiveService = require('../services/preventive.service');
const Intervention = require('../models/Intervention');

class InterventionController {
  
  /**
   * 1. CRÉER UNE INTERVENTION (POST)
   */
  async create(req, res) {
    try {
      const { equipement_id, type, priorite, description, date_planifiee, technicien_id } = req.body;

      if (!equipement_id || !type) {
        return res.status(400).json({ error: "L'ID de l'équipement et le type sont obligatoires." });
      }

      const nouvelId = crypto.randomUUID();

      // Utilisation du modèle Intervention
      await Intervention.create({
        id: nouvelId,
        equipement_id,
        type, 
        priorite: priorite || 'moyenne',
        statut: 'ouverte',
        description,
        date_planifiee: date_planifiee ? new Date(date_planifiee) : new Date(),
        date_cloture: null,
        technicien_id: technicien_id || null
      });

      return res.status(201).json({
        message: "Intervention créée avec succès !",
        interventionId: nouvelId
      });
    } catch (error) {
      console.error("Erreur création intervention :", error);
      return res.status(500).json({ error: "Erreur interne du serveur." });
    }
  }

  /**
   * 2. MODIFIER ET CLÔTURER UNE INTERVENTION (PUT) -> Règle RG-02
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { statut, priorite, description, technicien_id } = req.body;

      // Utilisation du modèle Intervention pour la récupération
      const interventionActuelle = await Intervention.getById(id);

      if (!interventionActuelle) {
        return res.status(404).json({ error: "Intervention non trouvée." });
      }

      const donnéesMiseÀJour = {
        priorite: priorite || interventionActuelle.priorite,
        description: description || interventionActuelle.description,
        statut: statut || interventionActuelle.statut,
        technicien_id: technicien_id || interventionActuelle.technicien_id
      };

      let vientDEtreCloturee = false;
      if (statut === 'cloturee' && interventionActuelle.statut !== 'cloturee') {
        donnéesMiseÀJour.date_cloture = new Date();
        vientDEtreCloturee = true;
      }

      // Utilisation du modèle Intervention pour la mise à jour
      await Intervention.update(id, donnéesMiseÀJour);

      // APPLICATION DE LA RÈGLE RG-02
      if (vientDEtreCloturee && interventionActuelle.type === 'preventive') {
        console.log(`[RG-02] Clôture détectée pour l'intervention préventive ${id}. Génération de la suivante...`);
        
        await preventiveService.planifierProchaineIntervention(
          interventionActuelle.equipement_id, 
          donnéesMiseÀJour.date_cloture
        );
      }

      return res.status(200).json({ message: "Intervention mise à jour avec succès !" });

    } catch (error) {
      console.error("Erreur modification intervention :", error);
      return res.status(500).json({ error: "Erreur interne du serveur." });
    }
  }
}

module.exports = new InterventionController();