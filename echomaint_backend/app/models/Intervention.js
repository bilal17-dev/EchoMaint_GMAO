const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Intervention = {

  findAll: async (filters = {}) => {
    let query = db('interventions')
      .select(
        'interventions.*',
        'equipements.nom as equipement_nom',
        'equipements.code_inventaire as equipement_code_inventaire',
        'batiments.nom as batiment_nom',
        db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom")
      )
      .join('equipements', 'interventions.equipement_id', 'equipements.id')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('users', 'interventions.technicien_id', 'users.id');

    // Filtres dynamiques
    if (filters.statut) query = query.where('interventions.statut', filters.statut);
    if (filters.type) query = query.where('interventions.type', filters.type);
    if (filters.technicien_id) query = query.where('interventions.technicien_id', filters.technicien_id);
    if (filters.batiment_id) query = query.where('batiments.id', filters.batiment_id);
    
    // Ajout important pour le Planning (J8) et l'Export (J9)
    if (filters.date_debut && filters.date_fin) {
      query = query.whereBetween('interventions.date_planifiee', [filters.date_debut, filters.date_fin]);
    }

    return query.orderBy('interventions.date_planifiee', 'asc');
  },

  findById: async (id) => {
    // ... (Ton code actuel est parfait ici)
    const intervention = await db('interventions')
      .select('interventions.*', 'equipements.nom as equipement_nom', 'batiments.nom as batiment_nom', db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom"))
      .join('equipements', 'interventions.equipement_id', 'equipements.id')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('users', 'interventions.technicien_id', 'users.id')
      .where('interventions.id', id).first();
      
    if (!intervention) return null;
    intervention.photos = await db('photos_intervention').where({ intervention_id: id });
    intervention.commentaires = await db('commentaires_intervention').select('commentaires_intervention.*', db.raw("CONCAT(users.prenom, ' ', users.nom) as auteur")).join('users', 'commentaires_intervention.user_id', 'users.id').where({ intervention_id: id });
    return intervention;
  },

  create: async (data) => {
    const id = uuidv4();
    await db('interventions').insert({
      id,
      titre: data.titre,
      description: data.description,
      type: data.type,
      statut: data.statut || 'a_planifier',
      priorite: data.priorite || 'moyenne',
      date_planifiee: data.date_planifiee || null,
      equipement_id: data.equipement_id,
      technicien_id: data.technicien_id || null,
      plan_maintenance_id: data.plan_maintenance_id || null // Ajout pour RG-02
    });
    return Intervention.findById(id);
  },

  update: async (id, data) => {
    // Ajout de la gestion de fin pour le MTTR (KPI J9)
    const updateData = {
        titre: data.titre,
        description: data.description,
        type: data.type,
        statut: data.statut,
        priorite: data.priorite,
        date_planifiee: data.date_planifiee,
        technicien_id: data.technicien_id,
        date_fin_reelle: data.date_fin_reelle || null,
        duree_reelle_minutes: data.duree_reelle_minutes || null,
        updated_at: db.fn.now()
    };
    await db('interventions').where({ id }).update(updateData);
    return Intervention.findById(id);
  }
};

module.exports = Intervention;