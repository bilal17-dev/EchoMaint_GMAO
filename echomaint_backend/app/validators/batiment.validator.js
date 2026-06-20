const validerBatiment = (req, res, next) => {
  const { nom, adresse, ville, client_id, description } = req.body;
  const erreurs = [];

  // Nom
  if (!nom) erreurs.push('Le nom du bâtiment est obligatoire.');
  else if (nom.length < 2 || nom.length > 150) erreurs.push('Le nom doit faire entre 2 et 150 caractères.');

  // Adresse
  if (!adresse) erreurs.push('L\'adresse est obligatoire.');
  else if (adresse.length < 5 || adresse.length > 255) erreurs.push('L\'adresse doit faire entre 5 et 255 caractères.');

  // Ville
  if (!ville) erreurs.push('La ville est obligatoire.');

  // Client ID (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!client_id || !uuidRegex.test(client_id)) {
    erreurs.push('Un client_id valide (UUID) est obligatoire.');
  }

  // Description (Optionnelle mais on limite la taille si elle est présente)
  if (description && description.length > 1000) {
    erreurs.push('La description ne peut pas dépasser 1000 caractères.');
  }

  if (erreurs.length > 0) return res.status(400).json({ message: 'Données invalides.', erreurs });
  next();
};

module.exports = validerBatiment;