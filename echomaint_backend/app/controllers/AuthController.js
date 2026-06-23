const jwt = require('jsonwebtoken');
const User = require('../models/User');

const AuthController = {

  // 1. INSCRIPTION
  register: async (req, res) => {
    // Fusion : on garde le log et la gestion de langue distante
    console.log(req.body);
    const lang = req.headers['accept-language'] === 'en' ? 'en' : 'fr';
    // Note : assure-toi que l'objet 'messages' est bien importé ou accessible ici
    
    try {
      const { nom, prenom, email, password, mot_de_passe, role, id_client, langue } = req.body;
      const passFinal = password || mot_de_passe;

      if (!nom || !prenom || !email || !passFinal) {
        return res.status(400).json({ message: res.translate('champs_requis') });
      }

      const userExists = await User.findByEmail(email);
      if (userExists) {
        return res.status(400).json({ message: res.translate('email_utilise') });
      }

      await User.create({
        nom,
        prenom,
        email,
        mot_de_passe: passFinal,
        role: role || 'client',
        id_client: id_client || null,
        langue: langue || lang // On utilise la langue détectée par défaut
      });

      return res.status(201).json({ message: res.translate('inscription_succes') });

    } catch (error) {
      console.error('[AuthController.register]', error);
      return res.status(500).json({ message: res.translate('serveur_erreur') });
    }
  },

  // 2. CONNEXION
  login: async (req, res) => {
    try {
      const { email, password, mot_de_passe } = req.body;
      const passwordSaisi = password || mot_de_passe;

      if (!email || !passwordSaisi) {
        return res.status(400).json({ message: res.translate('email_requis') });
      }

      const user = await User.findByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: res.translate('mot_de_passe_incorrect') });
      }

      if (!user.actif) {
        return res.status(403).json({ message: res.translate('compte_desactive') });
      }

      const valide = await User.verifierMotDePasse(passwordSaisi, user.password_hash);
      if (!valide) {
        return res.status(401).json({ message: res.translate('mot_de_passe_incorrect') });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, id_client: user.id_client, langue: user.langue },
        process.env.JWT_SECRET || 'supersecretgmao2026',
        { expiresIn: process.env.JWT_EXPIRY || '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'supersecretrefreshgmao2026',
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
      );

      return res.status(200).json({
        token,
        refreshToken,
        user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, id_client: user.id_client, langue: user.langue }
      });

    } catch (error) {
      console.error('[AuthController.login]', error);
      return res.status(500).json({ message: res.translate('serveur_erreur') });
    }
  },

  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(401).json({ message: 'Refresh token manquant.' });

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'supersecretrefreshgmao2026');
      
      const user = await User.findById(decoded.id);
      if (!user || !user.actif) return res.status(401).json({ message: 'Utilisateur invalide ou désactivé.' });

      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, id_client: user.id_client, langue: user.langue },
        process.env.JWT_SECRET || 'supersecretgmao2026',
        { expiresIn: process.env.JWT_EXPIRY || '15m' }
      );

      return res.status(200).json({ token: newToken });
    } catch (error) {
      return res.status(401).json({ message: 'Refresh token invalide ou expiré.' });
    }
  },

  logout: async (req, res) => {
    return res.status(200).json({ message: 'Déconnexion réussie.' });
  }
};

module.exports = AuthController;