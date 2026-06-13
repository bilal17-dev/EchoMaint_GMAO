// Ce validator vérifie que les données reçues pour créer
// ou modifier un bâtiment sont correctes avant de les envoyer en base

const validerBatiment = (req, res, next) => {

  // On récupère les données envoyées dans le corps de la requête
  const { nom, adresse, client_id } = req.body;

  // Liste pour collecter toutes les erreurs trouvées
  const erreurs = [];

  // Vérification du champ "nom"
  if (!nom) {
    erreurs.push('Le nom du bâtiment est obligatoire.');
  } else if (nom.length < 2) {
    erreurs.push('Le nom du bâtiment doit contenir au moins 2 caractères.');
  } else if (nom.length > 150) {
    erreurs.push('Le nom du bâtiment ne peut pas dépasser 150 caractères.');
  }

  // Vérification du champ "adresse"
  if (!adresse) {
    erreurs.push('L\'adresse du bâtiment est obligatoire.');
  } else if (adresse.length < 5) {
    erreurs.push('L\'adresse doit contenir au moins 5 caractères.');
  } else if (adresse.length > 255) {
    erreurs.push('L\'adresse ne peut pas dépasser 255 caractères.');
  }

  // Vérification du champ "client_id"
  if (!client_id) {
    erreurs.push('L\'identifiant du client (client_id) est obligatoire.');
  } else {
    // Vérification que le format est bien un UUID
    // Un UUID ressemble à : a3f8c2d1-4b5e-6f7a-8b9c-0d1e2f3a4b5c
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(client_id)) {
      erreurs.push('Le format de client_id est invalide. Un UUID est attendu.');
    }
  }

  // S'il y a des erreurs, on les renvoie toutes et on bloque la requête
  if (erreurs.length > 0) {
    return res.status(400).json({
      message: 'Données invalides pour le bâtiment.',
      erreurs: erreurs
    });
  }

  // Tout est valide, on passe au controller
  next();
};

module.exports = validerBatiment;