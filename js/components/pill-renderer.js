window.MediPal = window.MediPal || {};

MediPal.PillRenderer = (function () {
  var CU = null;

  function getColorUtils() {
    if (!CU) CU = MediPal.ColorUtils;
    return CU;
  }

  /**
   * Creates a pill DOM element from a medication object.
   * If med.imageUrl is set, renders a real photo; otherwise renders the 3D CSS pill.
   * @param {Object} med - { color, shape, imageUrl? }
   * @param {string} [sizeClass] - 'sm' | 'lg' | 'cabinet' | undefined
   * @returns {HTMLElement}
   */
  function create(med, sizeClass) {
    // Real pill photo
    if (med.imageUrl) {
      return createPhoto(med, sizeClass);
    }
    return createCSS(med, sizeClass);
  }

  function createPhoto(med, sizeClass) {
    var wrapper = document.createElement('div');
    wrapper.className = 'pill-photo' + (sizeClass ? ' pill-photo--' + sizeClass : '');
    wrapper.setAttribute('aria-hidden', 'true');

    var img = document.createElement('img');
    img.src = med.imageUrl;
    img.alt = med.name || 'Pill';
    img.className = 'pill-photo__img';
    img.setAttribute('crossorigin', 'anonymous');

    // On error fall back to CSS pill
    img.onerror = function () {
      var css = createCSS(med, sizeClass);
      if (wrapper.parentNode) {
        wrapper.parentNode.replaceChild(css, wrapper);
      }
    };

    wrapper.appendChild(img);
    return wrapper;
  }

  function createCSS(med, sizeClass) {
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
