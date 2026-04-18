window.MediPal = window.MediPal || {};

MediPal.CheckAnimation = (function () {
  var PARTICLE_COLORS = ['#2D6A4F', '#52B788', '#74C69D', '#B7E4C7', '#8C1C2E', '#E07070'];

  function spawnParticles(cardEl) {
    var rect = cardEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      var dist = 28 + Math.random() * 16;
      var dx = Math.round(Math.cos(angle) * dist);
      var dy = Math.round(Math.sin(angle) * dist);
      var color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

      var p = document.createElement('span');
      p.className = 'check-particle';
      p.style.cssText =
        'left:' + (cx - rect.left - 4) + 'px;' +
        'top:' + (cy - rect.top - 4) + 'px;' +
        'background:' + color + ';' +
        '--dx:' + dx + 'px;' +
        '--dy:' + dy + 'px;';

      cardEl.appendChild(p);

      p.addEventListener('animationend', function () {
        if (p.parentNode) p.parentNode.removeChild(p);
      });
    }
  }

  /**
   * Play the 3-phase check-off animation on a dose card.
   * @param {HTMLElement} cardEl - The .dose-card element
   * @param {HTMLElement} btnEl  - The .check-btn element
   * @param {Function} onComplete - Called after animation finishes
   */
  function play(cardEl, btnEl, onComplete) {
    // Phase 1: Press bounce
    cardEl.style.transform = 'scale(0.97)';
    cardEl.style.transition = 'transform 80ms ease-out';

    setTimeout(function () {
      cardEl.style.transform = 'scale(1)';
      cardEl.style.transition = 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)';

      // Phase 2: Check mark + card color
      setTimeout(function () {
        btnEl.classList.add('is-checked', 'is-checking');
        cardEl.classList.add('is-completing');

        // Phase 3: Particles
        setTimeout(function () {
          spawnParticles(cardEl);

          setTimeout(function () {
            cardEl.style.transform = '';
            cardEl.style.transition = '';
            if (typeof onComplete === 'function') onComplete();
          }, 500);
        }, 150);
      }, 120);
    }, 80);
  }

  return { play };
})();
