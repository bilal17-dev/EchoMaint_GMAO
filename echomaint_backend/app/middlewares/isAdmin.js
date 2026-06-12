// Ce middleware vérifie que l'utilisateur connecté est un administrateur
const isAdmin = (req, res, next) => {

  // req.user a été injecté par le middleware auth.js juste avant
  // Si ce middleware est appelé sans auth.js avant lui, req.user sera undefined
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Non authentifié.' 
    });
  }

  // On vérifie que le rôle est bien "admin"
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Accès refusé. Cette action nécessite le rôle administrateur.' 
    });
  }

  // L'utilisateur est bien admin, on continue
  next();
};

module.exports = isAdmin;