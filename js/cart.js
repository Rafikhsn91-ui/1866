/* ============================================================
   1866 — MOTEUR PANIER (durci)
   Source de vérité unique, partagée entre les pages via localStorage.

   SÉCURITÉ
   - Aucun HTML n'est construit à partir des données stockées :
     tout est rendu via l'API DOM (textContent), jamais innerHTML.
   - Plus d'`onclick` inline : écouteurs délégués + data-attributs.
   - Ce qui sort du localStorage est considéré comme NON FIABLE
     (corrompu ou falsifié) et re-validé : types, longueurs, bornes.
   - Le prix affiché vient du catalogue défini dans le code, jamais
     d'une valeur stockée côté client.
   ============================================================ */
(function (global) {
  'use strict';

  var Cart = {};

  var KEY = 'm1866.cart.v1';   // clé versionnée
  var LEGACY_KEY = 'cart1866'; // ancienne clé, migrée puis supprimée
  var MAX_QTY = 10;
  var MAX_LINES = 20;
  var MAX_PRICE = 100000;

  var items = [];
  var FRONT_IMG = '';
  var catalog = null; // { nom: prix }

  /* ---------- validation ---------- */
  function text(v, max) {
    return (typeof v === 'string') ? v.slice(0, max) : '';
  }
  function qtyOf(v) {
    var n = Math.floor(Number(v));
    if (!isFinite(n) || n < 1) return 1;
    return n > MAX_QTY ? MAX_QTY : n;
  }
  function priceOf(name, stored) {
    if (catalog && Object.prototype.hasOwnProperty.call(catalog, name)) return catalog[name];
    var n = Number(stored);
    return (isFinite(n) && n >= 0 && n <= MAX_PRICE) ? n : 0;
  }
  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && out.length < MAX_LINES; i++) {
      var it = raw[i];
      if (!it || typeof it !== 'object') continue;
      var name = text(it.name, 80);
      if (!name) continue;
      out.push({
        name: name,
        size: text(it.size, 8),
        price: priceOf(name, it.price),
        qty: qtyOf(it.qty)
      });
    }
    return out;
  }

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(KEY);
      if (raw === null) {
        var old = localStorage.getItem(LEGACY_KEY);
        if (old !== null) { raw = old; localStorage.removeItem(LEGACY_KEY); }
      }
    } catch (e) { raw = null; }
    var parsed = [];
    try { parsed = JSON.parse(raw || '[]'); } catch (e) { parsed = []; }
    items = sanitize(parsed);
  }
  function save() {
    // Si le stockage échoue (mode privé, quota), le panier continue en mémoire.
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }
  load();

  /* ---------- API publique ---------- */

  // Le prix vient TOUJOURS du code, jamais du stockage client.
  Cart.setCatalog = function (list) {
    if (!list || !list.length) return;
    catalog = {};
    for (var i = 0; i < list.length; i++) catalog[list[i].name] = Number(list[i].price) || 0;
    for (var j = 0; j < items.length; j++) items[j].price = priceOf(items[j].name, items[j].price);
    save();
  };

  // N'accepte qu'une image inline (data:image/) ou un chemin relatif simple.
  // Bloque notamment javascript: et les URL externes.
  Cart.setImage = function (url) {
    if (typeof url !== 'string') return;
    if (/^data:image\//i.test(url) || /^[\w./-]+$/.test(url)) FRONT_IMG = url;
  };

  Cart.get = function () { return items.slice(); };

  Cart.count = function () {
    var n = 0;
    for (var i = 0; i < items.length; i++) n += items[i].qty;
    return n;
  };

  Cart.total = function () {
    var t = 0;
    for (var i = 0; i < items.length; i++) t += items[i].price * items[i].qty;
    return t;
  };

  Cart.add = function (product, size) {
    if (!product || typeof product.name !== 'string') return;
    var name = text(product.name, 80);
    var sz = text(size, 8);
    for (var i = 0; i < items.length; i++) {
      if (items[i].name === name && items[i].size === sz) {
        items[i].qty = qtyOf(items[i].qty + 1);
        save(); Cart.updateBadge(true);
        return;
      }
    }
    if (items.length >= MAX_LINES) return;
    items.push({ name: name, size: sz, price: priceOf(name, product.price), qty: 1 });
    save();
    Cart.updateBadge(true);
  };

  function setQty(i, n) {
    if (i < 0 || i >= items.length) return;
    if (n <= 0) items.splice(i, 1);
    else items[i].qty = qtyOf(n);
    save();
    Cart.updateBadge(false);
    Cart.render();
  }
  function indexOf(name, size) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].name === name && items[i].size === size) return i;
    }
    return -1;
  }

  Cart.changeQty = function (name, size, delta) {
    var i = indexOf(name, size);
    if (i >= 0) setQty(i, items[i].qty + Number(delta || 0));
  };
  Cart.remove = function (name, size) {
    var i = indexOf(name, size);
    if (i >= 0) { items.splice(i, 1); save(); Cart.updateBadge(false); Cart.render(); }
  };

  Cart.updateBadge = function (pop) {
    var b = document.getElementById('badge');
    if (!b) return;
    b.textContent = String(Cart.count());
    if (pop) {
      b.classList.add('pop');
      setTimeout(function () { b.classList.remove('pop'); }, 400);
    }
  };

  /* ---------- rendu (API DOM uniquement) ---------- */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function money(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
  function qbtn(label, action, idx, aria) {
    var b = el('button', 'c-qb', label);
    b.type = 'button';
    b.setAttribute('aria-label', aria);
    b.setAttribute('data-cart-action', action);
    b.setAttribute('data-cart-index', String(idx));
    return b;
  }

  Cart.render = function () {
    var bd = document.getElementById('c-bd');
    var ft = document.getElementById('c-ft');
    if (!bd) return;
    bd.textContent = '';

    if (!items.length) {
      var em = el('div', 'c-empty');
      em.appendChild(el('div', 'c-ei', '1866'));
      var p = el('p', 'c-et');
      p.appendChild(document.createTextNode("Rien ici pour l'instant."));
      p.appendChild(document.createElement('br'));
      p.appendChild(document.createTextNode('Chapter I vous attend.'));
      em.appendChild(p);
      var a = el('a', 'btn-line', 'Découvrir Abyss Tee');
      a.href = '#shop';
      a.setAttribute('data-cart-shop', '');
      em.appendChild(a);
      bd.appendChild(em);
      if (ft) ft.style.display = 'none';
      return;
    }

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var row = el('div', 'c-it');

      var th = el('div', 'c-th');
      if (FRONT_IMG) {
        var im = document.createElement('img');
        im.src = FRONT_IMG;
        im.alt = it.name;
        th.appendChild(im);
      }
      row.appendChild(th);

      var mid = el('div');
      mid.appendChild(el('div', 'c-in', it.name));
      if (it.size) mid.appendChild(el('div', 'c-is', 'Taille ' + it.size));
      var q = el('div', 'c-qty');
      q.appendChild(qbtn('−', 'dec', i, 'Réduire la quantité'));
      q.appendChild(el('span', 'c-qn', String(it.qty)));
      q.appendChild(qbtn('+', 'inc', i, 'Augmenter la quantité'));
      mid.appendChild(q);
      row.appendChild(mid);

      var right = el('div');
      right.appendChild(el('div', 'c-ip', money(it.price * it.qty)));
      var rm = el('button', 'c-rm', 'Retirer');
      rm.type = 'button';
      rm.setAttribute('data-cart-action', 'remove');
      rm.setAttribute('data-cart-index', String(i));
      right.appendChild(rm);
      row.appendChild(right);

      bd.appendChild(row);
    }

    var tp = document.getElementById('c-total');
    if (tp) tp.textContent = money(Cart.total());
    if (ft) ft.style.display = 'block';
  };

  /* ---------- ouverture / fermeture ---------- */
  Cart.open = function () {
    Cart.render();
    var c = document.getElementById('cart');
    var o = document.getElementById('cov');
    if (c) c.classList.add('open');
    if (o) o.classList.add('show');
    document.body.classList.add('locked');
  };

  Cart.close = function () {
    var c = document.getElementById('cart');
    var o = document.getElementById('cov');
    if (c) c.classList.remove('open');
    if (o) o.classList.remove('show');
    document.body.classList.remove('locked');
  };

  Cart.flash = function () {
    var f = document.getElementById('uf');
    if (!f) return;
    f.classList.add('fire');
    setTimeout(function () { f.classList.remove('fire'); }, 180);
  };

  /* ---------- init : écouteurs délégués ---------- */
  Cart.bind = function () {
    var cartBtn = document.getElementById('cart-btn');
    var cartClose = document.getElementById('cart-close');
    var cov = document.getElementById('cov');
    if (cartBtn) cartBtn.addEventListener('click', function () { Cart.open(); });
    if (cartClose) cartClose.addEventListener('click', function () { Cart.close(); });
    if (cov) cov.addEventListener('click', function () { Cart.close(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') Cart.close();
    });

    // Délégation : remplace les onclick inline (plus aucune donnée
    // stockée n'est interprétée comme du code).
    var bd = document.getElementById('c-bd');
    if (bd) bd.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== bd && !(t.getAttribute && t.getAttribute('data-cart-action'))) t = t.parentNode;
      if (!t || t === bd) return;
      var action = t.getAttribute('data-cart-action');
      var idx = parseInt(t.getAttribute('data-cart-index'), 10);
      if (isNaN(idx) || idx < 0 || idx >= items.length) return;
      if (action === 'inc') setQty(idx, items[idx].qty + 1);
      else if (action === 'dec') setQty(idx, items[idx].qty - 1);
      else if (action === 'remove') { items.splice(idx, 1); save(); Cart.updateBadge(false); Cart.render(); }
    });

    Cart.updateBadge(false);
  };

  global.Cart = Cart;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Cart.bind);
  } else {
    Cart.bind();
  }

})(window);
