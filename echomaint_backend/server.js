// On charge les variables d'environnement depuis le fichier .env
require('dotenv').config();

// On importe Express pour créer notre serveur
const express = require('express');

// On importe CORS pour autoriser le frontend à communiquer avec le backend
const cors = require('cors');

const path = require('path');

// Démarrage du cron job (Le robot de maintenance préventive)
require('./jobs/preventive.job');

// Import des routes
const authRoutes         = require('./app/routes/auth.routes');
const batimentRoutes     = require('./app/routes/batiment.routes');
const equipementRoutes   = require('./app/routes/equipement.routes');
const interventionRoutes = require('./app/routes/intervention.routes');
const statsRoutes        = require('./app/routes/stats.routes');
const clientRoutes       = require('./app/routes/client.routes');
const demandeRoutes      = require('./app/routes/demande.routes');
const planningRoutes     = require('./app/routes/planning.routes');
const utilisateurRoutes  = require('./app/routes/utilisateur.routes');
// Ajout de la route pour les plans de maintenance
const planRoutes         = require('./app/routes/planMaintenance.routes');

// On crée l'application Express
const app = express();

// On dit à Express d'accepter les données JSON dans les requêtes
app.use(express.json());

// On autorise les requêtes venant d'autres origines
app.use(cors());

/**
 * MIDDLEWARE D'INTERNATIONALISATION (i18n)
 */
app.use((req, res, next) => {
  const lang = (req.user && req.user.langue) ? req.user.langue : 'fr';
  
  const translations = {
    fr: {
      champs_requis: "Tous les champs sont requis.",
      email_utilise: "Cet email est déjà utilisé.",
      inscription_succes: "Inscription réussie !",
      email_requis: "L'email est requis.",
      mot_de_passe_incorrect: "Email ou mot de passe incorrect.",
      compte_desactive: "Votre compte est désactivé.",
      serveur_erreur: "Une erreur interne est survenue."
    },
    en: {
      champs_requis: "All fields are required.",
      email_utilise: "Email already in use.",
      inscription_succes: "Registration successful!",
      email_requis: "Email is required.",
      mot_de_passe_incorrect: "Invalid email or password.",
      compte_desactive: "Your account is disabled.",
      serveur_erreur: "An internal server error occurred."
    }
  };

  res.translate = (key) => translations[lang][key] || key;
  next();
});

/**
 * DOSSIER STATIQUE
 */
const uploadPath = process.env.UPLOAD_PATH || 'storage';
app.use('/storage', express.static(path.join(__dirname, uploadPath)));

/**
 * BRANCHEMENT DES ROUTES
 */
const API_BASE = '/api/v1';

app.use(`${API_BASE}/auth`,         authRoutes);
app.use(`${API_BASE}/batiments`,    batimentRoutes);
app.use(`${API_BASE}/equipements`,  equipementRoutes);
app.use(`${API_BASE}/interventions`, interventionRoutes);
app.use(`${API_BASE}/plans`,        planRoutes); // Ajouté ici
app.use(`${API_BASE}/kpi`,          statsRoutes);
app.use(`${API_BASE}/clients`,      clientRoutes);
app.use(`${API_BASE}/demandes`,     demandeRoutes);
app.use(`${API_BASE}/planning`,     planningRoutes);
app.use(`${API_BASE}/utilisateurs`, utilisateurRoutes);

// Route de test générique
app.get('/', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Serveur EchoMaint API v2.1 opérationnel ✓' 
  });
});

// Gestion des routes inconnues
app.use((req, res) => {
  console.log(`[DEBUG 404] Route non trouvée tentée : ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'NOT_FOUND', 
    message: `La route ${req.originalUrl} n'existe pas sur ce serveur.` 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` EchoMaint Backend [Version 2.1] initialisé`);
  console.log(` URL de base : http://localhost:${PORT}${API_BASE}`);
  console.log(`===================================================`);
});