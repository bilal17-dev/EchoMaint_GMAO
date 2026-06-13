 const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // On importe ton modèle tout neuf !

class AuthController {
  
  // 1. INSCRIPTION (Register) - Hachage du mot de passe
  static async register(req, res) {
    try {
      const { nom, prenom, email, mot_de_passe, role } = req.body;

      // Vérifier si l'utilisateur existe déjà
      const userExists = await User.findByEmail(email);
      if (userExists) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
      }

      // Hachage du mot de passe (bcrypt)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

      // Insertion en base de données via le modèle User
      await User.create({
        nom,
        prenom,
        email,
        mot_de_passe: hashedPassword, // On enregistre la version sécurisée hachée
        role: role || 'client' // 'client' par défaut si non spécifié
      });

      return res.status(201).json({ 
        message: 'Utilisateur créé avec succès !' 
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de l\'inscription : ' + error.message });
    }
  }

  // 2. CONNEXION (Login) - Vérification et génération du Token JWT
  static async login(req, res) {
    try {
      const { email, mot_de_passe } = req.body;

      // Trouver l'utilisateur par son email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }

      // Vérifier si le mot de passe correspond avec bcrypt
      const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
      if (!isMatch) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }

      // Structure du token JWT (Le contrat pour Dev 3 et Dev 2)
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role // Très important pour que la sécurité de Dev 3 fonctionne !
      };

      // Signature du token avec la clé du fichier .env
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'supersecretgmao2026',
        { expiresIn: '24h' }
      );

      // Réponse envoyée au Frontend (Dev 2)
      return res.status(200).json({
        message: 'Connexion réussie',
        token: `Bearer ${token}`,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la connexion : ' + error.message });
    }
  }

  // 3. DÉCONNEXION
  static async logout(req, res) {
    return res.status(200).json({ message: 'Déconnexion réussie' });
  }
}

module.exports = AuthController;
