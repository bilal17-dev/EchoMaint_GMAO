/**
 * users.seeder.js — Utilisateurs de démonstration
 *
 * Crée 4 comptes avec le mot de passe "EchoMaint2026!" (bcrypt, facteur 12).
 * À lancer EN PREMIER, avant demo.seeder.js (le seeder démo référence ces UUIDs).
 *
 * Lancement :
 *   npx knex seed:run --specific=users.seeder.js
 */

const bcrypt = require('bcryptjs')

// ─────────────────────────────────────────────────────────────────────────────
// UUIDs FIXES — partagés avec demo.seeder.js pour les références FK
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_ID   = '00000000-0000-4000-a000-000000000001'
const TECH1_ID   = '00000000-0000-4000-a000-000000000002'
const TECH2_ID   = '00000000-0000-4000-a000-000000000003'
const CLIENT1_ID = '00000000-0000-4000-a000-000000000004'

const MOT_DE_PASSE = 'EchoMaint2026!'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // ── 1. Hachage du mot de passe commun (facteur 12 = recommandé en production)
  //       C'est l'opération la plus lente (~1 s par hash) — normal.
  console.log('🔐  Hachage du mot de passe (facteur 12)…')
  const hash = await bcrypt.hash(MOT_DE_PASSE, 12)
  console.log('    Hash généré.')

  // ── 2. Suppression des utilisateurs existants
  //       On désactive les FK pour pouvoir supprimer même si des interventions
  //       ou commentaires référencent ces users.
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0')
  await knex('users').del()
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1')
  console.log('🗑   Table users vidée.')

  // ── 3. Insertion des 4 utilisateurs de démo
  await knex('users').insert([
    // ── Administrateur : accès complet à l'application
    {
      id           : ADMIN_ID,
      nom          : 'Diallo',
      prenom       : 'Amadou',
      email        : 'admin@echomaint.com',
      password_hash: hash,
      role         : 'admin',
      langue       : 'fr',
      actif        : true,
    },

    // ── Technicien 1 : assigné à la plupart des OT de démo
    {
      id           : TECH1_ID,
      nom          : 'Ndiaye',
      prenom       : 'Moussa',
      email        : 'tech1@echomaint.com',
      password_hash: hash,
      role         : 'technicien',
      langue       : 'fr',
      actif        : true,
    },

    // ── Technicien 2 : second technicien pour les interventions en cours
    {
      id           : TECH2_ID,
      nom          : 'Fall',
      prenom       : 'Fatou',
      email        : 'tech2@echomaint.com',
      password_hash: hash,
      role         : 'technicien',
      langue       : 'fr',
      actif        : true,
    },

    // ── Client : rattaché à Société Sénélec (id_client mis à jour dans demo.seeder.js)
    {
      id           : CLIENT1_ID,
      nom          : 'Sow',
      prenom       : 'Ibrahim',
      email        : 'client1@echomaint.com',
      password_hash: hash,
      role         : 'client',
      langue       : 'fr',
      actif        : true,
      // id_client sera renseigné par demo.seeder.js une fois le client Sénélec créé
    },
  ])

  console.log('✅  4 utilisateurs insérés :')
  console.log('    admin@echomaint.com   → admin')
  console.log('    tech1@echomaint.com   → technicien')
  console.log('    tech2@echomaint.com   → technicien')
  console.log('    client1@echomaint.com → client')
  console.log(`    Mot de passe commun : ${MOT_DE_PASSE}`)
}

// Pour réinitialiser et lancer : npx knex seed:run --specific=users.seeder.js
