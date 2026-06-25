/**
 * Service de génération du rapport PDF d'un OT clôturé.
 *
 * Ce fichier contient toute la logique PDF — il est séparé du contrôleur
 * pour rester facile à tester et à modifier sans toucher au reste de l'API.
 *
 * Dépendance requise : npm install pdfkit
 */

const path = require('path');
const fs   = require('fs');
const PDFDocument = require('pdfkit');
const db = require('../../database/connection');

// ─── Helpers de mise en forme ─────────────────────────────────────────────────

/**
 * Formate une date JS en chaîne française lisible (ex. "24/06/2026 à 14:32").
 * Si la valeur est nulle/indéfinie, retourne "—".
 *
 * @param {Date|string|null} valeur
 * @param {boolean} avecHeure - true pour inclure l'heure, false pour la date seule
 */
const formaterDate = (valeur, avecHeure = true) => {
  if (!valeur) return '—';
  const d = new Date(valeur);
  if (isNaN(d.getTime())) return '—';
  return avecHeure ? d.toLocaleString('fr-FR') : d.toLocaleDateString('fr-FR');
};

/**
 * Trace une ligne de séparation horizontale dans le PDF.
 * @param {PDFDocument} doc
 */
const separateur = (doc) => {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').stroke();
  doc.moveDown(0.8);
};

/**
 * Écrit un titre de section en bleu foncé avec soulignement.
 * @param {PDFDocument} doc
 * @param {string} texte
 */
const titreSection = (doc, texte) => {
  doc.moveDown(0.5);
  doc.fillColor('#1e3a8a').fontSize(12).text(texte, { underline: true });
  doc.moveDown(0.4);
  doc.fillColor('#334155').fontSize(10);
};

/**
 * Écrit une ligne "Libellé : valeur" dans la couleur de corps standard.
 * @param {PDFDocument} doc
 * @param {string} libelle
 * @param {string|number} valeur
 */
const ligne = (doc, libelle, valeur) => {
  // On met le libellé en gras léger et la valeur en texte normal côte à côte
  doc.font('Helvetica-Bold').text(`${libelle} :  `, { continued: true });
  doc.font('Helvetica').text(String(valeur ?? '—'));
};

// ─── Chargement des données ───────────────────────────────────────────────────

/**
 * Récupère l'ensemble des données nécessaires au rapport :
 * équipement, bâtiment, client, technicien, photos, commentaires, réouvertures.
 *
 * @param {string} interventionId - UUID de l'OT
 * @returns {Promise<Object>} Toutes les données regroupées dans un seul objet
 */
const chargerDonneesOT = async (interventionId) => {
  // Infos de base de l'OT lui-même
  const intervention = await db('interventions').where({ id: interventionId }).first();
  if (!intervention) throw new Error(`OT ${interventionId} introuvable`);

  // Équipement + bâtiment + client en une seule jointure
  const equipement = await db('equipements')
    .join('batiments', 'equipements.batiment_id', 'batiments.id')
    .join('clients',   'batiments.client_id',     'clients.id')
    .where('equipements.id', intervention.equipement_id)
    .select(
      'equipements.nom        as nom',
      'equipements.reference  as reference',
      'equipements.marque     as marque',
      'equipements.modele     as modele',
      'batiments.nom          as batiment_nom',
      'clients.nom            as client_nom'
    )
    .first();

  // Technicien (peut être null si l'OT n'a jamais été assigné)
  const technicien = intervention.technicien_id
    ? await db('users')
        .where({ id: intervention.technicien_id })
        .select('nom', 'prenom', 'email')
        .first()
    : null;

  // Photos liées à cet OT, triées par date
  const photos = await db('photos_intervention')
    .where({ intervention_id: interventionId })
    .orderBy('created_at', 'asc');

  // Commentaires avec le nom de leur auteur
  const commentaires = await db('commentaires_intervention')
    .join('users', 'commentaires_intervention.user_id', 'users.id')
    .where('commentaires_intervention.intervention_id', interventionId)
    .select(
      'commentaires_intervention.contenu',
      'commentaires_intervention.created_at',
      'users.nom',
      'users.prenom'
    )
    .orderBy('commentaires_intervention.created_at', 'asc');

  // Réouvertures passées avec le nom de l'auteur
  const reouvertures = await db('reouvertures_ot')
    .join('users', 'reouvertures_ot.user_id', 'users.id')
    .where('reouvertures_ot.intervention_id', interventionId)
    .select(
      'reouvertures_ot.motif',
      'reouvertures_ot.created_at',
      'reouvertures_ot.statut_precedent',
      'users.nom',
      'users.prenom'
    )
    .orderBy('reouvertures_ot.created_at', 'asc');

  return { intervention, equipement, technicien, photos, commentaires, reouvertures };
};

// ─── Génération du PDF ────────────────────────────────────────────────────────

/**
 * Génère le rapport PDF d'un OT clôturé, le sauvegarde sur le disque et
 * retourne son chemin absolu pour que le contrôleur puisse le stocker en base.
 *
 * Exemple d'appel dans le contrôleur :
 *   const chemin = await interventionService.genererRapportPDF(id, commentaire, duree);
 *   await db('interventions').where({ id }).update({ rapport_pdf_chemin: chemin });
 *
 * @param {string} interventionId      - UUID de l'OT
 * @param {string} commentaireCloture  - Texte saisi par le technicien à la clôture
 * @param {number} dureeMinutes        - Durée réelle de l'intervention en minutes
 * @returns {Promise<string>} Chemin absolu du fichier PDF généré
 */
const genererRapportPDF = async (interventionId, commentaireCloture, dureeMinutes) => {
  // 1. Charger toutes les données depuis la base
  const { intervention, equipement, technicien, photos, commentaires, reouvertures } =
    await chargerDonneesOT(interventionId);

  // 2. Préparer le dossier de destination (storage/rapports/)
  //    __dirname pointe vers app/services/, donc on remonte de 2 niveaux
  const rapportDir = path.join(__dirname, '../../storage/rapports');
  if (!fs.existsSync(rapportDir)) {
    // Crée le dossier et tous ses parents si nécessaire
    fs.mkdirSync(rapportDir, { recursive: true });
  }

  // 3. Nommer le fichier avec l'id de l'OT et un timestamp pour éviter les collisions
  const timestamp   = Date.now();
  const nomFichier  = `rapport_OT_${interventionId}_${timestamp}.pdf`;
  const cheminFichier = path.join(rapportDir, nomFichier);

  // 4. Créer le document PDF et le brancher sur un flux d'écriture fichier
  const doc    = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(cheminFichier);
  doc.pipe(stream);

  // ── EN-TÊTE ──────────────────────────────────────────────────────────────
  doc.fillColor('#1e3a8a').fontSize(22).font('Helvetica-Bold')
     .text('EchoMaint GMAO', { align: 'center' });
  doc.fillColor('#475569').fontSize(13).font('Helvetica')
     .text('RAPPORT D\'INTERVENTION', { align: 'center' });
  doc.moveDown(0.5);
  separateur(doc);

  // ── SECTION 1 : Informations générales de l'OT ──────────────────────────
  titreSection(doc, '1. Informations générales');
  ligne(doc, 'Référence OT',    interventionId);
  ligne(doc, 'Titre',           intervention.titre);
  ligne(doc, 'Type',            intervention.type);
  ligne(doc, 'Priorité',        intervention.priorite);
  ligne(doc, 'Statut final',    'Terminée');
  ligne(doc, 'Date planifiée',  formaterDate(intervention.date_planifiee, false));
  ligne(doc, 'Début réel',      formaterDate(intervention.date_debut_reelle));
  ligne(doc, 'Fin réelle',      formaterDate(new Date()));
  ligne(doc, 'Durée réelle',    `${dureeMinutes} minutes`);

  // ── SECTION 2 : Équipement & localisation ────────────────────────────────
  titreSection(doc, '2. Équipement & localisation');
  ligne(doc, 'Équipement', `${equipement?.nom ?? '—'} (Réf. ${equipement?.reference ?? '—'})`);
  ligne(doc, 'Marque / Modèle', `${equipement?.marque ?? '—'} / ${equipement?.modele ?? '—'}`);
  ligne(doc, 'Bâtiment',  equipement?.batiment_nom);
  ligne(doc, 'Client',    equipement?.client_nom);

  // ── SECTION 3 : Technicien ───────────────────────────────────────────────
  titreSection(doc, '3. Technicien intervenant');
  if (technicien) {
    ligne(doc, 'Nom',   `${technicien.prenom} ${technicien.nom}`);
    ligne(doc, 'Email', technicien.email);
  } else {
    doc.font('Helvetica').text('Non assigné');
  }

  // ── SECTION 4 : Description & clôture ───────────────────────────────────
  titreSection(doc, '4. Détails des travaux');
  ligne(doc, 'Description', intervention.description || '—');
  doc.moveDown(0.3);
  // Le commentaire de clôture peut être long — on le laisse s'étendre librement
  doc.font('Helvetica-Bold').text('Commentaire de clôture :');
  doc.font('Helvetica').text(commentaireCloture, { width: 495, align: 'justify' });

  // ── SECTION 5 : Commentaires de suivi ───────────────────────────────────
  if (commentaires.length > 0) {
    titreSection(doc, `5. Commentaires de suivi (${commentaires.length})`);
    commentaires.forEach((c, i) => {
      doc.font('Helvetica-Bold')
         .text(`${i + 1}. ${c.prenom} ${c.nom} — ${formaterDate(c.created_at)}`, { continued: false });
      doc.font('Helvetica').text(c.contenu, { width: 495, indent: 15 });
      doc.moveDown(0.3);
    });
  }

  // ── SECTION 6 : Réouvertures ─────────────────────────────────────────────
  if (reouvertures.length > 0) {
    titreSection(doc, `6. Historique des réouvertures (${reouvertures.length})`);
    reouvertures.forEach((r, i) => {
      doc.font('Helvetica-Bold')
         .text(`Réouverture #${i + 1} — ${formaterDate(r.created_at)} par ${r.prenom} ${r.nom}`);
      doc.font('Helvetica').text(`Motif : ${r.motif}`, { width: 495, indent: 15 });
      doc.moveDown(0.3);
    });
  }

  // ── SECTION 7 : Photos ───────────────────────────────────────────────────
  const photosExistantes = photos.filter(p => fs.existsSync(p.chemin_fichier));
  if (photosExistantes.length > 0) {
    // Les photos prennent de la place — on les met sur une nouvelle page
    doc.addPage();
    titreSection(doc, `7. Photos d\'intervention (${photosExistantes.length})`);

    // Disposition en grille 2 colonnes
    let colX = 50;
    let ligneY = doc.y;
    const LARGEUR_PHOTO = 220;
    const HAUTEUR_PHOTO = 155;
    const ESPACEMENT_H  = 25;
    const ESPACEMENT_V  = 30;

    photosExistantes.forEach((photo, index) => {
      // Passage à la ligne suivante toutes les 2 photos
      if (index > 0 && index % 2 === 0) {
        colX   = 50;
        ligneY += HAUTEUR_PHOTO + ESPACEMENT_V;
      }

      // Si on dépasse le bas de la page, on en crée une nouvelle
      if (ligneY + HAUTEUR_PHOTO > 780) {
        doc.addPage();
        ligneY = 60;
        colX   = 50;
      }

      try {
        doc.image(photo.chemin_fichier, colX, ligneY, { width: LARGEUR_PHOTO, height: HAUTEUR_PHOTO });
      } catch {
        // Si le fichier est corrompu ou d'un format non supporté, on affiche un placeholder
        doc.rect(colX, ligneY, LARGEUR_PHOTO, HAUTEUR_PHOTO).stroke('#e2e8f0');
        doc.fontSize(9).fillColor('#94a3b8').text('[Image non disponible]', colX + 5, ligneY + 70);
      }

      // Légende sous la photo
      doc.fontSize(9).fillColor('#475569')
         .text(
           `${photo.type_photo.toUpperCase()} — ${formaterDate(photo.created_at, false)}`,
           colX,
           ligneY + HAUTEUR_PHOTO + 3,
           { width: LARGEUR_PHOTO, align: 'center' }
         );

      colX += LARGEUR_PHOTO + ESPACEMENT_H;
    });
  }

  // ── PIED DE PAGE ─────────────────────────────────────────────────────────
  // On se place en bas de la dernière page
  doc.y = Math.min(doc.y + 40, 760);
  separateur(doc);
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
     .text(
       `Document généré automatiquement le ${formaterDate(new Date())} — EchoMaint GMAO`,
       { align: 'center' }
     );

  // 5. Fermer le document et attendre la fin de l'écriture sur disque
  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // 6. Retourner le chemin pour que le contrôleur puisse le stocker en base
  return cheminFichier;
};

module.exports = { genererRapportPDF };
