// Valide le fichier photo uploadé
const validerPhoto = (req, res, next) => {
  const erreurs = [];

  if (!req.file) erreurs.push('Le fichier photo est obligatoire.');

  const typesAutorises = ['avant', 'apres'];
  if (!req.body.type_photo) {
    erreurs.push('Le type (avant ou apres) est obligatoire.');
  } else if (!typesAutorises.includes(req.body.type_photo)) {
    erreurs.push('Le type doit être : avant ou apres.');
  }

  if (req.file) {
    // RG-PHOTO-01 : taille max 5 Mo
    if (req.file.size > 5 * 1024 * 1024) {
      erreurs.push('La photo ne peut pas dépasser 5 Mo.');
    }
    // RG-PHOTO-02 : format JPEG ou PNG uniquement
    const formatsAutorises = ['image/jpeg', 'image/png'];
    if (!formatsAutorises.includes(req.file.mimetype)) {
      return res.status(415).json({ message: 'Format non supporté. Utilisez JPEG ou PNG.' });
    }
  }

  if (erreurs.length > 0) {
    return res.status(400).json({ message: 'Données invalides.', erreurs });
  }
  next();
};

module.exports = validerPhoto;