/* ============================================================
   MAISON 1866 — /api/message (fonction Vercel, Node 18+)
   Trois usages, un seul point d'entrée :
   - retractation : accusé de réception au client (date + heure,
     support durable = e-mail) + copie à la boutique.
   - contact      : message transmis à la boutique.
   - newsletter   : inscription transmise à la boutique.

   Variables d'environnement (Vercel → Settings → Environment Variables) :
   RESEND_API_KEY  clé API Resend (resend.com)
   EMAIL_FROM      expéditeur vérifié, ex. "Maison 1866 <contact@ton-domaine.fr>"
   EMAIL_BOUTIQUE  ta boîte de réception, ex. "toi@gmail.com"
   Sans elles, la fonction répond 503 et les pages proposent l'e-mail.
   ============================================================ */
'use strict';

var LIMITS = { nom: 120, email: 160, commande: 160, articles: 1000, message: 3000 };
var EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

// Anti-abus minimal (par instance) : 6 envois / 10 min / IP.
var hits = new Map();
function tooMany(ip) {
  var now = Date.now(), win = 10 * 60 * 1000;
  var arr = (hits.get(ip) || []).filter(function (t) { return now - t < win; });
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 6;
}

function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function horodatage(d) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(d);
}
function asHtml(text) {
  return '<div style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#151515">' +
    esc(text).replace(/\n/g, '<br>') + '</div>';
}

async function send(mail) {
  var r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mail)
  });
  if (!r.ok) {
    var detail = await r.text().catch(function () { return ''; });
    throw new Error('Resend ' + r.status + ' ' + detail.slice(0, 300));
  }
  return r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, erreur: 'Méthode non autorisée.' });
  }

  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, erreur: 'Requête invalide.' });

  // Pot de miel : un robot remplit le champ caché, on fait semblant d'accepter.
  if (clean(body.site, 200)) return res.status(200).json({ ok: true, horodatage: horodatage(new Date()) });

  var ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
  if (tooMany(ip)) return res.status(429).json({ ok: false, erreur: 'Trop de tentatives, réessayez dans quelques minutes.' });

  var FROM = process.env.EMAIL_FROM, SHOP = process.env.EMAIL_BOUTIQUE;
  if (!process.env.RESEND_API_KEY || !FROM || !SHOP) {
    return res.status(503).json({ ok: false, erreur: 'L\'envoi automatique n\'est pas encore activé.' });
  }

  var type = clean(body.type, 20);
  var nom = clean(body.nom, LIMITS.nom);
  var email = clean(body.email, LIMITS.email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, erreur: 'E-mail invalide.' });

  var now = new Date(), quand = horodatage(now);

  try {
    if (type === 'retractation') {
      var commande = clean(body.commande, LIMITS.commande);
      var articles = clean(body.articles, LIMITS.articles) || 'Toute la commande';
      if (!nom || !commande) return res.status(400).json({ ok: false, erreur: 'Nom et commande obligatoires.' });

      var declaration =
        'Je notifie par la présente ma rétractation du contrat portant sur la vente des biens ci-dessous.\n\n' +
        'Nom : ' + nom + '\n' +
        'E-mail : ' + email + '\n' +
        'Commande : ' + commande + '\n' +
        'Articles : ' + articles + '\n' +
        'Déclaration envoyée le : ' + quand + ' (heure de Paris)';

      var ack =
        'Bonjour ' + nom + ',\n\n' +
        'Nous accusons réception de votre déclaration de rétractation, envoyée depuis notre site le ' + quand + ' (heure de Paris).\n\n' +
        '— Contenu de votre déclaration —\n' + declaration + '\n\n' +
        'Prochaines étapes : renvoyez le ou les articles, dans leur état d\'origine, au plus tard quatorze jours après votre déclaration ' +
        '(les frais de renvoi sont à votre charge). Nous vous rembourserons au plus tard quatorze jours après la réception de cette déclaration, ' +
        'avec le moyen de paiement utilisé ; le remboursement peut être différé jusqu\'à réception du colis ou de sa preuve d\'expédition.\n\n' +
        'Conservez cet e-mail : il constitue votre accusé de réception.\n\nMaison 1866';

      // L'accusé au client est obligatoire : s'il échoue, on renvoie une erreur.
      await send({ from: FROM, to: [email], reply_to: SHOP, subject: 'Accusé de réception — votre rétractation (' + commande + ')', text: ack, html: asHtml(ack) });
      await send({ from: FROM, to: [SHOP], reply_to: email, subject: '[Rétractation] ' + nom + ' — ' + commande, text: declaration, html: asHtml(declaration) })
        .catch(function (e) { console.error('Copie boutique non envoyée :', e.message); });

      return res.status(200).json({ ok: true, horodatage: quand });
    }

    if (type === 'contact') {
      var message = clean(body.message, LIMITS.message);
      if (!nom || !message) return res.status(400).json({ ok: false, erreur: 'Nom et message obligatoires.' });
      var txt = 'Message reçu le ' + quand + '\n\nDe : ' + nom + ' <' + email + '>\n\n' + message;
      await send({ from: FROM, to: [SHOP], reply_to: email, subject: '[Contact] ' + nom, text: txt, html: asHtml(txt) });
      return res.status(200).json({ ok: true, horodatage: quand });
    }

    if (type === 'newsletter') {
      var ins = 'Nouvelle inscription « Chapter II » le ' + quand + ' : ' + email +
        '\nConsentement donné via le formulaire du site.';
      await send({ from: FROM, to: [SHOP], reply_to: email, subject: '[Newsletter] ' + email, text: ins, html: asHtml(ins) });
      return res.status(200).json({ ok: true, horodatage: quand });
    }

    return res.status(400).json({ ok: false, erreur: 'Type de message inconnu.' });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false, erreur: 'L\'envoi a échoué.' });
  }
};
