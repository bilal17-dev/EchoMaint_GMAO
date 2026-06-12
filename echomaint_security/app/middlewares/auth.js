// On importe jsonwebtoken pour pouvoir vérifier les tokens
const jwt = require('jsonwebtoken');

// Ce middleware vérifie que la requête contient un token JWT valide
const auth = (req, res, next) => {

  // On cherche le token dans le header "Authorization" de la requête
  // Le format attendu est : "Bearer eyJhbGciOiJIUzI1NiIs..."
  const authHeader = req.headers['authorization'];

  // Si aucun header Authorization n'est présent, on refuse l'accès
  if (!authHeader) {
    return res.status(401).json({ 
      message: 'Accès refusé. Aucun token fourni.' 
    });
  }

  // On extrait uniquement le token (on enlève le mot "Bearer ")
  const token = authHeader.split(' ')[1];

  // Si le header était là mais sans token après "Bearer"
  if (!token) {
    return res.status(401).json({ 
      message: 'Accès refusé. Format du token invalide.' 
    });
  }

  try {
    // On vérifie que le token est valide avec notre clé secrète
    // Si le token a été modifié ou est expiré, jwt.verify lève une erreur
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On injecte les informations de l'utilisateur dans la requête
    // Ainsi les controllers pourront faire req.user.id ou req.user.role
    req.user = decoded;

    // On passe à l'étape suivante (le controller)
    next();

  } catch (error) {
    // Le token est invalide ou expiré
    return res.status(401).json({ 
      message: 'Token invalide ou expiré. Veuillez vous reconnecter.' 
    });
  }
};

module.exports = auth;