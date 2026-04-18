window.MediPal = window.MediPal || {};
window.MediPal.Views = window.MediPal.Views || {};

MediPal.Views.Cabinet = (function () {
  function render() {
    var content = document.getElementById('app-content');
    content.innerHTML = '';
    content.className = 'view-enter';

    var header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML =
      '<div class="view-header__titles">' +
        '<div class="view-header__eyebrow">Your Medications</div>' +
        '<h1 class="view-header__title">Medicine Cabinet</h1>' +
        '<div class="view-header__subtitle">Tap a pill to view details</div>' +
      '</div>';
    content.appendChild(header);

    var meds = MediPal.Store.getMedications();

    if (meds.length === 0) {
      content.appendChild(buildEmptyState());
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'cabinet-grid';

    meds.forEach(function (med, idx) {
      var card = buildCabinetCard(med, idx);
      grid.appendChild(card);
    });

    content.appendChild(grid);
  }

  function buildCabinetCard(med, idx) {
    var card = document.createElement('div');
    card.className = 'cabinet-card';
    card.style.animationDelay = (idx * 40) + 'ms';
    card.classList.add('bounce-in');

    if (med.isCritical) {
      var dot = document.createElement('div');
      dot.className = 'cabinet-card__critical-dot';
      dot.title = 'Critical medication';
      card.appendChild(dot);
    }

    var pillEl = MediPal.PillRenderer.create(med, 'cabinet');
    card.appendChild(pillEl);

    var nameEl = document.createElement('div');
    nameEl.className = 'cabinet-card__name';
    nameEl.textContent = med.name;
    card.appendChild(nameEl);

    var dosageEl = document.createElement('div');
    dosageEl.className = 'cabinet-card__dosage';
    dosageEl.textContent = med.dosage;
    card.appendChild(dosageEl);

    // Next dose badge
    var nextDose = getNextDose(med);
    if (nextDose) {
      var badge = document.createElement('span');
      badge.className = 'badge badge--muted';
      badge.textContent = nextDose;
      badge.style.marginTop = 'auto';
      card.appendChild(badge);
    }

    card.addEventListener('click', function () {
      showDetailSheet(med);
    });

    return card;
  }

  function getNextDose(med) {
    var schedules = MediPal.Store.getSchedules(med.id);
    if (!schedules.length) return null;
    var now = new Date();
    var nowMinutes = now.getHours() * 60 + now.getMinutes();
    var dow = now.getDay();

    var allTimes = [];
    schedules.forEach(function (s) {
      if (!s.times) return;
      if (s.daysOfWeek && s.daysOfWeek.indexOf(dow) === -1) return;
      s.times.forEach(function (t) {
        var parts = t.split(':').map(Number);
        allTimes.push(parts[0] * 60 + parts[1]);
      });
    });

    allTimes.sort(function (a, b) { return a - b; });
    var next = allTimes.find(function (m) { return m > nowMinutes; });
    if (next === undefined) next = allTimes[0]; // tomorrow's first

    if (next === undefined) return null;
    var h = Math.floor(next / 60);
    var m = next % 60;
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (m > 0 ? ':' + MediPal.DateUtils.pad(m) : '') + ' ' + ampm;
  }

  function showDetailSheet(med) {
    var overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    var schedules = MediPal.Store.getSchedules(med.id);
    var inv = MediPal.Store.getInventory(med.id);
    var runOut = MediPal.Store.calculateRunOut(med.id);

    var timesStr = schedules.reduce(function (acc, s) {
      if (!s.times) return acc;
      return acc.concat(s.times.map(MediPal.DateUtils.formatTimeStr));
    }, []).join(', ') || 'None set';

    var runOutStr = runOut
      ? (runOut.daysRemaining + ' days (' + MediPal.DateUtils.formatDateFriendly(runOut.runOutDate) + ')')
      : 'N/A';

    var sheet = document.createElement('div');
    sheet.className = 'modal-sheet';
    sheet.innerHTML =
      '<div class="modal-handle"></div>' +
      '<div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-5)">' +
        '<div id="detail-pill"></div>' +
        '<div>' +
          '<div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold)">' + escHtml(med.name) + '</div>' +
          '<div style="color:var(--color-muted);font-size:var(--font-size-sm)">' + escHtml(med.dosage) + '</div>' +
          (med.isCritical ? '<span class="badge badge--critical" style="margin-top:var(--space-2)">Critical</span>' : '') +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div class="info-row"><span class="info-row__label">Dose times</span><span class="info-row__value">' + timesStr + '</span></div>' +
        '<div class="info-row"><span class="info-row__label">Pills remaining</span><span class="info-row__value">' + (inv.currentCount || 0) + '</span></div>' +
        '<div class="info-row"><span class="info-row__label">Estimated supply</span><span class="info-row__value">' + runOutStr + '</span></div>' +
        (med.notes ? '<div class="info-row"><span class="info-row__label">Notes</span><span class="info-row__value">' + escHtml(med.notes) + '</span></div>' : '') +
      '</div>' +
      '<div class="detail-sheet__actions">' +
        '<button class="btn btn--secondary btn--full btn--lg" id="detail-edit">Edit Medication</button>' +
        '<button class="btn btn--danger btn--full" id="detail-delete">Remove Medication</button>' +
        '<button class="btn btn--ghost btn--full" id="detail-close" style="color:var(--color-muted)">Close</button>' +
      '</div>';

    MediPal.PillRenderer.render(sheet.querySelector('#detail-pill'), med, 'lg');

    overlay.appendChild(sheet);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    sheet.querySelector('#detail-close').addEventListener('click', close);

    sheet.querySelector('#detail-edit').addEventListener('click', function () {
      close();
      MediPal.Router.navigate('#add-med', { edit: med.id });
    });

    sheet.querySelector('#detail-delete').addEventListener('click', function () {
      if (confirm('Remove ' + med.name + ' from your cabinet?\n\nThis will also delete all schedule and history data.')) {
        MediPal.Store.deleteMedication(med.id);
        close();
        render();
        MediPal.Toast.success(med.name + ' removed');
      }
    });
  }

  function close() {
    var overlay = document.getElementById('modal-overlay');
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }

  function buildEmptyState() {
    var el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML =
      '<div class="empty-state__icon">' +
        '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>' +
      '</div>' +
      '<div class="empty-state__title">Cabinet is empty</div>' +
      '<div class="empty-state__body">Add your medications to see them visualized here as 3D pills you can recognize at a glance.</div>' +
      '<a href="#add-med" class="btn btn--primary" style="margin-top:var(--space-2)">Add a medication</a>';
    return el;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
