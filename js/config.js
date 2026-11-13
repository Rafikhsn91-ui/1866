/* ============================================================
   MAISON 1866 — FICHE D'IDENTITÉ DE LA BOUTIQUE
   ------------------------------------------------------------
   C'est LE fichier à remplir. Toutes les pages légales (mentions,
   CGV, confidentialité, rétractation) et la page de commande lisent
   leurs informations ici. Un champ vide s'affiche « [À compléter] »
   en surligné : tant qu'il en reste, la boutique n'est pas prête.

   ⚠ Les PRIX et FRAIS DE PORT sont AUSSI définis côté serveur dans
   api/checkout.js (c'est le serveur qui fait foi pour le paiement).
   Si tu changes un prix ici, change-le là-bas aussi.
   ============================================================ */
window.M1866 = {

  marque: 'Maison 1866',

  /* ---------- Exploitant (toi, en entreprise individuelle) ---------- */
  exploitant: {
    nom: '',                    // nom et prénom tels que déclarés au guichet unique
    statut: 'Entrepreneur individuel (EI) — micro-entreprise',
    adresse: '',                // adresse de l'entreprise (domicile ou domiciliation)
    telephone: '',              // obligatoire dans les mentions légales
    email: '',                  // e-mail de contact de la marque
    siret: '',                  // reçu après la déclaration au guichet unique
    immatriculation: 'Registre national des entreprises (RNE)',
    tva: 'TVA non applicable, art. 293 B du CGI',
    idu: ''                     // identifiant unique Refashion (REP textile)
  },

  /* ---------- Hébergeur du site ----------
     La loi demande aussi son numéro de téléphone : Vercel ne le publie
     pas sur ses pages légales, à récupérer auprès de leur support. */
  hebergeur: {
    nom: 'Vercel Inc.',
    adresse: '440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis',
    telephone: '',
    site: 'https://vercel.com'
  },

  /* ---------- Médiateur de la consommation ---------- */
  mediateur: {
    nom: '',
    adresse: '',
    site: ''                    // ex. https://www.exemple-mediateur.fr
  },

  /* ---------- Produit & livraison (affichage) ---------- */
  produit: { nom: 'Abyss Tee', prix: 39.99 },

  livraison: {
    zone: 'France métropolitaine',
    expedition: 'sous 3 jours ouvrés après le paiement',
    relais: { libelle: 'Point relais Mondial Relay', prix: 4.90, delai: '3 à 5 jours ouvrés' },
    domicile: { libelle: 'À domicile — Colissimo', prix: 7.90, delai: '2 à 3 jours ouvrés' }
  },

  /* ---------- Mondial Relay ----------
     Code enseigne (8 caractères) fourni par Mondial Relay avec ton
     compte pro. 'BDTEST  ' est le code de test officiel : il affiche
     un bandeau « test ». Laisse vide pour remplacer la carte par un
     simple champ « point relais choisi ». */
  mondialRelay: { brand: 'BDTEST  ' }
};
