const Equipement = require('../models/Equipement');
const Batiment = require('../models/Batiment');
const db = require('../../database/connection');

const EquipementController = {

  // GET /api/v1/equipements — Liste des équipements (Filtres, Pagination & RG-06)
  index: async (req, res) => {
    try {
      const { role, id_client } = req.user;

      const filters = {
        batiment_id: req.query.batiment_id,
        statut: req.query.statut,
        search: req.query.search,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        client_id: req.query.client_id // Filtre global pour admin/tech
      };

      // Le modèle unifié s'occupe de restreindre la requête si role === 'client'
      const equipements = await Equipement.findAll(role, id_client, filters);
      return res.status(200).json({ data: equipements });

    } catch (error) {
      console.error('[EquipementController.index]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des équipements.' });
    }
  },

  // GET /api/v1/equipements/:id — Fiche détaillée d'un équipement (Sécurisée)
  show: async (req, res) => {
    try {
      const { role, id_client } = req.user;

      const equipement = await Equipement.findById(req.params.id);
      if (!equipement) {
        return res.status(404).json({ message: 'Équipement introuvable.' });
      }

      // SÉCURITÉ (RG-06) : Un client ne peut pas tricher dans l'URL pour inspecter la machine d'un autre
      if (role === 'client' && equipement.client_id !== id_client) {
        return res.status(403).json({ message: 'Accès interdit à cet équipement.' });
      }

      return res.status(200).json({ data: equipement });
    } catch (error) {
      console.error('[EquipementController.show]', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'équipement.' });
    }
  },

  // POST /api/v1/equipements — Créer un équipement (Validations métiers incluses)
  store: async (req, res) => {
    try {
      const { nom, batiment_id, reference, code, date_installation } = req.body;

      if (!nom || !batiment_id) {
        return res.status(400).json({ message: 'Le nom et le batiment_id sont obligatoires.' });
      }

      // RG-REF-04 : La date d'installation ne peut pas être dans le futur
      if (date_installation && new Date(date_installation) > new Date()) {
        return res.status(422).json({
          message: 'La date d\'installation ne peut pas être dans le futur.'
        });
      }

      // RG-REF-01 : Référence (ou code) unique par bâtiment
      const refAssigne = reference || code;
      if (refAssigne) {
        const doublon = await db('equipements')
          .where({ batiment_id })
          .andWhere(function() {
            this.where({ code: refAssigne }).orWhere({ reference: refAssigne });
          })
          .whereNull('deleted_at')
          .first();

        if (doublon) {
          return res.status(409).json({
            message: 'Un équipement avec cet identifiant/référence existe déjà dans ce bâtiment.'
          });
        }
      }

      const equipement = await Equipement.create(req.body);
      return res.status(201).json({ data: equipement, message: 'Équipement créé avec succès !' });

    } catch (error) {
      console.error('[EquipementController.store]', error);
      return res.status(500).json({ message: 'Erreur lors de la création de l\'équipement.' });
    }
  },

  // PUT /api/v1/equipements/:id — Modifier un équipement ou changer son statut
  update: async (req, res) => {
    try {
      const equipement = await Equipement.findById(req.params.id);
      if (!equipement) {
        return res.status(404).json({ message: 'Équipement introuvable.' });
      }

      const updated = await Equipement.update(req.params.id, req.body);
      return res.status(200).json({ data: updated, message: 'Équipement mis à jour avec succès !' });

    } catch (error) {
      console.error('[EquipementController.update]', error);
      return res.status(500).json({ message: 'Erreur lors de la modification de l\'équipement.' });
    }
  },

  // DELETE /api/v1/equipements/:id — Suppression logique (Soft Delete) sécurisée
  destroy: async (req, res) => {
    try {
      const equipement = await Equipement.findById(req.params.id);
      if (!equipement) {
        return res.status(404).json({ message: 'Équipement introuvable.' });
      }

      // RG-REF-02 : Impossible de supprimer une machine si des Ordres de Travail (OT) sont ouverts
      const hasOT = await Equipement.hasOTActifs(req.params.id);
      if (hasOT) {
        return res.status(422).json({
          message: 'Impossible de supprimer cet équipement car il est associé à des interventions en cours.'
        });
      }

      // Utilisation du soft-delete du modèle pour préserver l'historique de maintenance global
      await Equipement.delete(req.params.id);
      return res.status(200).json({ message: 'Équipement archivé avec succès !' });

    } catch (error) {
      console.error('[EquipementController.destroy]', error);
      return res.status(500).json({ message: 'Erreur lors de la suppression de l\'équipement.' });
    }
  },

  // GET /api/v1/equipements/:id/historique — Cycle de vie & indicateurs de pannes
  historique: async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      // Récupération des interventions closes (historique de maintenance)
      const interventions = await db('interventions')
        .select('interventions.*', db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom"))
        .leftJoin('users', 'interventions.technicien_id', 'users.id')
        .where({ equipement_id: req.params.id })
        .whereIn('statut', ['terminee', 'annulee'])
        .orderBy('date_fin_reelle', 'desc')
        .limit(limit)
        .offset((page - 1) * limit);

      // Calcul des indicateurs clés (KPI de GMAO)
      const stats = await db('interventions')
        .where({ equipement_id: req.params.id, statut: 'terminee' })
        .select(
          db.raw('COUNT(*) as nb_total'),
          db.raw('AVG(duree_reelle_minutes) as duree_moyenne')
        )
        .first();

      return res.status(200).json({
        data: interventions,
        stats: {
          nb_total_interventions: parseInt(stats.nb_total, 10) || 0,
          duree_moyenne_minutes: Math.round(stats.duree_moyenne) || 0,
        }
      });

    } catch (error) {
      console.error('[EquipementController.historique]', error);
      return res.status(500).json({ message: 'Erreur lors du calcul de l\'historique.' });
    }
  },
};

module.exports = EquipementController;