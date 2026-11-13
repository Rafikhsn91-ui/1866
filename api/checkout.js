/* ============================================================
   MAISON 1866 — /api/checkout (fonction Vercel, Node 18+)
   GET  → { ouvert } : la boutique accepte-t-elle des commandes ?
   POST → crée une session Stripe Checkout et renvoie son URL.

   Le PRIX et les FRAIS DE PORT sont définis ICI (le navigateur
   n'envoie que tailles, quantités et mode de livraison : il ne
   peut pas modifier un prix).

   Variables d'environnement (Vercel → Settings → Environment Variables) :
   STRIPE_SECRET_KEY  clé secrète Stripe (sk_test_… pour tester, sk_live_… en vrai)
   VENTES_OUVERTES    "oui" pour ouvrir la boutique (tout le reste = fermé)
   SITE_URL           facultatif, ex. https://maison1866.fr (sinon déduit)
   + RESEND_API_KEY, EMAIL_FROM, EMAIL_BOUTIQUE (voir api/message.js) :
     la boutique refuse d'ouvrir tant que la rétractation en ligne
     ne peut pas envoyer ses accusés de réception.
   ============================================================ */
'use strict';

var PRODUIT = { nom: 'Abyss Tee', prix: 3999, tailles: ['S', 'M', 'L', 'XL'] }; // centimes
var LIVRAISON = {
  relais:   { nom: 'Point relais Mondial Relay', prix: 490, min: 4, max: 8 },
  domicile: { nom: 'À domicile — Colissimo',     prix: 790, min: 3, max: 6 }
};
var MAX_ARTICLES = 10;

function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function etat() {
  var manque = [];
  if (!process.env.STRIPE_SECRET_KEY) manque.push('STRIPE_SECRET_KEY');
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.EMAIL_BOUTIQUE) manque.push('e-mails (RESEND_API_KEY, EMAIL_FROM, EMAIL_BOUTIQUE)');
  var flag = String(process.env.VENTES_OUVERTES || '').toLowerCase();
  if (flag !== 'oui' && flag !== 'true') manque.push('VENTES_OUVERTES=oui');
  return { ouvert: manque.length === 0, manque: manque };
}

function origine(req) {
  var fixe = process.env.SITE_URL;
  if (fixe && /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(fixe.replace(/\/$/, ''))) return fixe.replace(/\/$/, '');
  var host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return null;
  var proto = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https';
  return proto + '://' + host;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  var e = etat();

  if (req.method === 'GET') {
    return res.status(200).json({ ouvert: e.ouvert });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erreur: 'Méthode non autorisée.' });
  }
  if (!e.ouvert) {
    console.warn('Commande refusée, boutique fermée. Manque :', e.manque.join(', '));
    return res.status(503).json({ erreur: 'Les commandes ouvrent très bientôt.' });
  }

  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (x) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ erreur: 'Requête invalide.' });

  if (body.cgv !== true) return res.status(400).json({ erreur: 'Merci d\'accepter les conditions générales de vente.' });

  // --- Panier : tailles et quantités uniquement, regroupées par taille ---
  if (!Array.isArray(body.items) || !body.items.length) return res.status(400).json({ erreur: 'Panier vide.' });
  var parTaille = {}, total = 0;
  for (var i = 0; i < body.items.length && i < 20; i++) {
    var it = body.items[i] || {};
    var taille = clean(it.taille, 4).toUpperCase();
    var qte = Math.floor(Number(it.qte));
    if (PRODUIT.tailles.indexOf(taille) < 0 || !isFinite(qte) || qte < 1) {
      return res.status(400).json({ erreur: 'Article invalide dans le panier.' });
    }
    parTaille[taille] = (parTaille[taille] || 0) + qte;
    total += qte;
  }
  if (total > MAX_ARTICLES) return res.status(400).json({ erreur: 'Maximum ' + MAX_ARTICLES + ' articles par commande.' });

  // --- Livraison ---
  var mode = body.livraison === 'domicile' ? 'domicile' : (body.livraison === 'relais' ? 'relais' : null);
  if (!mode) return res.status(400).json({ erreur: 'Mode de livraison invalide.' });
  var relais = null;
  if (mode === 'relais') {
    var r = body.relais || {};
    relais = {
      id: clean(r.id, 20),
      nom: clean(r.nom, 80),
      adresse: clean(r.adresse, 120),
      cp: clean(r.cp, 10),
      ville: clean(r.ville, 60),
      saisie: clean(r.saisie, 200) // mode sans carte : point relais tapé par le client
    };
    if (relais.id && !/^[A-Za-z0-9-]{1,20}$/.test(relais.id)) return res.status(400).json({ erreur: 'Point relais invalide.' });
    if (!relais.id && relais.saisie.length < 5) return res.status(400).json({ erreur: 'Choisissez votre point relais.' });
  }

  var base = origine(req);
  if (!base) return res.status(400).json({ erreur: 'Origine invalide.' });

  // --- Paramètres Stripe Checkout ---
  var p = new URLSearchParams();
  p.append('mode', 'payment');
  p.append('locale', 'fr');
  p.append('success_url', base + '/merci.html?session_id={CHECKOUT_SESSION_ID}');
  p.append('cancel_url', base + '/commande.html');
  p.append('billing_address_collection', 'required');
  p.append('phone_number_collection[enabled]', 'true');

  var n = 0, resume = [];
  PRODUIT.tailles.forEach(function (t) {
    if (!parTaille[t]) return;
    p.append('line_items[' + n + '][quantity]', String(parTaille[t]));
    p.append('line_items[' + n + '][price_data][currency]', 'eur');
    p.append('line_items[' + n + '][price_data][unit_amount]', String(PRODUIT.prix));
    p.append('line_items[' + n + '][price_data][product_data][name]', PRODUIT.nom + ' — Taille ' + t);
    resume.push(t + ' ×' + parTaille[t]);
    n++;
  });

  var L = LIVRAISON[mode];
  var s = 'shipping_options[0][shipping_rate_data]';
  p.append(s + '[type]', 'fixed_amount');
  p.append(s + '[display_name]', L.nom);
  p.append(s + '[fixed_amount][amount]', String(L.prix));
  p.append(s + '[fixed_amount][currency]', 'eur');
  p.append(s + '[delivery_estimate][minimum][unit]', 'business_day');
  p.append(s + '[delivery_estimate][minimum][value]', String(L.min));
  p.append(s + '[delivery_estimate][maximum][unit]', 'business_day');
  p.append(s + '[delivery_estimate][maximum][value]', String(L.max));
  if (mode === 'domicile') p.append('shipping_address_collection[allowed_countries][0]', 'FR');

  var relaisTxt = '';
  if (relais) {
    relaisTxt = relais.id
      ? [relais.nom, relais.adresse, (relais.cp + ' ' + relais.ville).trim()].filter(Boolean).join(', ') + ' (n° ' + relais.id + ')'
      : relais.saisie;
  }

  var meta = {
    articles: resume.join(', '),
    livraison: mode,
    relais_id: relais ? relais.id : '',
    relais: relaisTxt.slice(0, 480)
  };
  Object.keys(meta).forEach(function (k) {
    p.append('metadata[' + k + ']', meta[k]);
    p.append('payment_intent_data[metadata][' + k + ']', meta[k]);
  });
  p.append('payment_intent_data[description]', 'Maison 1866 — ' + PRODUIT.nom + ' ' + meta.articles + ' — ' + L.nom);

  p.append('custom_text[submit][message]',
    (relais ? 'Livraison au point relais : ' + relaisTxt + '. ' : '') +
    'En payant, vous passez une commande avec obligation de paiement et acceptez nos conditions générales de vente (' + base + '/cgv.html).');

  try {
    var r2 = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: p.toString()
    });
    var j = await r2.json();
    if (!r2.ok || !j.url) {
      console.error('Stripe :', r2.status, j && j.error && j.error.message);
      return res.status(502).json({ erreur: 'Le paiement est momentanément indisponible.' });
    }
    return res.status(200).json({ url: j.url });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ erreur: 'Le paiement est momentanément indisponible.' });
  }
};
