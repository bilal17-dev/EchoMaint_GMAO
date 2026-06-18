// Valide les données lors de la clôture d'une intervention
const validerCloture = (req, res, next) => {
  const { commentaire_cloture, duree_reelle_minutes } = req.body;
  const erreurs = [];

  // RG-OT-03 : commentaire obligatoire minimum 10 caractères
  if (!commentaire_cloture) {
    erreurs.push('Le commentaire de clôture est obligatoire.');
  } else if (commentaire_cloture.length < 10) {
    erreurs.push('Le commentaire doit contenir au moins 10 caractères.');
  }

  // RG-OT-03 : durée obligatoire entier positif
  if (!duree_reelle_minutes) {
    erreurs.push('La durée réelle en minutes est obligatoire.');
  } else if (!Number.isInteger(Number(duree_reelle_minutes))) {
    erreurs.push('La durée doit être un nombre entier.');
  } else if (Number(duree_reelle_minutes) <= 0) {
    erreurs.push('La durée doit être supérieure à 0.');
  }

  if (erreurs.length > 0) {
    return res.status(400).json({ message: 'Données invalides.', erreurs });
  }
  next();
};

// Valide les données lors de la réouverture d'une intervention
const validerReouverture = (req, res, next) => {
  const { motif } = req.body;
  const erreurs = [];

  // RG-OT-04 : motif obligatoire minimum 20 caractères
  if (!motif) {
    erreurs.push('Le motif de réouverture est obligatoire.');
  } else if (motif.length < 20) {
    erreurs.push('Le motif doit contenir au moins 20 caractères.');
  }

  if (erreurs.length > 0) {
    return res.status(400).json({ message: 'Données invalides.', erreurs });
  }
  next();
};

module.exports = { validerCloture, validerReouverture };