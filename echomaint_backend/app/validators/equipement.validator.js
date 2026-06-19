const validerEquipement = (req, res, next) => {
  // On récupère les champs présents dans ta table equipements
  const { nom, reference, batiment_id, date_acquisition, statut, categorie, periodicite_preventive_jours } = req.body;

  const erreurs = [];

  // 1. Vérification des champs obligatoires (selon ta table)
  if (!nom) erreurs.push('Le nom de l\'équipement est obligatoire.');
  if (!batiment_id) erreurs.push('L\'identifiant du bâtiment (batiment_id) est obligatoire.');
  if (!statut) erreurs.push('Le statut est obligatoire.');
  if (!categorie) erreurs.push('La catégorie est obligatoire.');

  // 2. Validation du format UUID pour batiment_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (batiment_id && !uuidRegex.test(batiment_id)) {
    erreurs.push('Le format de batiment_id est invalide.');
  }

  // 3. Validation de la date d'acquisition
  if (date_acquisition && isNaN(Date.parse(date_acquisition))) {
    erreurs.push('La date d\'acquisition est invalide.');
  }

  // 4. Validation du statut (ALIGNÉ AVEC TES ENUM SQL)
  // J'ai mis 'en_service' au lieu de 'actif' car c'est ce que ta base attend
  const statutsAutorises = ['en_service', 'en_panne', 'hors_service'];
  if (statut && !statutsAutorises.includes(statut)) {
    erreurs.push('Le statut doit être : en_service, en_panne, ou hors_service.');
  }

  // 5. Validation des types numériques
  if (periodicite_preventive_jours !== undefined && isNaN(periodicite_preventive_jours)) {
    erreurs.push('La périodicité doit être un nombre.');
  }

  // S'il y a des erreurs, on bloque la requête avant d'atteindre le contrôleur
  if (erreurs.length > 0) {
    return res.status(400).json({ message: 'Données invalides pour l\'équipement.', erreurs });
  }

  next();
};

module.exports = validerEquipement;