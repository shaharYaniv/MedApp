window.MediPal = window.MediPal || {};

MediPal.Router = (function () {
  const routes = {
    '#dashboard': function () { MediPal.Views.Dashboard.render(); },
    '#cabinet':   function () { MediPal.Views.Cabinet.render(); },
    '#add-med':   function () { MediPal.Views.AddMed.render(null); },
    '#inventory': function () { MediPal.Views.Inventory.render(); },
    '#buddy':     function () { MediPal.Views.Buddy.render(); },
    '#booking':   function () { MediPal.Views.Booking.render(); },
  };

  function getHash() {
    const hash = window.location.hash;
    // Strip query params for route matching: "#add-med?edit=xxx" → "#add-med"
    return hash.split('?')[0] || '#dashboard';
  }

  function getParam(key) {
    const hash = window.location.hash;
    const query = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(query);
    return params.get(key);
  }

  function navigate(hash, params) {
    let target = hash;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      target = hash + '?' + qs;
    }
    window.location.hash = target;
  }

  function handleRoute() {
    const hash = getHash();
    const renderFn = routes[hash];
    const content = document.getElementById('app-content');

    // Scroll to top on view change
    content.scrollTop = 0;
    window.scrollTo(0, 0);

    if (renderFn) {
      content.innerHTML = '';
      renderFn();
    } else {
      // Default to dashboard
      window.location.hash = '#dashboard';
    }

    MediPal.BottomNav.updateActive(hash);
    MediPal.Store.saveState({ activeView: hash.replace('#', '') });
  }

  function registerRoute(hash, fn) {
    routes[hash] = fn;
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  return { init, navigate, getParam, registerRoute, getHash };
})();
