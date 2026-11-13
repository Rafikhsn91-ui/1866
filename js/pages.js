/* ============================================================
   MAISON 1866 — REMPLISSAGE DES PAGES SECONDAIRES
   Lit window.M1866 (js/config.js) et remplit les éléments
   portant data-cfg="chemin.du.champ". Rendu via textContent
   uniquement (aucune injection HTML).
   - data-cfg-type="prix"   → 4,90 €
   - data-cfg-type="email"  → lien mailto
   - data-cfg-type="url"    → lien externe
   Un champ vide affiche « [À compléter] » surligné.
   ============================================================ */
(function () {
  'use strict';
  var C = window.M1866 = window.M1866 || {};

  function get(path) {
    var parts = String(path).split('.'), v = C;
    for (var i = 0; i < parts.length; i++) {
      if (v == null || typeof v !== 'object') return '';
      v = v[parts[i]];
    }
    return v == null ? '' : v;
  }
  function prix(n) {
    var x = Number(n);
    return isFinite(x) ? x.toFixed(2).replace('.', ',') + ' €' : '';
  }
  window.M1866.get = get;
  window.M1866.prix = prix;

  function fill(el) {
    var v = get(el.getAttribute('data-cfg'));
    var type = el.getAttribute('data-cfg-type');
    el.textContent = '';
    if (v === '' || v === null) {
      var t = document.createElement('span');
      t.className = 'todo';
      t.textContent = '[À compléter]';
      el.appendChild(t);
      return;
    }
    if (type === 'prix') { el.textContent = prix(v); return; }
    if (type === 'email' && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v)) {
      var a = document.createElement('a');
      a.href = 'mailto:' + v; a.textContent = v;
      el.appendChild(a); return;
    }
    if (type === 'url' && /^https:\/\/[^\s<>"]+$/.test(v)) {
      var l = document.createElement('a');
      l.href = v; l.textContent = v.replace(/^https:\/\//, '').replace(/\/$/, '');
      l.rel = 'noopener'; l.target = '_blank';
      el.appendChild(l); return;
    }
    el.textContent = String(v);
  }

  function run() {
    var els = document.querySelectorAll('[data-cfg]');
    for (var i = 0; i < els.length; i++) fill(els[i]);
    var y = document.querySelectorAll('[data-year]');
    for (var j = 0; j < y.length; j++) y[j].textContent = String(new Date().getFullYear());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
