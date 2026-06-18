const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ton modèle unifié en Objet

// Dictionnaire de messages multilingues (FR/EN)
const messages = {
  fr: {
    champs_requis: 'Tous les champs obligatoires doivent être renseignés.',
    email_utilise: 'Cet email est déjà utilisé.',
    inscription_succes: 'Utilisateur créé avec succès !',
    email_requis: 'Email et mot de passe requis.',
    mot_de_passe_incorrect: 'Email ou mot de passe incorrect.',
    compte_desactive: 'Compte désactivé. Contactez l\'administrateur.',
    serveur_erreur: 'Une erreur serveur est survenue.'
  },
  en: {
    champs_requis: 'All required fields must be filled.',
    email_utilise: 'This email is already in use.',
    inscription_succes: 'User successfully created!',
    email_requis: 'Email and password are required.',
    mot_de_passe_incorrect: 'Incorrect email or password.',
    compte_desactive: 'Account disabled. Contact your administrator.',
    serveur_erreur: 'A server error occurred.'
  }
};

const AuthController = {

  // 1. INSCRIPTION (Register) - Accessible par l'Admin pour ajouter des techniciens/clients
  register: async (req, res) => {
    const lang = req.headers['accept-language'] === 'en' ? 'en' : 'fr';
    const m = messages[lang];

    try {
      const { nom, prenom, email, password, role, id_client, langue } = req.body;

      if (!nom || !prenom || !email || (!password && !req.body.mot_de_passe)) {
        return res.status(400).json({ message: m.champs_requis });
      }

      // Évite les doublons de compte
      const userExists = await User.findByEmail(email);
      if (userExists) {
        return res.status(400).json({ message: m.email_utilise });
      }

      // On laisse le modèle User gérer lui-même le hachage avec bcrypt et l'UUID !
      await User.create({
        nom,
        prenom,
        email,
        password: password || req.body.mot_de_passe,
        role: role || 'client',
        id_client: id_client || null,
        langue: langue || lang
      });

      return res.status(201).json({ message: m.inscription_succes });

    } catch (error) {
      console.error('[AuthController.register]', error);
      return res.status(500).json({ message: m.serveur_erreur });
    }
  },

  // 2. CONNEXION (Login) - Système sécurisé Access + Refresh Tokens
  login: async (req, res) => {
    const lang = req.headers['accept-language'] === 'en' ? 'en' : 'fr';
    const m = messages[lang];

    try {
      const { email, password } = req.body;
      const passwordSaisi = password || req.body.mot_de_passe;

      if (!email || !passwordSaisi) {
        return res.status(400).json({ message: m.email_requis });
      }

      // Recherche de l'utilisateur
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: m.mot_de_passe_incorrect });
      }

      // RÈGLE DE SÉCURITÉ : Vérifier si le compte n'a pas été bloqué/désactivé
      if (!user.actif) {
        return res.status(403).json({ message: m.compte_desactive });
      }

      // COHÉRENCE BASE DE DONNÉES : On utilise la méthode de comparaison de User
      // user.mot_de_passe provient directement de ta table MySQL
      const valide = await User.verifierMotDePasse(passwordSaisi, user.mot_de_passe);
      if (!valide) {
        return res.status(401).json({ message: m.mot_de_passe_incorrect });
      }

      // Génération de l'Access Token (Durée courte : 15 minutes par défaut)
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, id_client: user.id_client, langue: user.langue || lang },
        process.env.JWT_SECRET || 'supersecretgmao2026',
        { expiresIn: process.env.JWT_EXPIRY || '15m' }
      );

      // Génération du Refresh Token (Durée longue : 7 jours pour rester connecté)
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'supersecretrefreshgmao2026',
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
      );

      // Envoi de la réponse structurée au Frontend
      return res.status(200).json({
        token,
        refreshToken,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
          id_client: user.id_client,
          langue: user.langue || lang,
        }
      });

    } catch (error) {
      console.error('[AuthController.login]', error);
      return res.status(500).json({ message: m.serveur_erreur });
    }
  },

  // 3. REFRESH TOKEN - Regénère un Access Token valide sans redemander le mot de passe
  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(401).json({ message: 'Refresh token manquant.' });

      // Vérification de la signature du refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'supersecretrefreshgmao2026');
      
      const user = await User.findById(decoded.id);
      if (!user || !user.actif) return res.status(401).json({ message: 'Utilisateur invalide ou désactivé.' });

      // Nouveau jeton d'accès tout neuf
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

  // 4. DÉCONNEXION
  logout: async (req, res) => {
    // Le protocole JWT étant stateless, le client efface simplement les jetons de son LocalStorage.
    return res.status(200).json({ message: 'Déconnexion réussie.' });
  },
};

module.exports = AuthController;