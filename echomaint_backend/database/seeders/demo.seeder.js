/**
 * demo.seeder.js — Données métier de démonstration (soutenance)
 *
 * Ordre d'insertion (respecte les clés étrangères) :
 *   1. Clients          (pas de FK entrantes)
 *   2. Bâtiments        (→ clients)
 *   3. Équipements      (→ bâtiments)
 *   4. Plans de maintenance (→ équipements)
 *   5. Demandes d'intervention (→ clients, équipements)
 *   6. Interventions    (→ équipements, users, plans, demandes)
 *   7. Réouvertures OT  (→ interventions, users)
 *   8. Commentaires     (→ interventions, users)
 *   9. Mise à jour FK croisées (DI → intervention, user client → client)
 *
 * Prérequis : users.seeder.js doit avoir été lancé avant.
 *
 * Lancement :
 *   npx knex seed:run --specific=demo.seeder.js
 */

// ─────────────────────────────────────────────────────────────────────────────
// UUIDs FIXES — tous prédéfinis pour garantir la reproductibilité
// ─────────────────────────────────────────────────────────────────────────────

// Repris de users.seeder.js (doivent correspondre exactement)
const ADMIN_ID   = '00000000-0000-4000-a000-000000000001'
const TECH1_ID   = '00000000-0000-4000-a000-000000000002'
const TECH2_ID   = '00000000-0000-4000-a000-000000000003'
const CLIENT1_ID = '00000000-0000-4000-a000-000000000004'

// Clients
const SENELEC_ID = '00000000-0000-4000-b000-000000000001'
const CBAO_ID    = '00000000-0000-4000-b000-000000000002'

// Bâtiments (2 par client)
const BAT_SENELEC_DKR  = '00000000-0000-4000-c000-000000000001'
const BAT_SENELEC_THIS = '00000000-0000-4000-c000-000000000002'
const BAT_CBAO_DKR     = '00000000-0000-4000-c000-000000000003'
const BAT_CBAO_THIS    = '00000000-0000-4000-c000-000000000004'

// Équipements (10)
const EQ_GRP001  = '00000000-0000-4000-d000-000000000001' // Groupe électrogène principal    — Sénélec Dakar
const EQ_CLIM001 = '00000000-0000-4000-d000-000000000002' // Climatisation centrale           — Sénélec Dakar
const EQ_ASC001  = '00000000-0000-4000-d000-000000000003' // Ascenseur principal (EN PANNE)   — Sénélec Dakar
const EQ_GRP002  = '00000000-0000-4000-d000-000000000004' // Groupe électrogène de secours    — Sénélec Thiès
const EQ_CLIM002 = '00000000-0000-4000-d000-000000000005' // Climatisation salle serveurs     — Sénélec Thiès
const EQ_GRP003  = '00000000-0000-4000-d000-000000000006' // Générateur principal CBAO        — CBAO Dakar
const EQ_CLIM003 = '00000000-0000-4000-d000-000000000007' // Climatisation bureaux (H. SERVICE)— CBAO Dakar
const EQ_ASC002  = '00000000-0000-4000-d000-000000000008' // Ascenseur accueil                — CBAO Dakar
const EQ_GRP004  = '00000000-0000-4000-d000-000000000009' // Groupe électrogène agence        — CBAO Thiès
const EQ_ELEC001 = '00000000-0000-4000-d000-000000000010' // Tableau électrique principal     — CBAO Thiès

// Plans de maintenance
const PLAN_GRP  = '00000000-0000-4000-e000-000000000001'
const PLAN_CLIM = '00000000-0000-4000-e000-000000000002'

// Interventions (15)
const OT01 = '00000000-0000-4000-f000-000000000001'
const OT02 = '00000000-0000-4000-f000-000000000002'
const OT03 = '00000000-0000-4000-f000-000000000003'
const OT04 = '00000000-0000-4000-f000-000000000004'
const OT05 = '00000000-0000-4000-f000-000000000005'
const OT06 = '00000000-0000-4000-f000-000000000006'
const OT07 = '00000000-0000-4000-f000-000000000007'
const OT08 = '00000000-0000-4000-f000-000000000008'
const OT09 = '00000000-0000-4000-f000-000000000009'
const OT10 = '00000000-0000-4000-f000-000000000010'
const OT11 = '00000000-0000-4000-f000-000000000011'
const OT12 = '00000000-0000-4000-f000-000000000012'
const OT13 = '00000000-0000-4000-f000-000000000013'
const OT14 = '00000000-0000-4000-f000-000000000014'
const OT15 = '00000000-0000-4000-f000-000000000015'

// Demandes d'intervention
const DI01 = '00000000-0000-4000-0a00-000000000001'
const DI02 = '00000000-0000-4000-0a00-000000000002'
const DI03 = '00000000-0000-4000-0a00-000000000003'

// Réouvertures
const REOUV01 = '00000000-0000-4000-0b00-000000000001'
const REOUV02 = '00000000-0000-4000-0b00-000000000002'

// Commentaires
const COMM01 = '00000000-0000-4000-0c00-000000000001'
const COMM02 = '00000000-0000-4000-0c00-000000000002'
const COMM03 = '00000000-0000-4000-0c00-000000000003'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {

  // ════════════════════════════════════════════════════════════════════════════
  // NETTOYAGE — suppression dans l'ordre inverse des FK pour éviter les conflits
  // ════════════════════════════════════════════════════════════════════════════
  console.log('🗑   Nettoyage des données métier existantes…')
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0')

  await knex('commentaires_intervention').del()
  await knex('reouvertures_ot').del()
  await knex('interventions').del()
  await knex('demandes_intervention').del()
  await knex('plans_maintenance').del()
  await knex('equipements').del()
  await knex('batiments').del()
  await knex('clients').del()

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1')
  console.log('    Tables vidées.')

  // ════════════════════════════════════════════════════════════════════════════
  // 1. CLIENTS
  //    Deux grandes entreprises sénégalaises : Sénélec et CBAO.
  //    Ce sont les "propriétaires" des bâtiments et équipements.
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋  Insertion des clients…')
  await knex('clients').insert([
    {
      id            : SENELEC_ID,
      nom           : 'Société Sénélec',
      email_contact : 'maintenance@senelec.sn',
      telephone     : '+221 33 839 30 00',
      adresse       : '28 rue Vincens, Dakar',
    },
    {
      id            : CBAO_ID,
      nom           : 'Groupe CBAO',
      email_contact : 'technique@cbao.sn',
      telephone     : '+221 33 849 96 96',
      adresse       : 'Avenue Léopold Sédar Senghor, Dakar',
    },
  ])
  console.log('    ✓ 2 clients insérés (Sénélec, CBAO)')

  // ════════════════════════════════════════════════════════════════════════════
  // 2. BÂTIMENTS
  //    2 bâtiments par client : siège à Dakar + agence à Thiès.
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🏢  Insertion des bâtiments…')
  await knex('batiments').insert([
    // — Sénélec —
    {
      id         : BAT_SENELEC_DKR,
      client_id  : SENELEC_ID,
      nom        : 'Siège Dakar — Sénélec',
      adresse    : '28 rue Vincens',
      ville      : 'Dakar',
      description: 'Direction générale et centre de dispatching régional.',
    },
    {
      id         : BAT_SENELEC_THIS,
      client_id  : SENELEC_ID,
      nom        : 'Agence Thiès — Sénélec',
      adresse    : 'Avenue Malick Sy',
      ville      : 'Thiès',
      description: 'Agence régionale couvrant le département de Thiès.',
    },
    // — CBAO —
    {
      id         : BAT_CBAO_DKR,
      client_id  : CBAO_ID,
      nom        : 'Siège Dakar — CBAO',
      adresse    : 'Avenue Léopold Sédar Senghor',
      ville      : 'Dakar',
      description: 'Siège social et direction informatique.',
    },
    {
      id         : BAT_CBAO_THIS,
      client_id  : CBAO_ID,
      nom        : 'Agence Thiès — CBAO',
      adresse    : 'Boulevard des Armées',
      ville      : 'Thiès',
      description: 'Agence bancaire principale de la région de Thiès.',
    },
  ])
  console.log('    ✓ 4 bâtiments insérés')

  // ════════════════════════════════════════════════════════════════════════════
  // 3. ÉQUIPEMENTS (10)
  //    Générateurs, climatiseurs, ascenseurs, tableau électrique.
  //    Statuts variés : actif / en_panne / hors_service pour les démonstrations.
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n⚙️   Insertion des équipements…')
  await knex('equipements').insert([

    // ── Bâtiment : Siège Dakar — Sénélec ─────────────────────────────────────
    {
      id                : EQ_GRP001,
      batiment_id       : BAT_SENELEC_DKR,
      nom               : 'Groupe électrogène principal',
      reference         : 'GRP-SDK-001',
      type              : 'Générateur',
      marque            : 'Caterpillar',
      modele            : 'C15',
      numero_serie      : 'CAT-2019-00412',
      date_installation : '2019-03-15',
      statut            : 'actif',
      description       : 'Groupe électrogène 400 kVA, alimentation de secours du dispatching.',
    },
    {
      id                : EQ_CLIM001,
      batiment_id       : BAT_SENELEC_DKR,
      nom               : 'Climatisation centrale',
      reference         : 'CLIM-SDK-001',
      type              : 'Climatisation',
      marque            : 'Daikin',
      modele            : 'VRV-IV',
      numero_serie      : 'DK-VRV-2021-0078',
      date_installation : '2021-07-20',
      statut            : 'actif',
      description       : 'Système VRV couvrant les open-spaces du rez-de-chaussée.',
    },
    {
      id                : EQ_ASC001,
      batiment_id       : BAT_SENELEC_DKR,
      nom               : 'Ascenseur principal',
      reference         : 'ASC-SDK-001',
      type              : 'Ascenseur',
      marque            : 'Otis',
      modele            : 'Gen2',
      numero_serie      : 'OTIS-2018-0234',
      date_installation : '2018-11-01',
      statut            : 'en_panne',        // ← en panne → visible dans le dashboard
      description       : 'Ascenseur 8 personnes, signal de défaut moteur déclenché.',
    },

    // ── Bâtiment : Agence Thiès — Sénélec ────────────────────────────────────
    {
      id                : EQ_GRP002,
      batiment_id       : BAT_SENELEC_THIS,
      nom               : 'Groupe électrogène de secours',
      reference         : 'GRP-THIS-002',
      type              : 'Générateur',
      marque            : 'Perkins',
      modele            : '1106A-70TAG2',
      numero_serie      : 'PRK-2020-00189',
      date_installation : '2020-05-10',
      statut            : 'actif',
      description       : 'Groupe 200 kVA pour l\'agence et la salle des coffres.',
    },
    {
      id                : EQ_CLIM002,
      batiment_id       : BAT_SENELEC_THIS,
      nom               : 'Climatisation salle serveurs',
      reference         : 'CLIM-THIS-002',
      type              : 'Climatisation',
      marque            : 'Emerson',
      modele            : 'Liebert DS',
      numero_serie      : 'EM-DS-2022-0045',
      date_installation : '2022-01-14',
      statut            : 'actif',
      description       : 'Unité de précision 20 kW pour la salle informatique.',
    },

    // ── Bâtiment : Siège Dakar — CBAO ────────────────────────────────────────
    {
      id                : EQ_GRP003,
      batiment_id       : BAT_CBAO_DKR,
      nom               : 'Générateur principal CBAO',
      reference         : 'GRP-CDK-003',
      type              : 'Générateur',
      marque            : 'Cummins',
      modele            : 'C275D5',
      numero_serie      : 'CUM-2020-00567',
      date_installation : '2020-09-22',
      statut            : 'actif',
      description       : 'Groupe 275 kVA alimentant les systèmes bancaires critiques.',
    },
    {
      id                : EQ_CLIM003,
      batiment_id       : BAT_CBAO_DKR,
      nom               : 'Climatisation bureaux CBAO',
      reference         : 'CLIM-CDK-003',
      type              : 'Climatisation',
      marque            : 'Trane',
      modele            : 'Precedent',
      numero_serie      : 'TR-PRE-2017-0091',
      date_installation : '2017-04-05',
      statut            : 'hors_service',    // ← hors service → ne sera plus opérationnel
      description       : 'Groupe froid 60 kW, compresseur HS. Remplacement planifié.',
    },
    {
      id                : EQ_ASC002,
      batiment_id       : BAT_CBAO_DKR,
      nom               : 'Ascenseur accueil CBAO',
      reference         : 'ASC-CDK-002',
      type              : 'Ascenseur',
      marque            : 'Schindler',
      modele            : '3300',
      numero_serie      : 'SCH-2019-0178',
      date_installation : '2019-06-30',
      statut            : 'actif',
      description       : 'Ascenseur 10 personnes, accès hall principal.',
    },

    // ── Bâtiment : Agence Thiès — CBAO ───────────────────────────────────────
    {
      id                : EQ_GRP004,
      batiment_id       : BAT_CBAO_THIS,
      nom               : 'Groupe électrogène agence CBAO',
      reference         : 'GRP-CTHS-004',
      type              : 'Générateur',
      marque            : 'FG Wilson',
      modele            : 'P165-5',
      numero_serie      : 'FGW-2021-00301',
      date_installation : '2021-03-18',
      statut            : 'actif',
      description       : 'Groupe 165 kVA pour l\'agence bancaire de Thiès.',
    },
    {
      id                : EQ_ELEC001,
      batiment_id       : BAT_CBAO_THIS,
      nom               : 'Tableau électrique principal',
      reference         : 'ELEC-CTHS-001',
      type              : 'Électrique',
      marque            : 'Schneider Electric',
      modele            : 'Prisma G',
      numero_serie      : 'SCH-PG-2020-0055',
      date_installation : '2020-11-03',
      statut            : 'actif',
      description       : 'TGBT 400A avec protection différentielle généralisée.',
    },
  ])
  console.log('    ✓ 10 équipements insérés')

  // ════════════════════════════════════════════════════════════════════════════
  // 4. PLANS DE MAINTENANCE (2)
  //    Chaque plan définit une gamme de tâches et une périodicité.
  //    gamme_taches est un tableau JSON de chaînes décrivant les opérations.
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📅  Insertion des plans de maintenance…')
  await knex('plans_maintenance').insert([
    {
      id                 : PLAN_GRP,
      equipement_id      : EQ_GRP001,
      label              : 'Révision mensuelle groupe électrogène',
      periodicite_jours  : 30,
      gamme_taches       : JSON.stringify([
        'Vérifier le niveau d\'huile moteur',
        'Contrôler le niveau de carburant',
        'Tester le démarrage automatique (3 essais)',
        'Inspecter les courroies et les durites',
        'Relever les heures de fonctionnement',
        'Nettoyer le filtre à air',
      ]),
      actif              : true,
      derniere_generation: '2026-05-25',
    },
    {
      id                 : PLAN_CLIM,
      equipement_id      : EQ_CLIM001,
      label              : 'Contrôle semestriel climatisation',
      periodicite_jours  : 180,
      gamme_taches       : JSON.stringify([
        'Nettoyer les filtres à air (intérieur et extérieur)',
        'Vérifier la pression des fluides frigorigènes',
        'Inspecter l\'état des échangeurs (évaporateur/condenseur)',
        'Contrôler les connexions électriques',
        'Mesurer les températures de soufflage et de reprise',
        'Vérifier le bon fonctionnement des modes chaud/froid',
      ]),
      actif              : true,
      derniere_generation: '2026-01-10',
    },
  ])
  console.log('    ✓ 2 plans de maintenance insérés')

  // ════════════════════════════════════════════════════════════════════════════
  // 5. DEMANDES D'INTERVENTION (3)
  //    Soumises par le client Ibrahim Sow (CLIENT1_ID).
  //    DI02 sera liée à OT08 après l'insertion des interventions (FK croisée).
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📨  Insertion des demandes d\'intervention…')
  await knex('demandes_intervention').insert([
    // DI01 — En attente de traitement
    {
      id            : DI01,
      client_id     : SENELEC_ID,
      equipement_id : EQ_ASC001,
      titre         : 'Bruit anormal dans l\'ascenseur principal',
      description   : 'Depuis ce matin, l\'ascenseur émet un grincement fort '
                    + 'lors de la montée entre le 2e et le 3e étage. '
                    + 'Plusieurs employés ont signalé le problème.',
      priorite      : 'haute',
      statut        : 'ouverte',
      intervention_id: null,         // sera mis à jour si besoin
    },
    // DI02 — Traitée : liée à OT08 (intervention terminée sur GRP-002)
    {
      id            : DI02,
      client_id     : SENELEC_ID,
      equipement_id : EQ_GRP002,
      titre         : 'Groupe électrogène ne démarre plus',
      description   : 'Le groupe de l\'agence de Thiès refuse de démarrer '
                    + 'depuis la coupure d\'hier soir. La batterie semble hors service.',
      priorite      : 'urgente',
      statut        : 'traitee',
      intervention_id: null,         // ← mis à jour en étape 9 (= OT08)
    },
    // DI03 — Rejetée : problème non validé par l'admin
    {
      id            : DI03,
      client_id     : SENELEC_ID,
      equipement_id : EQ_CLIM001,
      titre         : 'Climatisation trop froide dans open-space',
      description   : 'La température ressentie est en dessous de 18°C. '
                    + 'Plusieurs collaborateurs se plaignent.',
      priorite      : 'basse',
      statut        : 'rejetee',
      intervention_id: null,
    },
  ])
  console.log('    ✓ 3 demandes d\'intervention insérées (1 ouverte, 1 traitée, 1 rejetée)')

  // ════════════════════════════════════════════════════════════════════════════
  // 6. INTERVENTIONS (15)
  //    Répartition :
  //      3 planifiées  · 2 assignées (tech1) · 3 en cours
  //      5 terminées   · 2 annulées
  //    ≥ 3 préventifs (OT01, OT02, OT05, OT09, OT12)
  //    2 OT terminés avec rapport PDF (OT08, OT09)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔧  Insertion des interventions…')
  await knex('interventions').insert([

    // ── PLANIFIÉES (3) ─────────────────────────────────────────────────────

    // OT01 — Préventif planifié sur le groupe principal Sénélec (issu du plan)
    {
      id                    : OT01,
      equipement_id         : EQ_GRP001,
      type                  : 'preventif',
      statut                : 'planifiee',
      priorite              : 'normale',
      titre                 : 'Révision mensuelle groupe électrogène GRP-SDK-001',
      description           : 'Révision complète selon la gamme du plan de maintenance mensuel.',
      technicien_id         : null,
      date_planifiee        : '2026-07-05 08:00:00',
      plan_maintenance_id   : PLAN_GRP,
    },
    // OT02 — Préventif planifié sur la clim salle serveurs Thiès
    {
      id                    : OT02,
      equipement_id         : EQ_CLIM002,
      type                  : 'preventif',
      statut                : 'planifiee',
      priorite              : 'normale',
      titre                 : 'Contrôle filtre climatisation salle serveurs Thiès',
      description           : 'Nettoyage des filtres et vérification des pressions frigorigènes.',
      technicien_id         : null,
      date_planifiee        : '2026-07-10 09:00:00',
    },
    // OT03 — Curatif planifié suite à la panne de l'ascenseur
    {
      id                    : OT03,
      equipement_id         : EQ_ASC001,
      type                  : 'curatif',
      statut                : 'planifiee',
      priorite              : 'haute',
      titre                 : 'Diagnostic ascenseur principal — signal défaut moteur',
      description           : 'Lecture des codes défaut, inspection du module de commande '
                            + 'et des câbles d\'alimentation.',
      technicien_id         : null,
      date_planifiee        : '2026-07-02 07:30:00',
    },

    // ── ASSIGNÉES (2) — assignées à tech1 (Moussa Ndiaye) ──────────────────

    // OT04 — Curatif assigné : remplacement compresseur CBAO
    {
      id                    : OT04,
      equipement_id         : EQ_CLIM003,
      type                  : 'curatif',
      statut                : 'assignee',
      priorite              : 'urgente',
      titre                 : 'Remplacement compresseur climatisation bureaux CBAO',
      description           : 'Compresseur HS, remplacement par un modèle équivalent. '
                            + 'Pièce déjà commandée.',
      technicien_id         : TECH1_ID,
      date_planifiee        : '2026-06-28 08:00:00',
    },
    // OT05 — Préventif assigné : révision groupe CBAO Dakar
    {
      id                    : OT05,
      equipement_id         : EQ_GRP003,
      type                  : 'preventif',
      statut                : 'assignee',
      priorite              : 'normale',
      titre                 : 'Révision préventive générateur principal CBAO',
      description           : 'Vidange huile, remplacement filtres, test de charge.',
      technicien_id         : TECH1_ID,
      date_planifiee        : '2026-06-27 09:00:00',
    },

    // ── EN COURS (3) ────────────────────────────────────────────────────────

    // OT06 — Curatif en cours sur l'ascenseur Sénélec (tech2)
    {
      id                    : OT06,
      equipement_id         : EQ_ASC001,
      type                  : 'curatif',
      statut                : 'en_cours',
      priorite              : 'urgente',
      titre                 : 'Intervention urgente ascenseur — blocage cabine',
      description           : 'Cabine bloquée entre R+1 et R+2. Technicien sur place.',
      technicien_id         : TECH2_ID,
      date_planifiee        : '2026-06-24 10:00:00',
      date_debut_reelle     : '2026-06-24 10:35:00',
    },
    // OT07 — Curatif en cours sur le tableau électrique CBAO Thiès (tech1)
    {
      id                    : OT07,
      equipement_id         : EQ_ELEC001,
      type                  : 'curatif',
      statut                : 'en_cours',
      priorite              : 'haute',
      titre                 : 'Diagnostic tableau électrique — disjoncteur défaillant',
      description           : 'Disjoncteur principal 400A tombe aléatoirement. '
                            + 'Mesures en cours avec analyseur de réseau.',
      technicien_id         : TECH1_ID,
      date_planifiee        : '2026-06-25 08:00:00',
      date_debut_reelle     : '2026-06-25 08:20:00',
    },
    // OT15 — Curatif en cours sur le groupe Thiès Sénélec (tech2)
    {
      id                    : OT15,
      equipement_id         : EQ_GRP002,
      type                  : 'curatif',
      statut                : 'en_cours',
      priorite              : 'haute',
      titre                 : 'Fuite huile moteur groupe de secours Thiès',
      description           : 'Fuite constatée au niveau du joint de culasse. '
                            + 'Arrêt préventif en attente de réparation.',
      technicien_id         : TECH2_ID,
      date_planifiee        : '2026-06-25 09:00:00',
      date_debut_reelle     : '2026-06-25 09:45:00',
    },

    // ── TERMINÉES (5) ──────────────────────────────────────────────────────

    // OT08 — Curatif terminé : remplacement batterie GRP-002 (avec PDF + lié à DI02)
    {
      id                    : OT08,
      equipement_id         : EQ_GRP002,
      type                  : 'curatif',
      statut                : 'terminee',
      priorite              : 'urgente',
      titre                 : 'Remplacement batterie démarrage groupe Thiès',
      description           : 'Batterie de démarrage 24V/200Ah hors service remplacée.',
      technicien_id         : TECH1_ID,
      date_planifiee        : '2026-06-10 08:00:00',
      date_debut_reelle     : '2026-06-10 08:15:00',
      date_fin_reelle       : '2026-06-10 10:45:00',
      duree_reelle_minutes  : 150,
      commentaire_cloture   : 'Batterie AGM 200Ah installée. Démarrage testé 3 fois, OK. '
                            + 'Rapport de remplacement joint au dossier.',
      rapport_pdf_chemin    : 'uploads/rapports/rapport_OT_8.pdf',
      demande_intervention_id: DI02,   // lié à la DI traitée
    },
    // OT09 — Préventif terminé : nettoyage filtre clim centrale (avec PDF)
    {
      id                    : OT09,
      equipement_id         : EQ_CLIM001,
      type                  : 'preventif',
      statut                : 'terminee',
      priorite              : 'normale',
      titre                 : 'Nettoyage filtre climatisation centrale Sénélec Dakar',
      description           : 'Maintenance préventive semestrielle — nettoyage complet.',
      technicien_id         : TECH2_ID,
      date_planifiee        : '2026-06-15 09:00:00',
      date_debut_reelle     : '2026-06-15 09:10:00',
      date_fin_reelle       : '2026-06-15 12:30:00',
      duree_reelle_minutes  : 200,
      commentaire_cloture   : 'Filtres nettoyés, pression des frigorigènes conforme (R410A : 12 bar). '
                            + 'Performances revenues à la normale, T° soufflage : 14°C.',
      rapport_pdf_chemin    : 'uploads/rapports/rapport_OT_9.pdf',
      plan_maintenance_id   : PLAN_CLIM,
    },
    // OT10 — Curatif terminé : remplacement câble ascenseur CBAO (réouverture dessus)
    {
      id                    : OT10,
      equipement_id         : EQ_ASC002,
      type                  : 'curatif',
      statut                : 'terminee',
      priorite              : 'haute',
      titre                 : 'Remplacement câble porteur ascenseur CBAO',
      description           : 'Câble principal montrant des signes de fatigue. Remplacement préventif.',
      technicien_id         : TECH1_ID,
      date_planifiee        : '2026-06-05 08:00:00',
      date_debut_reelle     : '2026-06-05 08:30:00',
      date_fin_reelle       : '2026-06-06 16:00:00',
      duree_reelle_minutes  : 570,
      commentaire_cloture   : 'Câble 6x19 IWRC remplacé. Essais de charge effectués. Conforme norme EN 81.',
    },
    // OT11 — Curatif terminé : réparation alternateur GRP-004 (réouverture dessus)
    {
      id                    : OT11,
      equipement_id         : EQ_GRP004,
      type                  : 'curatif',
      statut                : 'terminee',
      priorite              : 'haute',
      titre                 : 'Réparation alternateur groupe CBAO Thiès',
      description           : 'Alternateur ne recharge plus la batterie. Bobinage court-circuité.',
      technicien_id         : TECH2_ID,
      date_planifiee        : '2026-05-20 08:00:00',
      date_debut_reelle     : '2026-05-20 09:00:00',
      date_fin_reelle       : '2026-05-21 14:00:00',
      duree_reelle_minutes  : 420,
      commentaire_cloture   : 'Alternateur rebobiné par le prestataire spécialisé. Tension de charge OK : 28,4V.',
    },
    // OT12 — Préventif terminé : révision annuelle installations électriques
    {
      id                    : OT12,
      equipement_id         : EQ_ELEC001,
      type                  : 'preventif',
      statut                : 'terminee',
      priorite              : 'normale',
      titre                 : 'Contrôle annuel installations électriques CBAO Thiès',
      description           : 'Vérification conformité NF C 15-100 et mesures d\'isolement.',
      technicien_id         : TECH1_ID,
      date_planifiee        : '2026-04-12 08:00:00',
      date_debut_reelle     : '2026-04-12 08:00:00',
      date_fin_reelle       : '2026-04-12 17:30:00',
      duree_reelle_minutes  : 570,
      commentaire_cloture   : 'Installations conformes. Résistance d\'isolement > 1 MΩ sur tous les circuits.',
    },

    // ── ANNULÉES (2) ────────────────────────────────────────────────────────

    // OT13 — Fausse alarme clim salle serveurs Thiès
    {
      id                    : OT13,
      equipement_id         : EQ_CLIM002,
      type                  : 'curatif',
      statut                : 'annulee',
      priorite              : 'normale',
      titre                 : 'Intervention climatisation salle serveurs — alarme température',
      description           : 'Alarme déclenchée par le superviseur. Relevé sur place : fausse alarme, '
                            + 'capteur décalibré. Aucune action requise sur l\'équipement.',
      technicien_id         : null,
      date_planifiee        : '2026-06-18 14:00:00',
    },
    // OT14 — Vérification annulée après diagnostic à distance
    {
      id                    : OT14,
      equipement_id         : EQ_GRP001,
      type                  : 'curatif',
      statut                : 'annulee',
      priorite              : 'basse',
      titre                 : 'Vérification groupe électrogène — vibrations anormales',
      description           : 'Vibrations signalées par l\'opérateur. Diagnostic téléphonique '
                            + 'concluant : visserie de berceau desserrée. Resserrée sur place par '
                            + 'l\'opérateur, intervention annulée.',
      technicien_id         : null,
      date_planifiee        : '2026-06-20 10:00:00',
    },
  ])
  console.log('    ✓ 15 interventions insérées (3 planifiées · 2 assignées · 3 en cours · 5 terminées · 2 annulées)')

  // ════════════════════════════════════════════════════════════════════════════
  // 7. RÉOUVERTURES D'OT (2)
  //    Historique des fois où un OT "terminé" a été rouvert.
  //    OT10 et OT11 ont chacun été rouverts une fois avant d'être re-terminés.
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔄  Insertion des réouvertures…')
  await knex('reouvertures_ot').insert([
    // Réouverture sur OT10 (ascenseur CBAO) — déclenchée par l'admin
    {
      id               : REOUV01,
      intervention_id  : OT10,
      user_id          : ADMIN_ID,
      motif            : 'Retour client : l\'ascenseur reproduit le même symptôme deux jours '
                       + 'après la clôture. Réouverture pour vérification complète du câblage électrique '
                       + 'et test de la sécurité parachute.',
      statut_precedent : 'terminee',
    },
    // Réouverture sur OT11 (alternateur CBAO Thiès) — déclenchée par tech2
    {
      id               : REOUV02,
      intervention_id  : OT11,
      user_id          : TECH2_ID,
      motif            : 'La tension de charge est redescendue à 26,8V lors de la visite '
                       + 'de suivi J+7. Le rebobinage semble insuffisant. Réouverture pour '
                       + 'remplacement complet de l\'alternateur cette fois.',
      statut_precedent : 'terminee',
    },
  ])
  console.log('    ✓ 2 réouvertures insérées (OT10, OT11)')

  // ════════════════════════════════════════════════════════════════════════════
  // 8. COMMENTAIRES D'INTERVENTION (3)
  //    Notes laissées par les techniciens ou l'admin sur des interventions.
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n💬  Insertion des commentaires…')
  await knex('commentaires_intervention').insert([
    // Commentaire de l'admin sur OT09 (clim terminée)
    {
      id             : COMM01,
      intervention_id: OT09,
      user_id        : ADMIN_ID,
      contenu        : 'Filtre principal nettoyé et désinfecté. Les performances thermiques '
                     + 'sont revenues à la normale. Prochain contrôle prévu dans 6 mois.',
    },
    // Commentaire de tech1 sur OT08 (batterie groupe terminée)
    {
      id             : COMM02,
      intervention_id: OT08,
      user_id        : TECH1_ID,
      contenu        : 'Batterie de marque Victron Energy AGM 200Ah/24V installée. '
                     + 'Trois essais de démarrage consécutifs réalisés avec succès. '
                     + 'Temps de démarrage moyen : 4 secondes.',
    },
    // Commentaire de l'admin sur OT06 (ascenseur en cours)
    {
      id             : COMM03,
      intervention_id: OT06,
      user_id        : ADMIN_ID,
      contenu        : 'Intervention classée PRIORITAIRE. Pièce de rechange (variateur '
                     + 'de fréquence Otis 15kW) commandée en urgence. Délai estimé : 48h. '
                     + 'L\'ascenseur reste condamné jusqu\'à réception.',
    },
  ])
  console.log('    ✓ 3 commentaires insérés')

  // ════════════════════════════════════════════════════════════════════════════
  // 9. MISES À JOUR DES CLÉS ÉTRANGÈRES CROISÉES
  //    a) DI02.intervention_id → OT08  (FK ajoutée après coup en migration 11)
  //    b) client1 user.id_client → SENELEC_ID
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔗  Mise à jour des liaisons croisées…')

  // a) La demande DI02 est "traitée" grâce à l'intervention OT08
  await knex('demandes_intervention')
    .where({ id: DI02 })
    .update({ intervention_id: OT08 })
  console.log('    ✓ DI02 liée à OT08')

  // b) Le compte client Ibrahim Sow est rattaché à la Société Sénélec
  await knex('users')
    .where({ id: CLIENT1_ID })
    .update({ id_client: SENELEC_ID })
  console.log('    ✓ client1@echomaint.com rattaché à Société Sénélec')

  // ════════════════════════════════════════════════════════════════════════════
  // RÉSUMÉ FINAL
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n✅  Seed démo terminé avec succès !')
  console.log('    2 clients · 4 bâtiments · 10 équipements')
  console.log('    2 plans de maintenance')
  console.log('    15 interventions (3P · 2A · 3EC · 5T · 2AN)')
  console.log('    2 réouvertures · 3 demandes · 3 commentaires')
  console.log('\n    Comptes de démo :')
  console.log('      admin@echomaint.com   / EchoMaint2026!')
  console.log('      tech1@echomaint.com   / EchoMaint2026!')
  console.log('      tech2@echomaint.com   / EchoMaint2026!')
  console.log('      client1@echomaint.com / EchoMaint2026!')
}

// Pour réinitialiser et lancer : npx knex seed:run --specific=demo.seeder.js
