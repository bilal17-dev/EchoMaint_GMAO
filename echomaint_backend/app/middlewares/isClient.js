// Ce middleware autorise uniquement les clients (lecture seule de leurs équipements)
const isClient = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({ 
      message: 'Non authentifié.' 
    });
  }

  if (req.user.role !== 'client') {
    return res.status(403).json({ 
      message: 'Accès refusé. Cette section est réservée aux clients.' 
    });
  }

  next();
};

module.exports = isClient;