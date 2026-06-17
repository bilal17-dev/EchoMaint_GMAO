const db = require('../../database/connection');

class Batiment {
  // Récupérer tous les bâtiments (avec filtre par client si nécessaire)
  static async getAll(userRole, userId) {
    if (userRole === 'client') {
      // Un client ne voit que ses bâtiments rattachés (RG-06)
      return db('batiments').where({ client_id: userId });
    }
    // L'admin et le technicien voient tout
    return db('batiments');
  }

  // Trouver un bâtiment par son ID
  static async getById(id) {
    return db('batiments').where({ id }).first();
  }

  // Créer un bâtiment
  static async create(data) {
    return db('batiments').insert(data);
  }

  // Modifier un bâtiment
  static async update(id, data) {
    return db('batiments').where({ id }).update(data);
  }

  // Supprimer un bâtiment
  static async delete(id) {
    return db('batiments').where({ id }).del();
  }
}

module.exports = Batiment;