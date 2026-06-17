const db = require('../../database/connection');
class Equipement {
  // Lister les équipements (avec filtrage par client si nécessaire - RG-06)
  static async getAll(userRole, userId) {
    let query = db('equipements')
      .join('batiments', 'equipements.batiment_id', '=', 'batiments.id')
      .select('equipements.*', 'batiments.nom as batiment_nom');

    if (userRole === 'client') {
      query = query.where('batiments.client_id', userId);
    }

    return query;
  }

  // Fiche détaillée d'un équipement avec les infos de son bâtiment
  static async getById(id) {
    return db('equipements')
      .join('batiments', 'equipements.batiment_id', '=', 'batiments.id')
      .select('equipements.*', 'batiments.nom as batiment_nom', 'batiments.adresse as batiment_adresse', 'batiments.client_id')
      .where('equipements.id', id)
      .first();
  }

  // Créer un équipement
  static async create(data) {
    return db('equipements').insert(data);
  }

  // Modifier un équipement ou changer son statut
  static async update(id, data) {
    return db('equipements').where({ id }).update(data);
  }

  // Supprimer un équipement
  static async delete(id) {
    return db('equipements').where({ id }).del();
  }
}

module.exports = Equipement;
