/* ============================================================
   1866 — MOTEUR 3D T-SHIRT
   Tissu volumétrique : épaisseur, drapé, plis, gravité.
   Dépend de Three.js (chargé avant ce fichier).

   Usage :
     Tshirt3D.init({
       canvas: document.getElementById('three-canvas'),
       wrap:   document.getElementById('hero-3d-wrap'),
       front:  FRONT_IMG_DATAURL,
       back:   BACK_IMG_DATAURL,
       fallback: document.getElementById('three-fallback')
     });
   ============================================================ */
(function (global) {
  'use strict';

  var Tshirt3D = {};
  var scene, camera, renderer, group, clock;
  var frontMesh, backMesh, edgeMesh, shadowMesh;
  var running = false;
  var opts = null;

  // état interaction
  var targetRotY = -0.4, targetRotX = 0.08;
  var curRotY = -1.1, curRotX = 0.08;
  var isDragging = false, prevX = 0, prevY = 0, velY = 0;
  var autoSpin = true, idleTimer = null;

  var reduceMotion = global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     Géométrie de tissu : un plan très subdivisé auquel on
     applique un galbe (bombé façon buste) + une base pour
     l'ondulation. On duplique pour l'épaisseur.
     -------------------------------------------------------- */
  function makeFabricGeometry(w, h, segX, segY) {
    var geo = new THREE.PlaneGeometry(w, h, segX, segY);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var y = pos.getY(i);
      // Normalisés -1..1
      var nx = x / (w / 2);
      var ny = y / (h / 2);
      // Galbe : bombé au centre (poitrine), rentré en bas (taille)
      var chest = Math.cos(nx * 1.35) * Math.cos(ny * 0.9);
      var z = chest * 0.42;
      // Épaules qui reculent légèrement
      if (ny > 0.55) z -= (ny - 0.55) * 0.7;
      // Ourlet du bas qui s'évase
      if (ny < -0.7) z += Math.abs(ny + 0.7) * 0.35;
      // Bords qui s'enroulent un peu (côtés)
      z -= Math.pow(Math.abs(nx), 3) * 0.5;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    // stocker la base pour l'animation d'ondulation
    geo.userData.base = pos.array.slice();
    return geo;
  }

  function makeTexture(loader, src, renderer) {
    var t = loader.load(src);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }

  Tshirt3D.init = function (options) {
    opts = options;

    if (typeof THREE === 'undefined' || reduceMotion || !opts.canvas) {
      showFallback();
      return false;
    }

    try {
      var W = opts.wrap.clientWidth;
      var H = opts.wrap.clientHeight;

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
      camera.position.set(0, 0, 10);

      renderer = new THREE.WebGLRenderer({
        canvas: opts.canvas, alpha: true, antialias: true
      });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;

      // ---- Lumières : studio doux ----
      scene.add(new THREE.AmbientLight(0xffffff, 0.72));

      var key = new THREE.DirectionalLight(0xfff6ec, 0.85);
      key.position.set(4, 6, 8);
      scene.add(key);

      var fill = new THREE.DirectionalLight(0xffffff, 0.32);
      fill.position.set(-6, 1, 4);
      scene.add(fill);

      // rim rouge sang (signature 1866)
      var rim = new THREE.DirectionalLight(0x9c2020, 0.5);
      rim.position.set(-3, 3, -6);
      scene.add(rim);

      // point light qui donne du relief à la broderie
      var pt = new THREE.PointLight(0xffffff, 0.35, 30);
      pt.position.set(0, 2, 5);
      scene.add(pt);

      group = new THREE.Group();
      scene.add(group);

      var loader = new THREE.TextureLoader();
      var frontTex = makeTexture(loader, opts.front, renderer);
      var backTex = makeTexture(loader, opts.back, renderer);

      var W_ = 4.7, H_ = 5.6, SX = 60, SY = 70;

      // ---- Face avant ----
      var geoF = makeFabricGeometry(W_, H_, SX, SY);
      var matF = new THREE.MeshStandardMaterial({
        map: frontTex, transparent: true, roughness: 0.92, metalness: 0.0,
        side: THREE.FrontSide
      });
      frontMesh = new THREE.Mesh(geoF, matF);
      frontMesh.position.z = 0.13;
      group.add(frontMesh);

      // ---- Face arrière (dos) ----
      var geoB = makeFabricGeometry(W_, H_, SX, SY);
      // inverser en Z pour que le dos bombe dans l'autre sens
      var bp = geoB.attributes.position;
      for (var k = 0; k < bp.count; k++) { bp.setZ(k, -bp.getZ(k)); }
      geoB.computeVertexNormals();
      geoB.userData.base = bp.array.slice();
      var matB = new THREE.MeshStandardMaterial({
        map: backTex, transparent: true, roughness: 0.92, metalness: 0.0,
        side: THREE.FrontSide
      });
      backMesh = new THREE.Mesh(geoB, matB);
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -0.13;
      group.add(backMesh);

      // ---- Tranche / épaisseur (anneau sombre entre les 2 faces) ----
      var edgeShape = new THREE.Shape();
      var ew = W_ / 2, eh = H_ / 2;
      edgeShape.moveTo(-ew, -eh);
      edgeShape.lineTo(ew, -eh);
      edgeShape.lineTo(ew, eh);
      edgeShape.lineTo(-ew, eh);
      edgeShape.lineTo(-ew, -eh);
      var edgeGeo = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(W_, H_, 0.26)
      );
      var edgeMat = new THREE.LineBasicMaterial({
        color: 0x0a0908, transparent: true, opacity: 0.28
      });
      edgeMesh = new THREE.LineSegments(edgeGeo, edgeMat);
      group.add(edgeMesh);

      // ---- Ombre portée au sol ----
      var shadowGeo = new THREE.CircleGeometry(2.9, 40);
      var shadowMat = new THREE.MeshBasicMaterial({
        color: 0x141210, transparent: true, opacity: 0.07
      });
      shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -3.3;
      shadowMesh.scale.set(1, 0.34, 1);
      scene.add(shadowMesh);

      clock = new THREE.Clock();
      bindEvents();
      running = true;
      animate();
      hideFallback();

      global.addEventListener('resize', onResize);
      return true;

    } catch (err) {
      showFallback();
      return false;
    }
  };

  function bindEvents() {
    var c = opts.canvas;

    function down(x, y) {
      isDragging = true; prevX = x; prevY = y; autoSpin = false;
      clearTimeout(idleTimer);
    }
    function move(x, y) {
      if (!isDragging) return;
      var dx = x - prevX, dy = y - prevY;
      targetRotY += dx * 0.011;
      targetRotX += dy * 0.007;
      targetRotX = Math.max(-0.65, Math.min(0.65, targetRotX));
      velY = dx * 0.011;
      prevX = x; prevY = y;
    }
    function up() {
      isDragging = false;
      // relancer l'auto-spin après inactivité
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { autoSpin = true; }, 2600);
    }

    c.addEventListener('mousedown', function (e) { down(e.clientX, e.clientY); });
    global.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    global.addEventListener('mouseup', up);

    c.addEventListener('touchstart', function (e) {
      down(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    c.addEventListener('touchmove', function (e) {
      if (isDragging) move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    c.addEventListener('touchend', up);
  }

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    if (autoSpin && !isDragging) targetRotY += 0.0035;
    if (!isDragging && Math.abs(velY) > 0.0001) {
      targetRotY += velY; velY *= 0.95;
    }

    curRotY += (targetRotY - curRotY) * 0.075;
    curRotX += (targetRotX - curRotX) * 0.075;
    group.rotation.y = curRotY;
    group.rotation.x = curRotX;
    group.position.y = Math.sin(t * 0.7) * 0.09;

    // Ondulation du tissu (plis qui bougent)
    waveFabric(frontMesh.geometry, t, 1);
    waveFabric(backMesh.geometry, t, -1);

    if (shadowMesh) {
      shadowMesh.material.opacity = 0.07 + Math.abs(Math.sin(curRotY)) * 0.025;
      shadowMesh.scale.x = 1 + Math.abs(Math.sin(curRotY)) * 0.15;
    }

    renderer.render(scene, camera);
  }

  function waveFabric(geo, t, dir) {
    var pos = geo.attributes.position;
    var base = geo.userData.base;
    for (var i = 0; i < pos.count; i++) {
      var ix = i * 3;
      var ox = base[ix], oy = base[ix + 1], oz = base[ix + 2];
      // plusieurs ondes superposées = drapé vivant
      var w1 = Math.sin(ox * 1.1 + t * 1.2) * 0.055;
      var w2 = Math.cos(oy * 1.4 + t * 0.9) * 0.04;
      var w3 = Math.sin((ox + oy) * 0.8 + t * 1.6) * 0.025;
      pos.array[ix + 2] = oz + (w1 + w2 + w3) * dir;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  function onResize() {
    if (!running || !opts.wrap) return;
    var w = opts.wrap.clientWidth, h = opts.wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function showFallback() {
    if (opts && opts.canvas) opts.canvas.style.display = 'none';
    if (opts && opts.fallback) opts.fallback.style.display = 'grid';
  }
  function hideFallback() {
    if (opts && opts.fallback) opts.fallback.style.display = 'none';
  }

  // Pause quand l'onglet est caché (perf batterie iPhone)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; }
    else if (renderer && !running) { running = true; animate(); }
  });

  global.Tshirt3D = Tshirt3D;

})(window);
