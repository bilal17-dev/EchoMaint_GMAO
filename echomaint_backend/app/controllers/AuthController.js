const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const db = require('../../database/connection');

// Transporteur nodemailer — configuré via les variables MAIL_* du .env
// IMPORTANT Gmail : il faut un "mot de passe d'application", PAS le vrai mot de passe du compte.
// Générer depuis : Mon compte Google > Sécurité > Authentification 2 facteurs > Mots de passe d'application
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

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
  },

  // 4. MOT DE PASSE OUBLIÉ — génère un token et envoie l'email de réinitialisation
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email requis.' });

      // Recherche de l'utilisateur en base
      const user = await User.findByEmail(email);

      if (user) {
        // Génère un token sécurisé de 64 caractères hexadécimaux
        const token = crypto.randomBytes(32).toString('hex');
        // Expiration : 1 heure à partir de maintenant
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        // Sauvegarde le token et sa date d'expiration dans users
        await db('users').where({ id: user.id }).update({
          reset_token: token,
          reset_token_expires: expires
        });

        // Lien pointant vers le frontend (configurable via FRONTEND_URL dans .env)
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

        // Envoi de l'email via nodemailer
        await transporter.sendMail({
          from: `"EchoMaint GMAO" <${process.env.MAIL_USER}>`,
          to: user.email,
          subject: 'Réinitialisation de votre mot de passe EchoMaint',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #123658;">Réinitialisation de votre mot de passe</h2>
              <p>Bonjour ${user.prenom},</p>
              <p>Vous avez demandé à réinitialiser votre mot de passe EchoMaint.</p>
              <p>Cliquez sur ce lien <strong>(valable 1 heure)</strong> :</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background: #123658; color: white; padding: 12px 28px;
                          border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                  Réinitialiser mon mot de passe
                </a>
              </p>
              <p style="color: #64748B; font-size: 13px;">
                Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                Votre mot de passe ne sera pas modifié.
              </p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
              <p style="color: #94A3B8; font-size: 12px;">L'équipe EchoMaint</p>
            </div>
          `
        });
      }

      // Réponse générique — ne révèle jamais si l'email existe en base (sécurité)
      return res.status(200).json({
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
      });

    } catch (error) {
      console.error('[AuthController.forgotPassword]', error);
      return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email. Vérifiez la configuration MAIL_* dans .env' });
    }
  },

  // 5. RÉINITIALISATION DU MOT DE PASSE — vérifie le token et met à jour le mot de passe
  resetPassword: async (req, res) => {
    try {
      const { token, nouveauMotDePasse } = req.body;

      if (!token || !nouveauMotDePasse) {
        return res.status(400).json({ message: 'Token et nouveau mot de passe requis.' });
      }

      if (nouveauMotDePasse.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      }

      // Cherche l'utilisateur avec ce token valide ET non expiré
      const user = await db('users')
        .where({ reset_token: token })
        .where('reset_token_expires', '>', new Date())
        .first();

      if (!user) {
        return res.status(400).json({ message: 'Lien expiré ou invalide.' });
      }

      // Hash le nouveau mot de passe (facteur 12 = sécurité recommandée)
      const password_hash = await bcrypt.hash(nouveauMotDePasse, 12);

      // Met à jour le mot de passe et invalide le token pour qu'il ne puisse être réutilisé
      await db('users').where({ id: user.id }).update({
        password_hash,
        reset_token: null,
        reset_token_expires: null
      });

      return res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });

    } catch (error) {
      console.error('[AuthController.resetPassword]', error);
      return res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe.' });
    }
  }
};

module.exports = AuthController;