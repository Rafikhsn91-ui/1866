/* ============================================================
   1866 — BIBLIOTHÈQUE D'ANIMATIONS
   Effets réutilisables sur toutes les pages.
   Aucune dépendance. Vanilla JS.
   ============================================================ */
(function (global) {
  'use strict';

  var A = {};
  var reduceMotion = global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasHover = global.matchMedia &&
    global.matchMedia('(hover: hover)').matches;

  /* --------------------------------------------------------
     1. REVEAL au scroll (IntersectionObserver + fallback)
     Ajoute .in aux éléments .rv / .rv-clip / [data-reveal]
     -------------------------------------------------------- */
  A.initReveal = function () {
    var els = document.querySelectorAll('.rv, .rv-clip, [data-reveal]');
    if (!('IntersectionObserver' in global)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  };

  /* --------------------------------------------------------
     2. SPLIT TEXT — découpe un texte en lettres animables
     <h1 data-split>Titre</h1> -> spans .char
     -------------------------------------------------------- */
  A.initSplitText = function () {
    var els = document.querySelectorAll('[data-split]');
    els.forEach(function (el) {
      var text = el.textContent;
      el.textContent = '';
      el.setAttribute('aria-label', text);
      for (var i = 0; i < text.length; i++) {
        var span = document.createElement('span');
        span.className = 'char';
        span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
        span.style.transitionDelay = (i * 0.028) + 's';
        span.setAttribute('aria-hidden', 'true');
        el.appendChild(span);
      }
    });
  };

  /* --------------------------------------------------------
     3. PARALLAXE générique — [data-parallax="0.2"]
     -------------------------------------------------------- */
  var parallaxEls = [];
  A.initParallax = function () {
    if (reduceMotion) return;
    parallaxEls = Array.prototype.slice.call(
      document.querySelectorAll('[data-parallax]')
    );
  };
  function updateParallax() {
    var vh = global.innerHeight;
    for (var i = 0; i < parallaxEls.length; i++) {
      var el = parallaxEls[i];
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      var progress = (vh - r.top) / (vh + r.height) - 0.5;
      el.style.transform = 'translate3d(0,' + (progress * speed * 200) + 'px,0)';
    }
  }

  /* --------------------------------------------------------
     4. TILT 3D — [data-tilt] suit le curseur (desktop)
     -------------------------------------------------------- */
  A.initTilt = function () {
    if (!hasHover || reduceMotion) return;
    var cards = document.querySelectorAll('[data-tilt]');
    cards.forEach(function (card) {
      var strength = parseFloat(card.getAttribute('data-tilt')) || 8;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(1000px) rotateY(' + (px * strength) +
          'deg) rotateX(' + (-py * strength) +
          'deg) translateZ(6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform =
          'perspective(1000px) rotateY(0) rotateX(0) translateZ(0)';
      });
    });
  };

  /* --------------------------------------------------------
     5. CURSEUR magnétique (desktop)
     Nécessite #cur et #cur-r dans le DOM
     -------------------------------------------------------- */
  A.initCursor = function () {
    if (!hasHover) return;
    var dot = document.getElementById('cur');
    var ring = document.getElementById('cur-r');
    if (!dot || !ring) return;
    var cx = 0, cy = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', function (e) {
      cx = e.clientX; cy = e.clientY;
      dot.style.left = cx + 'px'; dot.style.top = cy + 'px';
    }, { passive: true });
    (function loop() {
      rx += (cx - rx) * 0.12; ry += (cy - ry) * 0.12;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('a,button,.sz,.m-sz,[data-tilt],[data-magnetic]'))
        document.body.classList.add('ch');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('a,button,.sz,.m-sz,[data-tilt],[data-magnetic]'))
        document.body.classList.remove('ch');
    });
  };

  /* --------------------------------------------------------
     6. BOUTONS MAGNÉTIQUES — [data-magnetic]
     L'élément est légèrement attiré vers le curseur
     -------------------------------------------------------- */
  A.initMagnetic = function () {
    if (!hasHover || reduceMotion) return;
    var els = document.querySelectorAll('[data-magnetic]');
    els.forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (mx * strength) + 'px,' + (my * strength) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'translate(0,0)';
      });
    });
  };

  /* --------------------------------------------------------
     7. KINETIC TEXT — mots qui s'illuminent au scroll
     Container [data-kinetic] avec enfants .k-word
     -------------------------------------------------------- */
  var kineticEls = [];
  A.initKinetic = function () {
    kineticEls = Array.prototype.slice.call(
      document.querySelectorAll('[data-kinetic]')
    );
  };
  function updateKinetic() {
    var vh = global.innerHeight;
    for (var i = 0; i < kineticEls.length; i++) {
      var el = kineticEls[i];
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
      var words = el.querySelectorAll('.k-word');
      for (var w = 0; w < words.length; w++) {
        words[w].classList.toggle('lit', p > (w / words.length) * 0.85);
      }
    }
  }

  /* --------------------------------------------------------
     8. SCROLL PROGRESS BAR — #prog
     -------------------------------------------------------- */
  A.initProgress = function () { /* géré dans la boucle */ };

  /* --------------------------------------------------------
     9. COUNT UP — [data-count="66"] compte de 0 à N au reveal
     -------------------------------------------------------- */
  A.initCountUp = function () {
    var els = document.querySelectorAll('[data-count]');
    if (!('IntersectionObserver' in global)) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var dur = 1400, start = null;
        function step(ts) {
          if (!start) start = ts;
          var prog = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - prog, 3);
          el.textContent = Math.round(eased * target);
          if (prog < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  };

  /* --------------------------------------------------------
     BOUCLE SCROLL UNIFIÉE (rAF, passive)
     -------------------------------------------------------- */
  var ticking = false, lastScroll = 0;
  var progEl, hdrEl, stopEl;

  function onScroll() {
    if (!ticking) { requestAnimationFrame(loop); ticking = true; }
  }
  function loop() {
    ticking = false;
    var sy = global.scrollY || global.pageYOffset;
    var max = document.body.scrollHeight - global.innerHeight;

    if (progEl) progEl.style.transform = 'scaleX(' + (max > 0 ? sy / max : 0) + ')';

    if (hdrEl) {
      hdrEl.classList.toggle('sc', sy > 40);
      if (sy > 300 && sy > lastScroll) hdrEl.classList.add('hide');
      else hdrEl.classList.remove('hide');
    }
    lastScroll = sy;

    if (stopEl) stopEl.classList.toggle('on', sy > 600);

    updateParallax();
    updateKinetic();

    // callback custom éventuel (page-specific)
    if (typeof A.onScroll === 'function') A.onScroll(sy, max);
  }

  /* --------------------------------------------------------
     INIT GLOBAL
     -------------------------------------------------------- */
  A.init = function () {
    progEl = document.getElementById('prog');
    hdrEl = document.getElementById('hdr');
    stopEl = document.getElementById('stop');

    A.initSplitText();
    A.initReveal();
    A.initParallax();
    A.initTilt();
    A.initCursor();
    A.initMagnetic();
    A.initKinetic();
    A.initCountUp();

    global.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(loop, 120);

    // Smooth scroll pour ancres internes
    var anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = this.getAttribute('href').slice(1);
        if (!id) return;
        var t = document.getElementById(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
      });
    });

    // Scroll-top
    if (stopEl) stopEl.addEventListener('click', function () {
      global.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  global.Anim1866 = A;

  // Auto-init si le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', A.init);
  } else {
    A.init();
  }

})(window);
