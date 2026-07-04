/* ============================================================
   1866 — MOTEUR PANIER
   Partagé entre toutes les pages via localStorage.
   Le panier persiste quand on navigue index -> lookbook -> story.
   ============================================================ */
(function (global) {
  'use strict';

  var Cart = {};
  var KEY = 'cart1866';
  var items = [];

  var FRONT_IMG = ''; // défini par la page via Cart.setImage()

  try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { items = []; }

  Cart.setImage = function (dataUrl) { FRONT_IMG = dataUrl; };

  Cart.get = function () { return items; };

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
    var ex = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].name === product.name && items[i].size === size) ex = items[i];
    }
    if (ex) ex.qty++;
    else items.push({ name: product.name, price: product.price, size: size, qty: 1 });
    save();
    Cart.updateBadge(true);
  };

  Cart.changeQty = function (name, size, delta) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].name === name && items[i].size === size) {
        items[i].qty += delta;
        if (items[i].qty <= 0) items.splice(i, 1);
        break;
      }
    }
    save();
    Cart.updateBadge(false);
    Cart.render();
  };

  Cart.remove = function (name, size) {
    items = items.filter(function (i) {
      return !(i.name === name && i.size === size);
    });
    save();
    Cart.updateBadge(false);
    Cart.render();
  };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }

  Cart.updateBadge = function (pop) {
    var b = document.getElementById('badge');
    if (!b) return;
    b.textContent = Cart.count();
    if (pop) {
      b.classList.add('pop');
      setTimeout(function () { b.classList.remove('pop'); }, 400);
    }
  };

  Cart.render = function () {
    var bd = document.getElementById('c-bd');
    var ft = document.getElementById('c-ft');
    if (!bd) return;
    if (!items.length) {
      bd.innerHTML = '<div class="c-empty"><div class="c-ei">1866</div>' +
        '<p class="c-et">Votre archive est vide.<br>Ajoutez votre premier chapitre.</p></div>';
      if (ft) ft.style.display = 'none';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      html += '<div class="c-it">' +
        '<div class="c-th"><img src="' + FRONT_IMG + '" alt="' + it.name + '"></div>' +
        '<div><div class="c-in">' + it.name + '</div>' +
        '<div class="c-is">Taille ' + it.size + '</div>' +
        '<div class="c-qty">' +
        '<button class="c-qb" onclick="Cart.changeQty(\'' + it.name + '\',\'' + it.size + '\',-1)" aria-label="Réduire">−</button>' +
        '<span class="c-qn">' + it.qty + '</span>' +
        '<button class="c-qb" onclick="Cart.changeQty(\'' + it.name + '\',\'' + it.size + '\',1)" aria-label="Augmenter">+</button>' +
        '</div></div>' +
        '<div><div class="c-ip">' + (it.price * it.qty).toFixed(2).replace('.', ',') + ' €</div>' +
        '<button class="c-rm" onclick="Cart.remove(\'' + it.name + '\',\'' + it.size + '\')">Retirer</button>' +
        '</div></div>';
    }
    bd.innerHTML = html;
    var tp = document.getElementById('c-total');
    if (tp) tp.textContent = Cart.total().toFixed(2).replace('.', ',') + ' €';
    if (ft) ft.style.display = 'block';
  };

  Cart.open = function () {
    Cart.render();
    var c = document.getElementById('cart');
    var o = document.getElementById('cov');
    if (c) c.classList.add('open');
    if (o) o.classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  Cart.close = function () {
    var c = document.getElementById('cart');
    var o = document.getElementById('cov');
    if (c) c.classList.remove('open');
    if (o) o.classList.remove('show');
    document.body.style.overflow = '';
  };

  /* Animation fly-to-cart */
  Cart.fly = function (triggerEl) {
    var badge = document.getElementById('badge');
    if (!badge || !triggerEl || !FRONT_IMG) return;
    var b = badge.getBoundingClientRect();
    var t = triggerEl.getBoundingClientRect();
    var img = document.createElement('img');
    img.src = FRONT_IMG;
    img.className = 'fly';
    var sx = t.left + t.width / 2 - 29;
    var sy = t.top + t.height / 2 - 36;
    img.style.left = sx + 'px';
    img.style.top = sy + 'px';
    document.body.appendChild(img);
    var ex = b.left + b.width / 2 - 29;
    var ey = b.top + b.height / 2 - 36;
    if (img.animate) {
      var anim = img.animate([
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + ((ex - sx) * 0.5) + 'px,' + ((ey - sy) - 70) + 'px) scale(0.7) rotate(-8deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (ex - sx) + 'px,' + (ey - sy) + 'px) scale(0.06) rotate(4deg)', opacity: 0 }
      ], { duration: 680, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
      anim.onfinish = function () { if (img.parentNode) img.parentNode.removeChild(img); };
    } else {
      setTimeout(function () { if (img.parentNode) img.parentNode.removeChild(img); }, 750);
    }
  };

  Cart.flash = function () {
    var f = document.getElementById('uf');
    if (!f) return;
    f.classList.add('fire');
    setTimeout(function () { f.classList.remove('fire'); }, 180);
  };

  /* Init : bind boutons communs */
  Cart.bind = function () {
    var cartBtn = document.getElementById('cart-btn');
    var cartClose = document.getElementById('cart-close');
    var cov = document.getElementById('cov');
    if (cartBtn) cartBtn.addEventListener('click', Cart.open);
    if (cartClose) cartClose.addEventListener('click', Cart.close);
    if (cov) cov.addEventListener('click', Cart.close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') Cart.close();
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
