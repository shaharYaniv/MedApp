window.MediPal = window.MediPal || {};
window.MediPal.Views = window.MediPal.Views || {};

MediPal.Views.AddMed = (function () {
  var _state = {};
  var _editId = null;
  var _searchTimer = null;

  var STEPS = ['Details', 'Schedule', 'Look', 'Supply'];
  var DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function render(editId) {
    _editId = editId || MediPal.Router.getParam('edit') || null;

    if (_editId) {
      var existing = MediPal.Store.getMedication(_editId);
      if (existing) {
        var sched = MediPal.Store.getSchedules(_editId)[0] || {};
        var inv = MediPal.Store.getInventory(_editId);
        _state = {
          step: 0,
          name: existing.name || '',
          dosage: existing.dosage || '',
          notes: existing.notes || '',
          isCritical: !!existing.isCritical,
          times: sched.times ? sched.times.slice() : ['08:00'],
          daysOfWeek: sched.daysOfWeek ? sched.daysOfWeek.slice() : [0,1,2,3,4,5,6],
          color: existing.color || '#8C1C2E',
          shape: existing.shape || 'round',
          imageUrl: existing.imageUrl || null,
          currentCount: (inv && inv.currentCount) || 30,
          pillsPerDose: (inv && inv.pillsPerDose) || 1,
          // image lookup state
          imageLookupDone: !!existing.imageUrl,
          imageLookupLoading: false
        };
      } else {
        resetState();
      }
    } else {
      resetState();
    }

    renderStep();
  }

  function resetState() {
    _state = {
      step: 0,
      name: '', dosage: '', notes: '',
      isCritical: false,
      times: ['08:00'],
      daysOfWeek: [0,1,2,3,4,5,6],
      color: '#3A7EBF',
      shape: 'round',
      imageUrl: null,
      currentCount: 30,
      pillsPerDose: 1,
      imageLookupDone: false,
      imageLookupLoading: false
    };
  }

  function renderStep() {
    var content = document.getElementById('app-content');
    content.innerHTML = '';
    content.className = 'view-enter';

    var topBar = document.createElement('div');
    topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:var(--space-10) var(--space-6) 0';
    topBar.innerHTML =
      '<button class="back-btn" id="addmed-back">' +
        '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>' +
        (_state.step > 0 ? 'Back' : 'Cancel') +
      '</button>' +
      '<div style="font-size:var(--font-size-sm);color:var(--color-muted);font-weight:var(--font-weight-medium)">' +
        'Step ' + (_state.step + 1) + ' of ' + STEPS.length +
      '</div>';
    content.appendChild(topBar);

    var dots = document.createElement('div');
    dots.className = 'step-indicator';
    STEPS.forEach(function (_, i) {
      var dot = document.createElement('div');
      dot.className = 'step-dot' +
        (i === _state.step ? ' is-active' : '') +
        (i < _state.step ? ' is-done' : '');
      dots.appendChild(dot);
    });
    content.appendChild(dots);

    var stepContent = document.createElement('div');
    stepContent.className = 'view-content';
    stepContent.style.paddingTop = 'var(--space-6)';
    content.appendChild(stepContent);

    var stepTitle = document.createElement('h2');
    stepTitle.style.cssText = 'font-size:var(--font-size-xl);font-weight:var(--font-weight-bold);margin-bottom:var(--space-6)';
    stepTitle.textContent = STEPS[_state.step];
    stepContent.appendChild(stepTitle);

    switch (_state.step) {
      case 0: renderDetailsStep(stepContent); break;
      case 1: renderScheduleStep(stepContent); break;
      case 2: renderLookStep(stepContent); break;
      case 3: renderSupplyStep(stepContent); break;
    }

    document.getElementById('addmed-back').addEventListener('click', function () {
      if (_state.step > 0) { _state.step--; renderStep(); }
      else { MediPal.Router.navigate(_editId ? '#cabinet' : '#dashboard'); }
    });
  }

  /* ── Step 0: Details + Drug Search ── */
  function renderDetailsStep(container) {
    // Drug search group
    var searchGroup = document.createElement('div');
    searchGroup.className = 'form-group';
    searchGroup.innerHTML =
      '<label class="form-label" for="med-name">Medication Name</label>' +
      '<div class="autocomplete-wrap" id="autocomplete-wrap">' +
        '<input class="form-input" type="text" id="med-name" placeholder="Type to search…" value="' + escAttr(_state.name) + '" autocomplete="off" />' +
        '<div class="autocomplete-dropdown" id="autocomplete-dropdown" style="display:none"></div>' +
      '</div>' +
      '<div class="form-hint" id="search-status"></div>';
    container.appendChild(searchGroup);

    container.innerHTML +=
      '<div class="form-group">' +
        '<label class="form-label" for="med-dosage">Dosage</label>' +
        '<input class="form-input" type="text" id="med-dosage" placeholder="e.g. 10mg" value="' + escAttr(_state.dosage) + '" autocomplete="off" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="med-notes">Notes <span style="color:var(--color-muted);font-weight:400">(optional)</span></label>' +
        '<input class="form-input" type="text" id="med-notes" placeholder="e.g. Take with food" value="' + escAttr(_state.notes) + '" />' +
      '</div>' +
      '<label class="toggle" style="margin-bottom:var(--space-6);background:var(--color-white);padding:var(--space-4);border-radius:var(--radius-lg);box-shadow:var(--shadow-card)">' +
        '<input type="checkbox" class="toggle__input" id="med-critical" ' + (_state.isCritical ? 'checked' : '') + ' />' +
        '<span class="toggle__track"><span class="toggle__thumb"></span></span>' +
        '<div class="toggle__label">' +
          '<div>Mark as Critical</div>' +
          '<div class="toggle__sublabel">Buddy gets notified if missed 2+ hours</div>' +
        '</div>' +
      '</label>' +
      '<button class="btn btn--primary btn--full btn--lg" id="step-next">Continue</button>';

    // Wire up autocomplete
    var nameInput = document.getElementById('med-name');
    var dropdown  = document.getElementById('autocomplete-dropdown');
    var status    = document.getElementById('search-status');

    nameInput.addEventListener('input', function () {
      var query = nameInput.value.trim();
      clearTimeout(_searchTimer);
      if (query.length < 2) { dropdown.style.display = 'none'; return; }

      status.textContent = 'Searching…';
      _searchTimer = setTimeout(function () {
        MediPal.DrugAPI.searchDrugNames(query).then(function (results) {
          status.textContent = '';
          if (!results.length) { dropdown.style.display = 'none'; return; }
          renderDropdown(dropdown, results, nameInput);
        });
      }, 320);
    });

    // Close dropdown on outside click
    document.addEventListener('click', function onOutside(e) {
      if (!e.target.closest('#autocomplete-wrap')) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', onOutside);
      }
    });

    document.getElementById('step-next').addEventListener('click', function () {
      _state.name = document.getElementById('med-name').value.trim();
      _state.dosage = document.getElementById('med-dosage').value.trim();
      _state.notes  = document.getElementById('med-notes').value.trim();
      _state.isCritical = document.getElementById('med-critical').checked;
      if (!_state.name) { MediPal.Toast.error('Please enter a medication name'); return; }
      if (!_state.dosage) { MediPal.Toast.error('Please enter the dosage'); return; }
      _state.step = 1; renderStep();
    });
  }

  function renderDropdown(dropdown, results, nameInput) {
    dropdown.innerHTML = '';
    results.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'autocomplete-item';
      row.innerHTML =
        '<div class="autocomplete-item__name">' + escHtml(item.name) + '</div>' +
        (item.strengths.length
          ? '<div class="autocomplete-item__strengths">' +
              item.strengths.slice(0, 4).map(function (s) {
                return '<span class="autocomplete-strength" data-strength="' + escAttr(s) + '">' + escHtml(s) + '</span>';
              }).join('') +
            '</div>'
          : '');

      // Click on drug name — fill name, leave dosage for user to pick
      row.querySelector('.autocomplete-item__name').addEventListener('click', function () {
        nameInput.value = item.name;
        _state.name = item.name;
        _state.imageLookupDone = false;
        _state.imageUrl = null;
        dropdown.style.display = 'none';
        // Start image lookup in background
        startImageLookup(item.name);
      });

      // Click on a strength badge — fill both name and dosage
      row.querySelectorAll('.autocomplete-strength').forEach(function (badge) {
        badge.addEventListener('click', function (e) {
          e.stopPropagation();
          nameInput.value = item.name;
          _state.name = item.name;
          _state.imageLookupDone = false;
          _state.imageUrl = null;
          var dosageEl = document.getElementById('med-dosage');
          if (dosageEl) {
            // Extract just the dose number+unit from e.g. "10 mg Tab"
            var strength = badge.dataset.strength;
            var doseMatch = strength.match(/[\d.]+\s*(?:mg|mcg|g|ml|iu|%)/i);
            dosageEl.value = doseMatch ? doseMatch[0].trim() : strength;
            _state.dosage = dosageEl.value;
          }
          dropdown.style.display = 'none';
          startImageLookup(item.name);
        });
      });

      dropdown.appendChild(row);
    });
    dropdown.style.display = 'block';
  }

  function startImageLookup(drugName) {
    _state.imageLookupLoading = true;
    _state.imageLookupDone = false;
    _state.imageUrl = null;

    var statusEl = document.getElementById('search-status');
    if (statusEl) statusEl.textContent = '🔍 Looking up pill appearance…';

    MediPal.DrugAPI.lookupDrug(drugName).then(function (result) {
      _state.imageLookupLoading = false;
      _state.imageLookupDone = true;
      _state.imageUrl = result.imageUrl || null;

      // Auto-set shape from dosage form if no override yet
      if (result.dosageForm) {
        var autoShape = MediPal.DrugAPI.dosageFormToShape(result.dosageForm);
        if (autoShape) _state.shape = autoShape;
      }

      var statusEl2 = document.getElementById('search-status');
      if (statusEl2) {
        statusEl2.textContent = _state.imageUrl
          ? '✓ Pill photo found — will show on next step'
          : '✓ Drug found — shape auto-configured';
      }
    }).catch(function () {
      _state.imageLookupLoading = false;
      _state.imageLookupDone = true;
      var statusEl3 = document.getElementById('search-status');
      if (statusEl3) statusEl3.textContent = '';
    });
  }

  /* ── Step 1: Schedule ── */
  function renderScheduleStep(container) {
    var timesHtml = _state.times.map(function (t) {
      return '<span class="time-pill">' + MediPal.DateUtils.formatTimeStr(t) +
        '<button class="time-pill__remove" data-time="' + t + '" aria-label="Remove ' + t + '">×</button></span>';
    }).join('');

    container.innerHTML +=
      '<div class="form-group">' +
        '<div class="form-label">Dose Times</div>' +
        '<div class="time-pills" id="time-pills-container">' + timesHtml + '</div>' +
        '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-3);align-items:center">' +
          '<input class="form-input" type="time" id="new-time-input" style="flex:1" />' +
          '<button class="btn btn--secondary btn--sm" id="add-time-btn">+ Add</button>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<div class="form-label">Days of Week</div>' +
        '<div class="dow-selector" id="dow-selector">' +
          DOW_LABELS.map(function (label, idx) {
            return '<button class="dow-btn ' + (_state.daysOfWeek.indexOf(idx) !== -1 ? 'is-selected' : '') + '" data-dow="' + idx + '">' + label + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<button class="btn btn--primary btn--full btn--lg" id="step-next" style="margin-top:var(--space-4)">Continue</button>';

    document.getElementById('time-pills-container').addEventListener('click', function (e) {
      var btn = e.target.closest('.time-pill__remove');
      if (!btn) return;
      _state.times = _state.times.filter(function (x) { return x !== btn.dataset.time; });
      btn.parentElement.remove();
    });

    document.getElementById('add-time-btn').addEventListener('click', function () {
      var val = document.getElementById('new-time-input').value;
      if (!val) return;
      if (_state.times.indexOf(val) === -1) { _state.times.push(val); _state.times.sort(); }
      var c2 = document.getElementById('time-pills-container');
      var span = document.createElement('span');
      span.className = 'time-pill';
      span.innerHTML = MediPal.DateUtils.formatTimeStr(val) +
        '<button class="time-pill__remove" data-time="' + val + '">×</button>';
      c2.appendChild(span);
      document.getElementById('new-time-input').value = '';
    });

    document.getElementById('dow-selector').addEventListener('click', function (e) {
      var btn = e.target.closest('.dow-btn');
      if (!btn) return;
      var idx = parseInt(btn.dataset.dow, 10);
      var pos = _state.daysOfWeek.indexOf(idx);
      if (pos === -1) { _state.daysOfWeek.push(idx); btn.classList.add('is-selected'); }
      else {
        if (_state.daysOfWeek.length === 1) return;
        _state.daysOfWeek.splice(pos, 1); btn.classList.remove('is-selected');
      }
    });

    document.getElementById('step-next').addEventListener('click', function () {
      if (_state.times.length === 0) { MediPal.Toast.error('Add at least one dose time'); return; }
      _state.step = 2; renderStep();
    });
  }

  /* ── Step 2: Look — photo or customizer ── */
  function renderLookStep(container) {
    // Show loading spinner if image lookup still in progress
    if (_state.imageLookupLoading) {
      container.innerHTML +=
        '<div style="text-align:center;padding:var(--space-12) 0">' +
          '<div class="pill-lookup-spinner"></div>' +
          '<div style="margin-top:var(--space-4);color:var(--color-muted);font-size:var(--font-size-sm)">Finding pill photo…</div>' +
        '</div>' +
        '<button class="btn btn--ghost btn--full" id="step-skip-lookup" style="margin-top:var(--space-4)">Skip — design manually</button>';

      var checkInterval = setInterval(function () {
        if (!_state.imageLookupLoading) {
          clearInterval(checkInterval);
          renderStep();
        }
      }, 400);

      document.getElementById('step-skip-lookup').addEventListener('click', function () {
        clearInterval(checkInterval);
        _state.imageLookupLoading = false;
        _state.imageLookupDone = true;
        _state.imageUrl = null;
        renderStep();
      });
      return;
    }

    // If we found a real pill image
    if (_state.imageUrl) {
      renderPhotoMode(container);
    } else {
      renderDesignerMode(container);
    }
  }

  function renderPhotoMode(container) {
    container.innerHTML +=
      '<div style="text-align:center;margin-bottom:var(--space-6)">' +
        '<div class="pill-photo-found">' +
          '<img src="' + escAttr(_state.imageUrl) + '" alt="' + escAttr(_state.name) + '" class="pill-photo-large" onerror="this.closest(\'.pill-photo-found\').style.display=\'none\';document.getElementById(\'no-photo-fallback\').style.display=\'block\'" />' +
        '</div>' +
        '<div id="no-photo-fallback" style="display:none">' +
          buildDesignerHTML() +
        '</div>' +
        '<div style="font-size:var(--font-size-xs);color:var(--color-muted);margin-top:var(--space-2)">Photo from US National Library of Medicine</div>' +
      '</div>' +
      '<button class="btn btn--secondary btn--full" id="use-photo-btn" style="margin-bottom:var(--space-3)">✓ Use this photo</button>' +
      '<button class="btn btn--ghost btn--full" id="design-instead-btn">Design manually instead</button>';

    document.getElementById('use-photo-btn').addEventListener('click', function () {
      _state.step = 3; renderStep();
    });

    document.getElementById('design-instead-btn').addEventListener('click', function () {
      _state.imageUrl = null;
      renderStep();
    });
  }

  function renderDesignerMode(container) {
    var palette = MediPal.ColorUtils.PILL_PALETTE;

    container.innerHTML +=
      buildDesignerHTML() +
      '<button class="btn btn--primary btn--full btn--lg" id="step-next" style="margin-top:var(--space-4)">Continue</button>';

    // Render shape previews + main preview
    ['round','oval','capsule'].forEach(function (s) {
      var wrap = document.getElementById('shape-preview-' + s);
      if (wrap) MediPal.PillRenderer.render(wrap, { color: _state.color, shape: s }, 'sm');
    });
    updatePreview();

    // Shape selection
    document.getElementById('shape-selector').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-shape]');
      if (!btn) return;
      _state.shape = btn.dataset.shape;
      document.querySelectorAll('#shape-selector [data-shape]').forEach(function (b) {
        b.className = 'btn ' + (b.dataset.shape === _state.shape ? 'btn--primary' : 'btn--secondary');
        b.style.cssText = 'flex-direction:column;gap:var(--space-2);padding:var(--space-4) var(--space-2)';
      });
      updatePreview();
    });

    // Color selection
    document.getElementById('color-swatches').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-color]');
      if (!btn) return;
      _state.color = btn.dataset.color;
      updateSwatchRings(); updateShapePreviews(); updatePreview();
    });

    document.getElementById('custom-color').addEventListener('input', function (e) {
      _state.color = e.target.value;
      updateSwatchRings(); updateShapePreviews(); updatePreview();
    });

    document.getElementById('step-next').addEventListener('click', function () {
      _state.step = 3; renderStep();
    });
  }

  function buildDesignerHTML() {
    var palette = MediPal.ColorUtils.PILL_PALETTE;
    return '<div style="display:flex;justify-content:center;margin-bottom:var(--space-8)">' +
        '<div id="look-preview" style="display:flex;flex-direction:column;align-items:center;gap:var(--space-3)">' +
          '<div id="preview-pill-wrap"></div>' +
          '<div style="font-size:var(--font-size-sm);color:var(--color-muted)">Preview</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<div class="form-label">Shape</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)" id="shape-selector">' +
          ['round','oval','capsule'].map(function (s) {
            return '<button class="btn ' + (s === _state.shape ? 'btn--primary' : 'btn--secondary') + '" data-shape="' + s + '" style="flex-direction:column;gap:var(--space-2);padding:var(--space-4) var(--space-2)">' +
              '<div id="shape-preview-' + s + '"></div>' +
              '<span style="font-size:var(--font-size-sm);text-transform:capitalize">' + s + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<div class="form-label">Color</div>' +
        '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-2)" id="color-swatches">' +
          palette.map(function (p) {
            return '<button class="color-swatch" data-color="' + p.hex + '" aria-label="' + p.label + '" title="' + p.label + '" ' +
              'style="width:100%;aspect-ratio:1;border-radius:50%;background:' + p.hex + ';border:3px solid ' + (p.hex === _state.color ? 'var(--color-burgundy)' : 'transparent') + ';cursor:pointer;transition:border-color 0.15s">' +
            '</button>';
          }).join('') +
          '<input type="color" id="custom-color" title="Custom color" value="' + _state.color + '" style="width:100%;aspect-ratio:1;border-radius:50%;border:3px solid transparent;cursor:pointer;padding:2px;background:none" />' +
        '</div>' +
      '</div>';
  }

  function updatePreview() {
    var wrap = document.getElementById('preview-pill-wrap');
    if (wrap) MediPal.PillRenderer.render(wrap, { color: _state.color, shape: _state.shape }, 'lg');
  }

  function updateSwatchRings() {
    document.querySelectorAll('#color-swatches [data-color]').forEach(function (b) {
      b.style.borderColor = b.dataset.color === _state.color ? 'var(--color-burgundy)' : 'transparent';
    });
  }

  function updateShapePreviews() {
    ['round','oval','capsule'].forEach(function (s) {
      var wrap = document.getElementById('shape-preview-' + s);
      if (wrap) MediPal.PillRenderer.render(wrap, { color: _state.color, shape: s }, 'sm');
    });
  }

  /* ── Step 3: Supply ── */
  function renderSupplyStep(container) {
    container.innerHTML +=
      '<div class="form-group">' +
        '<label class="form-label" for="inv-count">Pills Remaining</label>' +
        '<input class="form-input" type="number" id="inv-count" min="0" max="9999" value="' + _state.currentCount + '" />' +
        '<div class="form-hint">How many pills do you have right now?</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="inv-per-dose">Pills Per Dose</label>' +
        '<input class="form-input" type="number" id="inv-per-dose" min="1" max="10" value="' + _state.pillsPerDose + '" />' +
        '<div class="form-hint">How many pills make up one dose?</div>' +
      '</div>';

    var runOutPreview = document.createElement('div');
    runOutPreview.id = 'run-out-preview';
    runOutPreview.style.cssText = 'background:var(--color-white);border-radius:var(--radius-lg);padding:var(--space-4);box-shadow:var(--shadow-card);margin-bottom:var(--space-6);font-size:var(--font-size-sm);color:var(--color-muted)';
    container.appendChild(runOutPreview);
    updateRunOutPreview();
    container.addEventListener('input', updateRunOutPreview);

    var saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn--primary btn--full btn--lg';
    saveBtn.textContent = _editId ? 'Save Changes' : 'Add Medication';
    saveBtn.addEventListener('click', saveMedication);
    container.appendChild(saveBtn);
  }

  function updateRunOutPreview() {
    var countEl = document.getElementById('inv-count');
    var perEl   = document.getElementById('inv-per-dose');
    var preview = document.getElementById('run-out-preview');
    if (!countEl || !perEl || !preview) return;
    var count = parseInt(countEl.value, 10) || 0;
    var perDose = parseInt(perEl.value, 10) || 1;
    var dosesPerDay = _state.times.length;
    if (dosesPerDay === 0 || count === 0) { preview.textContent = 'Enter pill count to see supply estimate'; return; }
    var days = Math.floor((count / perDose) / dosesPerDay);
    var runDate = new Date(); runDate.setDate(runDate.getDate() + days);
    preview.innerHTML = '📦 Estimated supply: <strong>' + days + ' days</strong> · Runs out <strong>' +
      MediPal.DateUtils.formatDateFriendly(runDate) + '</strong>' +
      (days <= 7 ? ' <span style="color:var(--color-burgundy)">⚠ Refill soon</span>' : '');
  }

  function saveMedication() {
    var count   = parseInt(document.getElementById('inv-count').value, 10) || 0;
    var perDose = parseInt(document.getElementById('inv-per-dose').value, 10) || 1;

    var medData = {
      name: _state.name,
      dosage: _state.dosage,
      notes: _state.notes,
      isCritical: _state.isCritical,
      color: _state.color,
      shape: _state.shape,
      imageUrl: _state.imageUrl || null
    };
    if (_editId) medData.id = _editId;

    var med = MediPal.Store.saveMedication(medData);

    MediPal.Store.getSchedules(med.id).forEach(function (s) { MediPal.Store.deleteSchedule(s.id); });
    MediPal.Store.saveSchedule({
      medicationId: med.id,
      times: _state.times,
      daysOfWeek: _state.daysOfWeek,
      startDate: MediPal.DateUtils.today(),
      endDate: null
    });
    MediPal.Store.saveInventory({ medicationId: med.id, currentCount: count, pillsPerDose: perDose });

    MediPal.Toast.success((_editId ? 'Updated ' : 'Added ') + med.name);
    MediPal.Notify.scheduleToday();
    MediPal.Router.navigate('#dashboard');
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  }

  return { render };
})();
