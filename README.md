# Maison 1866 — Chapter I

Site de marque pour **Maison 1866**. Pièce principale : **Abyss Tee**, 59 €.
Expérience éditoriale mono-page : révélation face/dos au curseur, storytelling
au scroll, panier persistant.

Stack : **HTML / CSS / JavaScript vanilla**. Aucune étape de build, aucun
`npm install`, aucune dépendance externe — le dépôt se déploie tel quel.

## Structure

```
/
├── index.html          ← l'expérience complète (hero, produit, story, FAQ, contact)
├── 404.html            ← page d'erreur (servie automatiquement par GitHub Pages)
├── lookbook.html       ← galerie visuelle
├── story.html          ← histoire de la marque
├── img/
│   ├── abyss-front.webp
│   └── abyss-back.webp ← photos produit (vrais fichiers, préchargeables)
├── css/
│   └── effects.css     ← effets partagés (pages secondaires)
├── js/
│   ├── images.js       ← chemins des photos — chargé en 1er
│   ├── cart.js         ← panier partagé (localStorage) — source de vérité unique
│   ├── animations.js   ← moteur d'animations (pages secondaires)
│   └── tshirt3d.js     ← moteur 3D (pages secondaires)
└── README.md
```

**Important** : garde les dossiers `css/` et `js/` tels quels. Les pages y font
référence en chemin relatif, donc tout fonctionne sans configuration sur
GitHub Pages comme sur Vercel.

## Lancer en local

Ouvrir `index.html` suffit, mais pour tester le `localStorage` et la CSP dans
des conditions réelles, servir le dossier en HTTP :

```bash
python3 -m http.server 8000
# puis http://127.0.0.1:8000
```

## Activer GitHub Pages

1. Repo → Settings → Pages
2. Source : `Deploy from a branch`
3. Branch : `main` / dossier `/ (root)`
4. Cocher **Enforce HTTPS**

Le site sera en ligne sur `https://<ton-user>.github.io/<repo>/`.

## Sécurité

Le site est statique, sans backend, sans cookie et sans compte : la surface
d'attaque est volontairement minimale.

Mesures en place :

- **Aucune ressource externe** — polices système, images inline en base64,
  zéro CDN. Rien à compromettre en amont (pas de supply chain).
- **Pas d'injection HTML** — `js/cart.js` rend le panier uniquement via l'API
  DOM (`textContent`), jamais `innerHTML`, et n'utilise plus d'`onclick`
  inline mais des écouteurs délégués. Une donnée piégée dans le `localStorage`
  s'affiche comme du texte, elle ne s'exécute pas.
- **Données du `localStorage` traitées comme non fiables** — re-validation des
  types et longueurs, quantités bornées (1–10), 20 lignes maximum, et le
  **prix vient toujours du catalogue défini dans le code**, jamais d'une
  valeur stockée côté client. Clé versionnée (`m1866.cart.v1`).
- **CSP** via `<meta>` : `default-src 'self'`, `object-src 'none'`,
  `connect-src 'none'`, `base-uri 'self'`, `img-src 'self' data:`.
  Un script externe injecté est bloqué.
- **Dégradation sûre** — sans JavaScript, le contenu reste visible et la page
  reste défilable ; l'écran d'intro se retire tout seul (filet CSS).
- `referrer` en `strict-origin-when-cross-origin`.

## Accessibilité

- Contrastes **conformes WCAG AA** (≥ 4.5:1) sur tous les fonds, y compris la
  section sombre `#within` qui redéfinit ses propres tokens de texte.
- Piège de focus dans le panier et le menu, focus rendu au déclencheur
  à la fermeture, fermeture au clavier par `Échap`.
- Onglets Face/Dos navigables aux flèches ← →, lien d'évitement en début de page.
- `prefers-reduced-motion` respecté partout.

### Limite connue

`frame-ancestors` (anti-clickjacking) et `X-Content-Type-Options` **ne sont pas
applicables via `<meta>`** : ils exigent de vrais en-têtes HTTP, que GitHub
Pages ne permet pas de configurer. Pour les activer, servir le site derrière
Cloudflare, Netlify ou Vercel et ajouter :

```
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

Comme le site n'a ni authentification ni action sensible, l'impact réel du
clickjacking reste faible en l'état.

## Changer le produit

Le produit est centralisé dans `index.html` (objet `PRODUCT`) :

```js
{ id:'abyss-tee', name:'Abyss Tee', price:59, currency:'EUR',
  material:'Coton lourd', gsm:240, fit:'Oversize', color:'Washed Black',
  sizes:['S','M','L','XL'] }
```

Le prix est ensuite transmis au panier via `Cart.setCatalog([PRODUCT])`, qui
fait foi. Penser à mettre à jour le libellé du bouton « Ajouter au panier » et
les données structurées JSON-LD en haut de `index.html`.

## Changer les images

Remplacer les fichiers dans `img/` (`abyss-front.webp`, `abyss-back.webp`).
Les chemins sont centralisés dans `js/images.js` ; `index.html` les écrit aussi
en dur dans les `<img src>` pour que le navigateur les précharge sans attendre
le JavaScript.

Penser à mettre à jour les attributs `width`/`height` des `<img>` si les
dimensions changent — ils évitent tout décalage de mise en page (CLS = 0).

Les photos sur **fond blanc** sont recommandées : le site les fond dans le fond
crème via `mix-blend-mode: multiply`, ce qui fait disparaître le rectangle.

> Note technique : pour que ce fondu fonctionne, le conteneur de l'image doit
> porter la couleur de fond, et l'image ne doit avoir ni `filter`, ni
> `transform`, ni `will-change` (cela isolerait la couche et casserait le blend).

## Paiement

Le paiement n'est **pas** connecté. Le bouton affiche clairement
« Paiement bientôt disponible ». Les formulaires de contact et de newsletter
donnent un retour visuel mais n'envoient rien (aucun backend). Pour accepter
de vrais paiements, brancher Stripe (Checkout ou Payment Links) sur `#checkout`.
