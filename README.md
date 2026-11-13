# Maison 1866 — Chapter I

Boutique en ligne de **Maison 1866**. Pièce principale : **Abyss Tee**, 39,99 €.
Site statique (HTML / CSS / JavaScript vanilla) + deux petites fonctions serveur
Vercel pour le paiement et les e-mails. Aucune étape de build, aucun `npm install`.

## Structure

```
/
├── index.html            ← la boutique (hero, produit, histoire, FAQ, contact)
├── commande.html         ← panier → livraison → CGV → paiement Stripe
├── merci.html            ← retour après paiement réussi
├── retractation.html     ← « Renoncer au contrat ici » (obligatoire depuis le 19/06/2026)
├── cgv.html              ← conditions générales de vente
├── mentions-legales.html
├── confidentialite.html
├── 404.html
├── api/
│   ├── checkout.js       ← crée la session de paiement Stripe (PRIX CÔTÉ SERVEUR)
│   └── message.js        ← e-mails : rétractation (accusé de réception), contact, newsletter
├── js/
│   ├── config.js         ← ★ TA FICHE D'IDENTITÉ : SIRET, adresse, médiateur, IDU…
│   ├── cart.js           ← panier partagé (localStorage)
│   ├── commande.js       ← logique de la page de commande + carte Mondial Relay
│   ├── retractation.js   ← formulaire de rétractation en 2 étapes
│   ├── pages.js          ← remplit les pages légales depuis config.js
│   ├── merci.js
│   └── images.js
├── css/pages.css         ← style des pages secondaires
├── img/                  ← photos produit
├── vendor/               ← jQuery 2.2.4 + Leaflet 1.9.4 (exigés par la carte Mondial Relay)
└── vercel.json           ← en-têtes de sécurité
```

## Mise en route — dans l'ordre

La boutique reste **fermée** (« Les commandes ouvrent très bientôt ») tant que les
étapes 1 à 6 ne sont pas faites. Rien ne peut être vendu par erreur.

1. **SIRET** — déclarer la micro-entreprise (achat-revente) sur le guichet unique de l'INPI.
2. **Médiateur de la consommation** — adhérer à un médiateur référencé (quelques dizaines d'€/an).
3. **Refashion** — s'enregistrer comme metteur sur le marché de textiles et obtenir l'**IDU**.
4. **Remplir `js/config.js`** — nom, adresse, téléphone, e-mail, SIRET, IDU, médiateur.
   Tout champ vide apparaît en surligné « [À compléter] » sur les pages légales.
5. **E-mails (Resend)** — créer un compte sur resend.com, y vérifier un nom de domaine,
   puis dans Vercel → *Settings → Environment Variables* :
   - `RESEND_API_KEY` = la clé API
   - `EMAIL_FROM` = `Maison 1866 <contact@ton-domaine.fr>`
   - `EMAIL_BOUTIQUE` = ta boîte de réception
6. **Stripe** — compte Stripe avec ton SIRET, puis dans Vercel :
   - `STRIPE_SECRET_KEY` = `sk_test_…` pour tester (carte `4242 4242 4242 4242`), puis `sk_live_…`
   - Dans Stripe → *Paramètres → E-mails clients* : activer les reçus de paiement.
   - Dans Stripe → *Paramètres → Notifications* : activer l'alerte « paiement réussi » pour toi.
7. **Mondial Relay** — compte pro, puis remplacer `'BDTEST  '` (code de test) par ton code
   enseigne dans `js/config.js`. Laisser vide = simple champ « point relais choisi » à la place de la carte.
8. **Ouvrir** — dans Vercel, ajouter `VENTES_OUVERTES` = `oui`, puis *Redeploy*.

Après chaque changement de variable d'environnement, il faut redéployer.

## Traiter une commande

Chaque paiement apparaît dans Stripe (*Paiements*). Dans le détail : nom, e-mail,
téléphone, adresse, et dans **Métadonnées** : `articles` (tailles × quantités),
`livraison` (relais ou domicile) et `relais` (point relais choisi + numéro).
Tu crées l'étiquette sur ton compte Mondial Relay ou Colissimo, puis tu envoies
le numéro de suivi au client.

Une rétractation envoyée depuis le site arrive dans `EMAIL_BOUTIQUE` avec l'objet
`[Rétractation]`. Remboursement depuis Stripe (*Paiement → Rembourser*), au plus
tard 14 jours après la déclaration ; frais de port remboursés à hauteur de 4,90 €.

## Changer un prix

Deux endroits, à garder identiques :
- `api/checkout.js` → `PRODUIT.prix` (en centimes) et `LIVRAISON` — **fait foi pour le paiement** ;
- `js/config.js` → `produit.prix` et `livraison` — affichage.
Puis les textes « 39,99 € » de `index.html` (prix, bouton, méta) et la FAQ livraison.

## Sécurité

- Le navigateur n'envoie que tailles, quantités et mode de livraison : **impossible de
  modifier un prix** depuis le site. Le montant est recalculé par `api/checkout.js`.
- Aucune donnée bancaire ne transite par le site (paiement hébergé par Stripe).
- Les clés secrètes vivent uniquement dans les variables d'environnement Vercel,
  jamais dans le dépôt (qui est public).
- CSP stricte sur chaque page ; seule `commande.html` autorise Mondial Relay et les
  fonds de carte. En-têtes HTTP (`nosniff`, `frame-ancestors 'none'`…) via `vercel.json`.
- Le panier (`localStorage`) est traité comme non fiable et re-validé (`js/cart.js`).
- Les fonctions refusent les requêtes mal formées, limitent les longueurs et ont un
  pot de miel anti-robots.

## Tester en local

Les pages s'ouvrent avec un simple serveur (`python3 -m http.server`), mais les
fonctions `api/` ne tournent que sur Vercel (ou avec `npx vercel dev`).
Sans elles, la page de commande affiche « Les commandes ouvrent très bientôt »
et les formulaires proposent l'e-mail.
