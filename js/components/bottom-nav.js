window.MediPal = window.MediPal || {};

MediPal.BottomNav = (function () {
  function updateActive(hash) {
    const base = hash.split('?')[0];
    document.querySelectorAll('.nav-item').forEach(function (item) {
      const view = '#' + item.dataset.view;
      item.classList.toggle('is-active', view === base);
    });
  }

  function init() {
    // Let <a href="#..."> handle navigation natively
    // Just prevent default on FAB to stop scroll jump
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        // Allow normal hash navigation
      });
    });
  }

  return { init, updateActive };
})();
