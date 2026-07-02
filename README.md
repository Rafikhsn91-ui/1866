# 1866 — Les Carnets du Sous-Sol

Site e-commerce expérience pour la marque 1866. T-shirt 3D interactif, motion design cinématographique, panier persistant.

## Déploiement

Dépose **tout le contenu de ce dossier** à la racine de ton repo GitHub (ou glisse-le sur Vercel). Structure à respecter :

```
/
├── index.html          ← page produit (accueil, t-shirt 3D)
├── lookbook.html       ← galerie visuelle
├── story.html          ← histoire de la marque
├── css/
│   └── effects.css     ← animations partagées
├── js/
│   ├── images.js       ← tes photos (base64) — chargé en 1er
│   ├── cart.js         ← panier partagé (localStorage)
│   ├── animations.js   ← moteur d'animations
│   └── tshirt3d.js     ← moteur 3D du t-shirt
└── README.md
```

**Important** : garde les dossiers `css/` et `js/` tels quels. Les pages y font référence en chemin relatif, donc tout fonctionne sans configuration sur GitHub Pages comme sur Vercel.

## Activer GitHub Pages

1. Repo → Settings → Pages
2. Source : `Deploy from a branch`
3. Branch : `main` / dossier `/ (root)`
4. Ton site sera en ligne sur `https://<ton-user>.github.io/<repo>/`

## Le t-shirt 3D

Les deux photos (face + dos) sont montées sur un tissu 3D avec volume, épaisseur, drapé et ondulation. On peut le faire pivoter au doigt (mobile) ou à la souris (desktop). Il tourne doucement tout seul après quelques secondes d'inactivité.

La 3D utilise **Three.js** chargé depuis un CDN — une connexion internet est nécessaire (toujours le cas pour un site en ligne). Si la 3D ne peut pas se charger, les deux photos s'affichent automatiquement côte à côte.

## Changer les images

Tes photos sont encodées dans `js/images.js`. Pour les remplacer, convertis tes nouvelles images en base64 (par ex. sur base64-image.de) et remplace les valeurs `front` et `back` dans le fichier.

## Changer le prix

Cherche `39.99` dans `index.html` (variable `PRODUCT`) et `js/cart.js` — remplace par ton prix.

## Paiement

Le bouton Checkout est un prototype. Pour accepter les vrais paiements, connecte Stripe (Stripe Checkout ou Payment Links) au bouton `.c-co`.
