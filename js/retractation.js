/* ============================================================
   MAISON 1866 — FONCTION DE RÉTRACTATION EN LIGNE
   Étape 1 : « Renoncer au contrat ici » ouvre le formulaire.
   Étape 2 : « Confirmer la rétractation » envoie la déclaration
   à /api/message, qui expédie l'accusé de réception (e-mail,
   avec date et heure) au client et une copie à la boutique.
   Si l'envoi échoue, on le dit clairement et on propose l'e-mail.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var openBtn = $('r-open'), form = $('r-form'), msg = $('r-msg'), submit = $('r-submit');
  if (!openBtn || !form) return;

  openBtn.addEventListener('click', function () {
    form.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    openBtn.hidden = true;
    var first = $('r-nom'); if (first) first.focus();
  });

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function shopEmail() {
    var c = window.M1866 && window.M1866.exploitant;
    return (c && c.email) || '';
  }
  function setMsg(text, kind) {
    msg.textContent = text;
    msg.className = 'msg' + (kind ? ' ' + kind : '');
  }
  function fallback(d, reason) {
    msg.textContent = '';
    msg.className = 'msg err';
    msg.appendChild(document.createTextNode(reason + ' Votre déclaration n\'a pas été transmise. '));
    var mail = shopEmail();
    if (mail) {
      var body = 'Je notifie par la présente ma rétractation du contrat portant sur la vente des biens ci-dessous.\n\n' +
        'Nom : ' + d.nom + '\nCommande : ' + d.commande + '\nArticles : ' + (d.articles || 'toute la commande') +
        '\nE-mail : ' + d.email + '\nDate : ' + new Date().toLocaleString('fr-FR');
      var a = document.createElement('a');
      a.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('Rétractation — ' + d.commande) + '&body=' + encodeURIComponent(body);
      a.textContent = 'Envoyez-la par e-mail en un clic';
      msg.appendChild(a);
      msg.appendChild(document.createTextNode(' : le délai est respecté dès l\'envoi.'));
    } else {
      msg.appendChild(document.createTextNode('Écrivez-nous par e-mail ou par courrier (coordonnées dans les mentions légales).'));
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {
      type: 'retractation',
      nom: $('r-nom').value.trim(),
      email: $('r-email').value.trim(),
      commande: $('r-commande').value.trim(),
      articles: $('r-articles').value.trim(),
      site: $('r-site').value
    };
    if (!d.nom || !validEmail(d.email) || !d.commande) {
      setMsg('Merci d\'indiquer votre nom, un e-mail valide et la commande concernée.', 'err');
      return;
    }
    submit.disabled = true;
    setMsg('Envoi en cours…');

    fetch('api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      submit.disabled = false;
      if (!res.ok || !res.j.ok) {
        fallback(d, (res.j && res.j.erreur) || 'L\'envoi automatique est indisponible pour le moment.');
        return;
      }
      form.hidden = true;
      $('r-done-txt').textContent = 'Votre déclaration a été reçue le ' + res.j.horodatage +
        '. Un accusé de réception reprenant son contenu vient d\'être envoyé à ' + d.email +
        ' (pensez à vérifier les courriers indésirables).';
      $('r-done').hidden = false;
      $('r-done').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () {
      submit.disabled = false;
      fallback(d, 'Connexion impossible.');
    });
  });
})();
