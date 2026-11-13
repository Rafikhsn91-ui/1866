/* ============================================================
   MAISON 1866 — PAGE DE COMMANDE
   Panier (localStorage via js/cart.js) → livraison (point relais
   Mondial Relay ou domicile) → acceptation des CGV → /api/checkout
   → redirection vers la page de paiement Stripe.
   Le navigateur n'envoie que tailles, quantités et livraison :
   les prix sont recalculés côté serveur.
   ============================================================ */
(function () {
  'use strict';
  var C = window.M1866 || {};
  var $ = function (id) { return document.getElementById(id); };
  var MR_WIDGET = 'https://widget.mondialrelay.com/parcelshoppicker/jquery.plugin.mondialrelay.parcelshoppicker.min.js';

  var ouvert = false, relais = null, modeManuel = false, widgetPret = false;

  function prix(n) { return Number(n).toFixed(2).replace('.', ',') + ' €'; }
  function mode() {
    var r = document.querySelector('input[name="livraison"]:checked');
    return r ? r.value : 'relais';
  }
  function fraisPort() {
    var L = C.livraison || {};
    var m = L[mode()] || {};
    return Number(m.prix) || 0;
  }

  if (typeof Cart !== 'undefined' && C.produit) {
    Cart.setCatalog([{ name: C.produit.nom, price: C.produit.prix }]);
    if (window.IMG1866) Cart.setImage(window.IMG1866.front);
  }

  /* ---------- 01 · Panier ---------- */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function renderLines() {
    var box = $('lines'); box.textContent = '';
    var items = (typeof Cart !== 'undefined') ? Cart.get() : [];
    if (!items.length) {
      var e = el('div', 'empty');
      e.appendChild(document.createTextNode('Votre panier est vide. '));
      var a = el('a', null, 'Découvrir Abyss Tee'); a.href = 'index.html#shop';
      e.appendChild(a);
      box.appendChild(e);
    }
    items.forEach(function (it) {
      var row = el('div', 'line');
      var th = el('div', 'th');
      if (window.IMG1866 && window.IMG1866.front) {
        var im = document.createElement('img'); im.src = window.IMG1866.front; im.alt = ''; th.appendChild(im);
      }
      row.appendChild(th);
      var mid = el('div');
      mid.appendChild(el('div', 'nm', it.name));
      mid.appendChild(el('div', 'sz', 'Taille ' + it.size));
      var q = el('div', 'sz'); q.style.marginTop = '6px'; q.style.display = 'flex'; q.style.alignItems = 'center'; q.style.gap = '4px';
      [['−', -1, 'Retirer un exemplaire'], ['+', 1, 'Ajouter un exemplaire']].forEach(function (b, k) {
        var btn = el('button', null, b[0]);
        btn.type = 'button'; btn.setAttribute('aria-label', b[2] + ' — taille ' + it.size);
        btn.style.cssText = 'width:36px;height:36px;border:1px solid var(--line-2);font-size:16px';
        btn.addEventListener('click', function () { Cart.changeQty(it.name, it.size, b[1]); refresh(); });
        if (k === 0) { q.appendChild(btn); q.appendChild(el('span', null, ' ' + it.qty + ' ')); }
        else q.appendChild(btn);
      });
      mid.appendChild(q);
      row.appendChild(mid);
      row.appendChild(el('div', 'pr', prix(it.price * it.qty)));
      box.appendChild(row);
    });
    return items;
  }

  /* ---------- 03 · Totaux ---------- */
  function renderTotals(items) {
    var sub = 0;
    items.forEach(function (it) { sub += it.price * it.qty; });
    var ship = items.length ? fraisPort() : 0;
    $('t-sub').textContent = prix(sub);
    $('t-ship').textContent = items.length ? prix(ship) : '—';
    $('t-total').textContent = prix(sub + ship);
  }
  function refresh() { renderTotals(renderLines()); }

  /* ---------- 02 · Point relais ---------- */
  function showPick() {
    var p = $('relais-pick');
    if (relais) {
      p.className = 'relais-pick';
      p.textContent = 'Point relais sélectionné : ' + relais.nom + ', ' + relais.adresse + ', ' + relais.cp + ' ' + relais.ville;
    } else {
      p.className = 'relais-pick none';
      p.textContent = modeManuel ? 'Indiquez votre point relais ci-dessus.' : 'Aucun point relais sélectionné.';
    }
  }
  function passerEnManuel() {
    if (widgetPret) return;
    modeManuel = true;
    $('Zone_Widget').hidden = true;
    $('relais-lbl').hidden = true;
    $('relais-manuel').hidden = false;
    showPick();
  }
  function loadScript(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = ok; s.onerror = ko;
      document.head.appendChild(s);
    });
  }
  function initWidget() {
    var brand = (C.mondialRelay && C.mondialRelay.brand) || '';
    if (!brand.trim()) { passerEnManuel(); return; }
    var garde = setTimeout(passerEnManuel, 12000);
    loadScript('vendor/jquery-2.2.4.min.js')
      .then(function () { return loadScript('vendor/leaflet/leaflet.js'); })
      .then(function () { return loadScript(MR_WIDGET); })
      .then(function () {
        var jq = window.jQuery;
        if (!jq || !jq.fn || !jq.fn.MR_ParcelShopPicker) throw new Error('widget absent');
        jq('#Zone_Widget').MR_ParcelShopPicker({
          Target: '#Retour_Widget',
          Brand: brand,
          Country: 'FR',
          AllowedCountries: 'FR',
          ColLivMod: '24R',
          NbResults: '7',
          Responsive: true,
          ShowResultsOnMap: true,
          EnableGeolocalisatedSearch: false,
          OnParcelShopSelected: function (d) {
            relais = {
              id: String(d.ID || ''),
              nom: String(d.Nom || ''),
              adresse: [d.Adresse1, d.Adresse2].filter(Boolean).join(' '),
              cp: String(d.CP || ''),
              ville: String(d.Ville || '')
            };
            showPick();
          }
        });
        widgetPret = true;
        clearTimeout(garde);
      })
      .catch(function () { clearTimeout(garde); passerEnManuel(); });
  }

  function onMode() {
    $('relais-zone').hidden = (mode() !== 'relais');
    refresh();
  }
  Array.prototype.forEach.call(document.querySelectorAll('input[name="livraison"]'), function (r) {
    r.addEventListener('change', onMode);
  });
  var saisie = $('relais-saisie');
  if (saisie) saisie.addEventListener('input', showPick);

  /* ---------- État de la boutique ---------- */
  function fermer(texte) {
    ouvert = false;
    var n = $('etat');
    n.hidden = false;
    n.textContent = '';
    var s = el('strong', null, 'Les commandes ouvrent très bientôt. ');
    n.appendChild(s);
    n.appendChild(document.createTextNode(texte || 'Votre panier reste enregistré sur cet appareil.'));
    $('pay').setAttribute('aria-disabled', 'true');
  }
  fetch('api/checkout', { headers: { 'Accept': 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : { ouvert: false }; })
    .then(function (j) { if (j && j.ouvert) { ouvert = true; $('pay').removeAttribute('aria-disabled'); } else fermer(); })
    .catch(function () { fermer(); });

  /* ---------- Paiement ---------- */
  var msg = $('pay-msg');
  function erreur(t) { msg.className = 'msg err'; msg.textContent = t; }

  $('pay').addEventListener('click', function () {
    var btn = this;
    if (!ouvert) { erreur('Les commandes ne sont pas encore ouvertes.'); return; }
    var items = Cart.get();
    if (!items.length) { erreur('Votre panier est vide.'); return; }

    var m = mode(), envoiRelais = null;
    if (m === 'relais') {
      if (relais) envoiRelais = relais;
      else if (modeManuel && saisie.value.trim().length >= 5) envoiRelais = { saisie: saisie.value.trim() };
      else { erreur('Choisissez votre point relais.'); $('relais-zone').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    }
    if (!$('cgv').checked) { erreur('Merci d\'accepter les conditions générales de vente.'); return; }

    btn.setAttribute('aria-disabled', 'true');
    msg.className = 'msg'; msg.textContent = 'Redirection vers le paiement sécurisé…';

    fetch('api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(function (it) { return { taille: it.size, qte: it.qty }; }),
        livraison: m,
        relais: envoiRelais,
        cgv: true
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (res.ok && res.j.url && /^https:\/\/checkout\.stripe\.com\//.test(res.j.url)) {
        window.location.href = res.j.url;
        return;
      }
      btn.removeAttribute('aria-disabled');
      erreur(res.j.erreur || 'Le paiement est momentanément indisponible.');
    }).catch(function () {
      btn.removeAttribute('aria-disabled');
      erreur('Connexion impossible. Réessayez dans un instant.');
    });
  });

  refresh();
  onMode();
  initWidget();
})();
