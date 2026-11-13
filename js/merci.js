/* Vide le panier uniquement au retour d'un paiement Stripe réussi
   (présence d'un identifiant de session cs_…), puis nettoie l'URL. */
(function () {
  'use strict';
  try {
    var id = new URLSearchParams(location.search).get('session_id') || '';
    if (/^cs_[A-Za-z0-9_]+$/.test(id)) {
      localStorage.removeItem('m1866.cart.v1');
      history.replaceState(null, '', location.pathname);
    }
  } catch (e) {}
})();
