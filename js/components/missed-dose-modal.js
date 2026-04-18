window.MediPal = window.MediPal || {};

MediPal.MissedDoseModal = (function () {
  var _shownDoseIds = {};   // prevent showing same modal twice per session

  function show(doseEntry, medication) {
    if (!doseEntry || !medication) return;
    if (_shownDoseIds[doseEntry.id]) return;
    _shownDoseIds[doseEntry.id] = true;

    var overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    var minutesMissed = MediPal.DateUtils.minutesSince(doseEntry.scheduledTime);
    var timeStr = MediPal.DateUtils.formatTime(doseEntry.scheduledTime);

    var sheet = document.createElement('div');
    sheet.className = 'modal-sheet';
    sheet.innerHTML =
      '<div class="modal-handle"></div>' +
      '<div class="modal-title">Missed dose check-in</div>' +
      '<div class="modal-subtitle">' +
        medication.name + ' ' + medication.dosage + ' was scheduled at ' + timeStr + '.<br>' +
        'What\'s going on? We\'re here to help, not to judge.' +
      '</div>' +
      buildStep1Buttons(doseEntry, medication, minutesMissed);

    overlay.appendChild(sheet);

    // Tap overlay to dismiss (only if not critical dose)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && !medication.isCritical) {
        close();
      }
    });
  }

  function buildStep1Buttons(doseEntry, medication, minutesMissed) {
    return '<div id="modal-step"></div>' +
      renderStep1(doseEntry, medication, minutesMissed);
  }

  function renderStep1(doseEntry, medication, minutesMissed) {
    var el = document.getElementById('modal-step');
    if (!el) return '';
    el.innerHTML =
      '<button class="option-btn" id="md-away">' +
        '<span class="option-btn__icon option-btn__icon--blue">🚶</span>' +
        '<span class="option-btn__text">' +
          '<div class="option-btn__label">I\'m away from my meds right now</div>' +
          '<div class="option-btn__desc">Let\'s find a time that works for you</div>' +
        '</span>' +
      '</button>' +
      '<button class="option-btn" id="md-unwell">' +
        '<span class="option-btn__icon option-btn__icon--red">🤒</span>' +
        '<span class="option-btn__text">' +
          '<div class="option-btn__label">I\'m not feeling well</div>' +
          '<div class="option-btn__desc">It\'s okay to skip — your health first</div>' +
        '</span>' +
      '</button>' +
      '<button class="option-btn" id="md-taking">' +
        '<span class="option-btn__icon option-btn__icon--green">💊</span>' +
        '<span class="option-btn__text">' +
          '<div class="option-btn__label">I\'m taking it right now</div>' +
          '<div class="option-btn__desc">Mark it as taken</div>' +
        '</span>' +
      '</button>';

    setTimeout(function () {
      var awayBtn   = document.getElementById('md-away');
      var unwellBtn = document.getElementById('md-unwell');
      var takingBtn = document.getElementById('md-taking');
      if (awayBtn)   awayBtn.addEventListener('click',   function () { showSnoozeStep(doseEntry, medication, minutesMissed, 'away'); });
      if (unwellBtn) unwellBtn.addEventListener('click', function () { showSkipStep(doseEntry, medication, minutesMissed); });
      if (takingBtn) takingBtn.addEventListener('click', function () { markTakenNow(doseEntry, medication); });
    }, 0);

    return '';
  }

  function showSnoozeStep(doseEntry, medication, minutesMissed, reason) {
    var el = document.getElementById('modal-step');
    if (!el) return;
    el.innerHTML =
      '<div class="modal-subtitle" style="margin-bottom:var(--space-4)">When will you be back to take it?</div>' +
      '<div class="snooze-row">' +
        '<button class="snooze-btn" data-mins="30">30 min</button>' +
        '<button class="snooze-btn" data-mins="60">1 hr</button>' +
        '<button class="snooze-btn" data-mins="120">2 hrs</button>' +
        '<button class="snooze-btn" data-mins="180">3 hrs</button>' +
      '</div>' +
      '<button class="btn btn--ghost btn--full" id="md-snooze-confirm" style="margin-top:var(--space-4)" disabled>Set reminder</button>' +
      '<button class="btn btn--ghost btn--full" id="md-back" style="margin-top:var(--space-2);color:var(--color-muted)">← Back</button>';

    var selected = null;
    el.querySelectorAll('.snooze-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.snooze-btn').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        selected = parseInt(btn.dataset.mins, 10);
        document.getElementById('md-snooze-confirm').removeAttribute('disabled');
      });
    });

    document.getElementById('md-snooze-confirm').addEventListener('click', function () {
      if (!selected) return;
      var snoozeUntil = new Date(Date.now() + selected * 60000).toISOString();
      MediPal.Store.updateDoseEntry(doseEntry.id, {
        status: 'snoozed',
        snoozeUntil: snoozeUntil,
        missedReason: reason
      });
      MediPal.Toast.info('Reminder set for ' + selected + ' minutes from now');
      close();
      refreshCurrentView();
    });

    document.getElementById('md-back').addEventListener('click', function () {
      renderStep1(doseEntry, medication, minutesMissed);
    });
  }

  function showSkipStep(doseEntry, medication, minutesMissed) {
    var el = document.getElementById('modal-step');
    if (!el) return;
    el.innerHTML =
      '<div style="text-align:center; padding:var(--space-4) 0;">' +
        '<div style="font-size:40px; margin-bottom:var(--space-3)">💙</div>' +
        '<div style="font-size:var(--font-size-base);color:var(--color-muted);line-height:var(--line-height-base);margin-bottom:var(--space-6)">' +
          'It\'s completely okay to skip a dose when you\'re not feeling well. ' +
          'You can also snooze for 30 minutes if you think you\'ll feel better shortly.' +
        '</div>' +
      '</div>' +
      '<button class="btn btn--secondary btn--full btn--lg" id="md-skip">Skip this dose</button>' +
      '<button class="btn btn--ghost btn--full" id="md-snooze30" style="margin-top:var(--space-3)">Snooze 30 minutes</button>' +
      '<button class="btn btn--ghost btn--full" id="md-back2" style="margin-top:var(--space-2);color:var(--color-muted)">← Back</button>';

    document.getElementById('md-skip').addEventListener('click', function () {
      MediPal.Store.updateDoseEntry(doseEntry.id, { status: 'skipped', missedReason: 'unwell' });
      MediPal.Toast.info('Dose skipped. Feel better soon 💙');
      close();
      refreshCurrentView();
    });

    document.getElementById('md-snooze30').addEventListener('click', function () {
      var snoozeUntil = new Date(Date.now() + 30 * 60000).toISOString();
      MediPal.Store.updateDoseEntry(doseEntry.id, { status: 'snoozed', snoozeUntil: snoozeUntil, missedReason: 'unwell' });
      MediPal.Toast.info('Reminder in 30 minutes');
      close();
      refreshCurrentView();
    });

    document.getElementById('md-back2').addEventListener('click', function () {
      renderStep1(doseEntry, medication, minutesMissed);
    });
  }

  function markTakenNow(doseEntry, medication) {
    MediPal.Store.updateDoseEntry(doseEntry.id, {
      status: 'taken',
      takenAt: new Date().toISOString()
    });
    MediPal.Store.decrementInventory(medication.id);
    checkBuddyEscalation(doseEntry, medication, 0);
    MediPal.Toast.success(medication.name + ' marked as taken ✓');
    close();
    refreshCurrentView();
  }

  function checkBuddyEscalation(doseEntry, medication, minutesMissed) {
    if (!medication.isCritical) return;
    var buddy = MediPal.Store.getBuddy();
    if (!buddy.enabled || !buddy.phone) return;
    if (minutesMissed < (buddy.notifyAfterMinutes || 120)) return;
    // Prevent duplicate notifications per session
    if (buddy.lastNotifiedAt) {
      var lastMs = new Date(buddy.lastNotifiedAt).getTime();
      if (Date.now() - lastMs < 3600000) return; // 1hr cooldown
    }

    // Update lastNotifiedAt
    MediPal.Store.saveBuddy(Object.assign({}, buddy, { lastNotifiedAt: new Date().toISOString() }));

    var smsLink = MediPal.SMS.buildBuddySMSLink(buddy, medication, minutesMissed);
    var confirmed = window.confirm(
      'Your buddy ' + buddy.name + ' hasn\'t been notified yet.\n\n' +
      medication.name + ' is a critical dose missed by ' + Math.floor(minutesMissed / 60) + 'h ' + (minutesMissed % 60) + 'm.\n\n' +
      'Send them a message?'
    );
    if (confirmed) {
      window.open(smsLink, '_blank');
    }
  }

  function close() {
    var overlay = document.getElementById('modal-overlay');
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }

  function refreshCurrentView() {
    var hash = MediPal.Router.getHash();
    if (hash === '#dashboard') MediPal.Views.Dashboard.render();
  }

  return { show, close, checkBuddyEscalation };
})();
