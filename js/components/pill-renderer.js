window.MediPal = window.MediPal || {};

MediPal.PillRenderer = (function () {
  var CU = null;

  function getColorUtils() {
    if (!CU) CU = MediPal.ColorUtils;
    return CU;
  }

  /**
   * Creates a pill DOM element from a medication object.
   * @param {Object} med - { color, shape }
   * @param {string} [sizeClass] - 'sm' | 'lg' | 'cabinet' | undefined (default)
   * @returns {HTMLElement}
   */
  function create(med, sizeClass) {
    var cu = getColorUtils();
    var color = med.color || '#8C1C2E';
    var shape = med.shape || 'round';

    var light = cu.tintColor(color, 0.40);
    var dark  = cu.shadeColor(color, 0.30);

    var el = document.createElement('div');
    el.className = 'pill pill--' + shape + (sizeClass ? ' pill--' + sizeClass : '');
    el.style.setProperty('--pill-hue',   color);
    el.style.setProperty('--pill-light', light);
    el.style.setProperty('--pill-dark',  dark);
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  /**
   * Renders a pill into a container element, replacing its contents.
   */
  function render(container, med, sizeClass) {
    container.innerHTML = '';
    container.appendChild(create(med, sizeClass));
  }

  return { create, render };
})();
