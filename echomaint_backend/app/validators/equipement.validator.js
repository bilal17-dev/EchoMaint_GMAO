const validerEquipement = (req, res, next) => {
  // Récupération des nouveaux champs (et retrait des anciens)
  const { nom, batiment_id, statut, reference, type, marque, modele, numero_serie, date_installation } = req.body;

  const erreurs = [];

  // 1. Vérification des champs obligatoires
  if (!nom) erreurs.push('Le nom de l\'équipement est obligatoire.');
  if (!batiment_id) erreurs.push('L\'identifiant du bâtiment (batiment_id) est obligatoire.');
  if (!statut) erreurs.push('Le statut est obligatoire.');

  // 2. Validation du format UUID pour batiment_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (batiment_id && !uuidRegex.test(batiment_id)) {
    erreurs.push('Le format de batiment_id est invalide.');
  }

  // 3. Validation de la date d'installation
  if (date_installation && isNaN(Date.parse(date_installation))) {
    erreurs.push('La date d\'installation est invalide.');
  }

  // 4. Validation du statut (ALIGNÉ AVEC TES NOUVEAUX ENUM SQL)
  const statutsAutorises = ['en_service', 'en_panne', 'hors_service'];
  if (statut && !statutsAutorises.includes(statut)) {
    erreurs.push('Le statut doit être : en_service, en_panne, ou hors_service.');
  }

  // S'il y a des erreurs, on bloque la requête
  if (erreurs.length > 0) {
    return res.status(400).json({ message: 'Données invalides pour l\'équipement.', erreurs });
  }

  next();
};

module.exports = validerEquipement;