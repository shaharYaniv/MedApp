window.MediPal = window.MediPal || {};

MediPal.ColorUtils = (function () {
  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => {
      const clamped = Math.max(0, Math.min(255, Math.round(v)));
      return clamped.toString(16).padStart(2, '0');
    }).join('');
  }

  // Mix color with white by factor (0–1, higher = lighter)
  function tintColor(hex, factor) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(
      r + (255 - r) * factor,
      g + (255 - g) * factor,
      b + (255 - b) * factor
    );
  }

  // Mix color with black by factor (0–1, higher = darker)
  function shadeColor(hex, factor) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
  }

  // Returns rgba string for a hex color with given alpha
  function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Preset palette for pill customizer (12 swatches)
  const PILL_PALETTE = [
    { label: 'White',      hex: '#F5F0EB' },
    { label: 'Cream',      hex: '#E8D5A3' },
    { label: 'Blush',      hex: '#F2BBBB' },
    { label: 'Rose',       hex: '#E07070' },
    { label: 'Burgundy',   hex: '#8C1C2E' },
    { label: 'Sky',        hex: '#A8CEED' },
    { label: 'Blue',       hex: '#3A7EBF' },
    { label: 'Teal',       hex: '#2D9B91' },
    { label: 'Mint',       hex: '#7BC8A4' },
    { label: 'Olive',      hex: '#8B9E3F' },
    { label: 'Amber',      hex: '#D4850A' },
    { label: 'Lavender',   hex: '#9B6DB5' },
  ];

  return { hexToRgb, rgbToHex, tintColor, shadeColor, hexToRgba, PILL_PALETTE };
})();
