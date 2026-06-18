// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      "nav": {
        "dashboard": "Tableau de Bord",
        "batiments": "Bâtiments",
        "equipements": "Équipements",
        "interventions": "Interventions"
      },
      "batiments": {
        "title": "Référentiel des Bâtiments",
        "subtitle": "Gérez les sites et locaux de vos clients",
        "add_btn": "Ajouter un bâtiment",
        "table_name": "Nom du bâtiment",
        "table_client": "Client associé",
        "table_address": "Adresse / Localisation"
      },
      "equipements": {
        "title": "Gestion du Parc Équipements",
        "export_csv": "Exporter en CSV",
        "search_placeholder": "Rechercher un équipement (S/N, Type...)"
      }
    }
  },
  en: {
    translation: {
      "nav": {
        "dashboard": "Dashboard",
        "batiments": "Buildings",
        "equipements": "Equipments",
        "interventions": "Interventions"
      },
      "batiments": {
        "title": "Buildings Registry",
        "subtitle": "Manage your clients' sites and premises",
        "add_btn": "Add a building",
        "table_name": "Building Name",
        "table_client": "Associated Client",
        "table_address": "Address / Location"
      },
      "equipements": {
        "title": "Equipment Fleet Management",
        "export_csv": "Export to CSV",
        "search_placeholder": "Search equipment (S/N, Type...)"
      }
    }
  }
};

i18n
  .use(LanguageDetector) // Détecte la langue du navigateur automatiquement
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr', // Langue par défaut
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;