window.MediPal = window.MediPal || {};

MediPal.Toast = (function () {
  let _container;

  function getContainer() {
    if (!_container) _container = document.getElementById('toast-container');
    return _container;
  }

  function show(message, type, duration) {
    if (!type) type = 'default';
    if (!duration) duration = 3000;
    const container = getContainer();
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('toast--visible');
      });
    });

    setTimeout(function () {
      toast.classList.remove('toast--visible');
      toast.classList.add('toast--leaving');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  function success(msg) { show(msg, 'success'); }
  function error(msg) { show(msg, 'error'); }
  function info(msg) { show(msg, 'info'); }

  return { show, success, error, info };
})();
