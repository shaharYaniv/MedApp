window.MediPal = window.MediPal || {};

MediPal.DrugAPI = (function () {
  var NLM_SEARCH   = 'https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search';
  var RXNAV_BASE   = 'https://rxnav.nlm.nih.gov/REST';
  var ALLORIGINS   = 'https://api.allorigins.win/raw?url=';
  var DAILYMED_IMG = 'https://dailymed.nlm.nih.gov/dailymed/image.cfm';
  var DAILYMED_API = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';

  // ── Helpers ──────────────────────────────────────────────────────

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function fetchProxied(url) {
    return fetchJSON(ALLORIGINS + encodeURIComponent(url));
  }

  // ── Step 1: Drug name autocomplete (NLM Clinical Tables) ─────────
  /**
   * Search for drug names matching a query.
   * Returns array of { name, strengths[] }
   */
  function searchDrugNames(query) {
    if (!query || query.trim().length < 2) return Promise.resolve([]);
    var url = NLM_SEARCH + '?terms=' + encodeURIComponent(query.trim()) +
              '&ef=STRENGTHS_AND_FORMS&maxList=8';
    return fetchJSON(url).then(function (data) {
      // data format: [total, names[], {STRENGTHS_AND_FORMS: strengths[]}, display[]]
      var names      = data[1] || [];
      var extraFields = data[2] || {};
      var strengths  = (extraFields.STRENGTHS_AND_FORMS) || [];
      return names.map(function (name, i) {
        return {
          name: cleanDrugName(name),
          rawName: name,
          strengths: strengths[i] || []
        };
      });
    }).catch(function () { return []; });
  }

  // Remove "(Oral Pill)", "(Oral Tablet)" suffixes for cleaner display
  function cleanDrugName(name) {
    return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  }

  // ── Step 2: Lookup drug info + image via RxNav + DailyMed ────────
  /**
   * Given a drug name, fetch:
   *   - RXCUI (RxNorm concept ID)
   *   - SPL set IDs (DailyMed document IDs)
   *   - First available pill image URL from DailyMed
   *
   * Returns: { rxcui, imageUrl } — either field may be null on failure
   */
  function lookupDrugImage(drugName) {
    var clean = cleanDrugName(drugName);
    var rxcui = null;

    // Step A: get RXCUI
    return fetchJSON(RXNAV_BASE + '/rxcui.json?name=' + encodeURIComponent(clean))
      .then(function (data) {
        var ids = (data.idGroup && data.idGroup.rxnormId) || [];
        if (!ids.length) throw new Error('no rxcui');
        rxcui = ids[0];

        // Step B: get SPL_SET_IDs from RxNorm
        return fetchJSON(RXNAV_BASE + '/rxcui/' + rxcui + '/property.json?propName=SPL_SET_ID');
      })
      .then(function (data) {
        var props = (data.propConceptGroup && data.propConceptGroup.propConcept) || [];
        var setIds = props
          .filter(function (p) { return p.propName === 'SPL_SET_ID'; })
          .map(function (p) { return p.propValue; });

        if (!setIds.length) throw new Error('no set ids');

        // Step C: try each setId until we find one with a media image
        return trySetIdsForImage(setIds, 0);
      })
      .then(function (imageUrl) {
        return { rxcui: rxcui, imageUrl: imageUrl };
      })
      .catch(function () {
        return { rxcui: rxcui, imageUrl: null };
      });
  }

  function trySetIdsForImage(setIds, idx) {
    if (idx >= setIds.length || idx >= 5) return Promise.resolve(null); // try max 5
    var setId = setIds[idx];
    var mediaUrl = DAILYMED_API + '/spls/' + setId + '/media.json';

    return fetchProxied(mediaUrl)
      .then(function (data) {
        var media = (data.data && data.data.media) || [];
        var img = media.find(function (m) {
          return m.mime_type && m.mime_type.startsWith('image/');
        });
        if (img && img.url) return img.url;
        throw new Error('no image in this setId');
      })
      .catch(function () {
        return trySetIdsForImage(setIds, idx + 1);
      });
  }

  // ── Convenience: full lookup pipeline ───────────────────────────
  /**
   * Full pipeline: name → image URL (or null)
   * Also returns dosage form for auto-shape detection
   */
  function lookupDrug(drugName) {
    var imagePromise = lookupDrugImage(drugName);
    var fdaPromise   = fetchFDADosageForm(drugName);

    return Promise.all([imagePromise, fdaPromise])
      .then(function (results) {
        return Object.assign({}, results[0], { dosageForm: results[1] });
      });
  }

  function fetchFDADosageForm(drugName) {
    var url = 'https://api.fda.gov/drug/ndc.json?search=generic_name:' +
              encodeURIComponent('"' + cleanDrugName(drugName) + '"') + '&limit=3';
    return fetchJSON(url)
      .then(function (data) {
        var results = data.results || [];
        // Prefer a finished product
        var finished = results.find(function (r) { return r.finished; }) || results[0];
        return finished ? finished.dosage_form : null;
      })
      .catch(function () { return null; });
  }

  /**
   * Map FDA dosage_form string to our pill shape
   */
  function dosageFormToShape(dosageForm) {
    if (!dosageForm) return null;
    var f = dosageForm.toUpperCase();
    if (f.indexOf('CAPSULE') !== -1) return 'capsule';
    if (f.indexOf('TABLET') !== -1 || f.indexOf('PILL') !== -1) {
      // Oval/oblong tablets are common — we'll use 'oval' for film-coated, 'round' otherwise
      if (f.indexOf('FILM') !== -1 || f.indexOf('COATED') !== -1 || f.indexOf('OBLONG') !== -1) return 'oval';
      return 'round';
    }
    return null;
  }

  return { searchDrugNames, lookupDrug, dosageFormToShape, cleanDrugName };
})();
