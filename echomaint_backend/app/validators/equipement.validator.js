// Ce validator vérifie les données reçues pour créer
// ou modifier un équipement

const validerEquipement = (req, res, next) => {

  const { code_inventaire, nom, categorie, batiment_id,
          date_acquisition, statut, periodicite_preventive_jours } = req.body;

  const erreurs = [];

  // Vérification du code_inventaire (RG-01 : doit être unique)
  if (!code_inventaire) {
    erreurs.push('Le code inventaire est obligatoire.');
  } else if (code_inventaire.length < 2) {
    erreurs.push('Le code inventaire doit contenir au moins 2 caractères.');
  } else if (code_inventaire.length > 100) {
    erreurs.push('Le code inventaire ne peut pas dépasser 100 caractères.');
  }

  // Vérification du nom
  if (!nom) {
    erreurs.push('Le nom de l\'équipement est obligatoire.');
  } else if (nom.length > 150) {
    erreurs.push('Le nom ne peut pas dépasser 150 caractères.');
  }

  // Vérification de la catégorie
  // Seules ces trois valeurs sont acceptées
  const categoriesAutorisees = ['technique', 'informatique', 'autre'];
  if (!categorie) {
    erreurs.push('La catégorie est obligatoire.');
  } else if (!categoriesAutorisees.includes(categorie)) {
    erreurs.push('La catégorie doit être : technique, informatique ou autre.');
  }

  // Vérification du batiment_id
  if (!batiment_id) {
    erreurs.push('L\'identifiant du bâtiment (batiment_id) est obligatoire.');
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(batiment_id)) {
      erreurs.push('Le format de batiment_id est invalide. Un UUID est attendu.');
    }
  }

  // Vérification de la date_acquisition
  if (!date_acquisition) {
    erreurs.push('La date d\'acquisition est obligatoire.');
  } else {
    // On vérifie que c'est bien une date valide
    const date = new Date(date_acquisition);
    if (isNaN(date.getTime())) {
      erreurs.push('La date d\'acquisition n\'est pas une date valide.');
    }
  }

  // Vérification du statut
  const statutsAutorises = ['en_service', 'en_panne', 'en_maintenance', 'hors_service'];
  if (!statut) {
    erreurs.push('Le statut est obligatoire.');
  } else if (!statutsAutorises.includes(statut)) {
    erreurs.push('Le statut doit être : en_service, en_panne, en_maintenance ou hors_service.');
  }

  // Vérification de la périodicité préventive
  if (!periodicite_preventive_jours) {
    erreurs.push('La périodicité préventive (en jours) est obligatoire.');
  } else if (!Number.isInteger(Number(periodicite_preventive_jours))) {
    erreurs.push('La périodicité préventive doit être un nombre entier.');
  } else if (Number(periodicite_preventive_jours) < 1) {
    erreurs.push('La périodicité préventive doit être d\'au moins 1 jour.');
  }

  // S'il y a des erreurs, on bloque et on les renvoie
  if (erreurs.length > 0) {
    return res.status(400).json({
      message: 'Données invalides pour l\'équipement.',
      erreurs: erreurs
    });
  }

  next();
};

module.exports = validerEquipement;