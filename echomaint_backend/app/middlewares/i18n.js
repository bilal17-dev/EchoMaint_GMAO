// Les dictionnaires de messages sont directement intégrés ici pour éviter de créer des dossiers/fichiers en plus
const traductions = {
  fr: {
    unauthorized: "Accès non autorisé. Token manquant ou invalide.",
    forbidden: "Action interdite. Droits insuffisants.",
    not_found: "Ressource introuvable.",
    error_serveur: "Une erreur technique est survenue sur le serveur.",
    di_creee: "Votre demande d'intervention a été soumise avec succès.",
    di_rejetee: "La demande d'intervention a été rejetée.",
    di_validee: "Demande validée avec succès ! L'ordre de travail curatif a été généré.",
    motif_requis: "Un motif de rejet explicite d'au moins 10 caractères est obligatoire."
  },
  en: {
    unauthorized: "Unauthorized access. Missing or invalid token.",
    forbidden: "Forbidden action. Insufficient permissions.",
    not_found: "Resource not found.",
    error_serveur: "A technical error occurred on the server.",
    di_creee: "Your intervention request has been successfully submitted.",
    di_rejetee: "The intervention request has been rejected.",
    di_validee: "Request successfully validated! Curative work order generated.",
    motif_requis: "An explicit rejection reason of at least 10 characters is required."
  }
};

const i18n = (req, res, next) => {
  // 1. Langue par défaut
  let lang = 'fr';

  // 2. PRIORITÉ 1 : Si l'utilisateur est authentifié, on prend sa préférence stockée en base
  if (req.user && req.user.langue) {
    lang = req.user.langue;
  }
  // 3. PRIORITÉ 2 : Sinon, on utilise le header du navigateur
  else {
    const langHeader = req.headers['accept-language'];
    if (langHeader && langHeader.toLowerCase().startsWith('en')) {
      lang = 'en';
    }
  }

  const messages = traductions[lang] || traductions.fr;

  res.translate = (cle) => {
    return messages[cle] || cle;
  };

  next();
};

module.exports = i18n;