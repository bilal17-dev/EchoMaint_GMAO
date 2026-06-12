// Ce middleware autorise les techniciens et les administrateurs
const isTechnicien = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({ 
      message: 'Non authentifié.' 
    });
  }

  // On accepte le rôle "technicien" OU "admin"
  // Un admin peut toujours faire ce qu'un technicien peut faire
  if (req.user.role !== 'technicien' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Accès refusé. Cette action nécessite le rôle technicien ou administrateur.' 
    });
  }

  next();
};

module.exports = isTechnicien;