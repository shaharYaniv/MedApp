window.MediPal = window.MediPal || {};
window.MediPal.Views = window.MediPal.Views || {};

MediPal.Views.Dashboard = (function () {
  function getGreeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function buildTodayDoses() {
    var medications = MediPal.Store.getMedications();
    var todayLog = MediPal.Store.getTodayDoseLog();
    var dow = MediPal.DateUtils.todayDow();
    var doses = [];

    medications.forEach(function (med) {
      var schedules = MediPal.Store.getSchedules(med.id);
      schedules.forEach(function (sched) {
        if (!sched.times) return;
        if (sched.daysOfWeek && sched.daysOfWeek.indexOf(dow) === -1) return;
        sched.times.forEach(function (timeStr) {
          var scheduledISO = MediPal.DateUtils.scheduledTodayISO(timeStr);
          var logEntry = todayLog.find(function (d) {
            return d.medicationId === med.id &&
              d.scheduleId === sched.id &&
              d.scheduledTime === scheduledISO;
          });
          doses.push({
            med: med,
            sched: sched,
            timeStr: timeStr,
            scheduledISO: scheduledISO,
            logEntry: logEntry || null
          });
        });
      });
    });

    doses.sort(function (a, b) { return a.timeStr.localeCompare(b.timeStr); });
    return doses;
  }

  function getDoseStatus(dose) {
    var minutes = MediPal.DateUtils.minutesSince(dose.scheduledISO);
    if (dose.logEntry) {
      if (dose.logEntry.status === 'taken') return 'taken';
      if (dose.logEntry.status === 'skipped') return 'skipped';
      if (dose.logEntry.status === 'snoozed') return 'snoozed';
    }
    if (minutes > 120) return 'missed';
    if (minutes > 0) return 'overdue';
    return 'upcoming';
  }

  function renderDoseCard(dose) {
    var status = getDoseStatus(dose);
    var cardClass = 'dose-card';
    if (status === 'overdue' || status === 'snoozed') cardClass += ' dose-card--overdue';
    if (status === 'missed') cardClass += ' dose-card--missed';
    if (status === 'taken' || status === 'skipped') cardClass += ' dose-card--taken';

    var timeDisplay = MediPal.DateUtils.formatTimeStr(dose.timeStr);
    var timeLabel = timeDisplay;
    if (status === 'overdue') {
      var minsLate = MediPal.DateUtils.minutesSince(dose.scheduledISO);
      timeLabel = timeDisplay + ' · ' + minsLate + 'm ago';
    }
    if (status === 'missed') {
      timeLabel = timeDisplay + ' · Missed';
    }
    if (status === 'snoozed' && dose.logEntry && dose.logEntry.snoozeUntil) {
      var snoozeTime = MediPal.DateUtils.formatTime(dose.logEntry.snoozeUntil);
      timeLabel = 'Snoozed until ' + snoozeTime;
    }

    var checkBtnClass = 'check-btn' + (status === 'taken' ? ' is-checked' : '');
    var checkBtnDisabled = (status === 'taken' || status === 'skipped') ? 'disabled' : '';
    var criticalBadge = dose.med.isCritical ? '<span class="badge badge--critical" style="margin-left:var(--space-2)">Critical</span>' : '';

    var card = document.createElement('div');
    card.className = cardClass;
    card.dataset.doseKey = dose.med.id + '-' + dose.scheduledISO;

    card.innerHTML =
      '<div class="dose-card__pill-wrap" id="pill-wrap-' + dose.med.id + '-' + dose.timeStr.replace(':', '') + '"></div>' +
      '<div class="dose-card__info">' +
        '<div class="dose-card__name">' + escHtml(dose.med.name) + criticalBadge + '</div>' +
        '<div class="dose-card__dosage">' + escHtml(dose.med.dosage) + (dose.med.notes ? ' · ' + escHtml(dose.med.notes) : '') + '</div>' +
        '<div class="dose-card__time">' + timeLabel + '</div>' +
      '</div>' +
      '<div class="dose-card__action">' +
        '<button class="' + checkBtnClass + '" ' + checkBtnDisabled + ' aria-label="Mark ' + escHtml(dose.med.name) + ' as taken">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</button>' +
      '</div>';

    // Render pill
    var pillWrap = card.querySelector('[id^="pill-wrap-"]');
    MediPal.PillRenderer.render(pillWrap, dose.med, 'sm');

    // Check-off click
    if (status !== 'taken' && status !== 'skipped') {
      var btn = card.querySelector('.check-btn');
      btn.addEventListener('click', function () {
        handleCheckOff(card, btn, dose);
      });
    }

    // Missed dose — tap anywhere on card (except button) to open modal
    if (status === 'missed' || status === 'overdue') {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.check-btn')) return;
        var entry = dose.logEntry || MediPal.Store.getTodayDoseLog().find(function (d) {
          return d.medicationId === dose.med.id && d.scheduledTime === dose.scheduledISO;
        });
        if (entry) MediPal.MissedDoseModal.show(entry, dose.med);
      });
      card.style.cursor = 'pointer';
    }

    return card;
  }

  function handleCheckOff(cardEl, btnEl, dose) {
    // Create log entry if not exists
    var today = MediPal.DateUtils.todayString();
    var existingLog = MediPal.Store.getDoseLog(dose.med.id, today).find(function (d) {
      return d.scheduledTime === dose.scheduledISO;
    });

    MediPal.CheckAnimation.play(cardEl, btnEl, function () {
      if (existingLog) {
        MediPal.Store.updateDoseEntry(existingLog.id, {
          status: 'taken',
          takenAt: new Date().toISOString()
        });
      } else {
        MediPal.Store.logDose({
          medicationId: dose.med.id,
          scheduleId: dose.sched.id,
          scheduledTime: dose.scheduledISO,
          takenAt: new Date().toISOString(),
          status: 'taken',
          snoozeUntil: null,
          missedReason: null
        });
      }
      MediPal.Store.decrementInventory(dose.med.id);
      MediPal.Toast.success(dose.med.name + ' taken ✓');

      // Re-render after short delay
      setTimeout(function () { render(); }, 600);
    });
  }

  function render() {
    var content = document.getElementById('app-content');
    content.innerHTML = '';
    content.className = 'view-enter';

    var doses = buildTodayDoses();
    var upcoming = doses.filter(function (d) { return getDoseStatus(d) !== 'taken' && getDoseStatus(d) !== 'skipped'; });
    var completed = doses.filter(function (d) { var s = getDoseStatus(d); return s === 'taken' || s === 'skipped'; });

    // Header
    var totalToday = doses.length;
    var doneCount = completed.length;
    var subtitle = totalToday === 0
      ? 'No medications scheduled today'
      : doneCount === totalToday
        ? 'All ' + totalToday + ' doses complete today 🎉'
        : doneCount + ' of ' + totalToday + ' doses taken';

    var header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML =
      '<div class="view-header__titles">' +
        '<div class="view-header__eyebrow">Medi-Pal</div>' +
        '<h1 class="view-header__title">' + getGreeting() + '</h1>' +
        '<div class="view-header__subtitle">' + subtitle + '</div>' +
      '</div>';
    content.appendChild(header);

    // Notification permission banner (shown when not yet enabled)
    var notifBanner = buildNotifBanner();
    if (notifBanner) content.appendChild(notifBanner);

    if (doses.length === 0) {
      content.appendChild(buildEmptyState());
      return;
    }

    // Upcoming section
    if (upcoming.length > 0) {
      var upLabel = document.createElement('div');
      upLabel.className = 'section-label';
      upLabel.textContent = 'Upcoming & Overdue';
      content.appendChild(upLabel);

      var upList = document.createElement('div');
      upList.className = 'view-content';
      upList.style.paddingTop = '0';
      upcoming.forEach(function (dose) {
        upList.appendChild(renderDoseCard(dose));
      });
      content.appendChild(upList);
    }

    // Completed section
    if (completed.length > 0) {
      var doneLabel = document.createElement('div');
      doneLabel.className = 'section-label';
      doneLabel.textContent = 'Completed';
      content.appendChild(doneLabel);

      var doneList = document.createElement('div');
      doneList.className = 'view-content';
      doneList.style.paddingTop = '0';
      completed.forEach(function (dose) {
        doneList.appendChild(renderDoseCard(dose));
      });
      content.appendChild(doneList);
    }
  }

  function buildNotifBanner() {
    if (!MediPal.Notify.isSupported()) return null;
    // Already granted and enabled — no banner needed
    if (MediPal.Notify.isEnabled()) return null;
    // User explicitly denied — show a "blocked" note
    if (Notification.permission === 'denied') {
      var denied = document.createElement('div');
      denied.style.cssText = 'margin:0 var(--space-4) var(--space-3);padding:var(--space-3) var(--space-4);background:var(--color-beige);border-radius:var(--radius-md);font-size:var(--font-size-sm);color:var(--color-muted);display:flex;align-items:center;gap:var(--space-3)';
      denied.innerHTML = '<span>🔕</span><span>Notifications are blocked. Enable them in your browser settings to get dose reminders.</span>';
      return denied;
    }

    var banner = document.createElement('div');
    banner.style.cssText = 'margin:0 var(--space-4) var(--space-3);padding:var(--space-4) var(--space-5);background:var(--color-white);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);display:flex;align-items:center;gap:var(--space-4)';
    banner.innerHTML =
      '<div style="font-size:26px;flex-shrink:0">🔔</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);color:var(--color-text)">Enable dose reminders</div>' +
        '<div style="font-size:var(--font-size-xs);color:var(--color-muted);margin-top:2px">Get a notification when each dose is due</div>' +
      '</div>' +
      '<button class="btn btn--primary btn--sm" id="enable-notif-btn">Enable</button>';

    banner.querySelector('#enable-notif-btn').addEventListener('click', function () {
      MediPal.Notify.requestPermission().then(function (granted) {
        if (granted) {
          MediPal.Notify.scheduleToday();
          MediPal.Toast.success('Notifications enabled! You\'ll be reminded for each dose.');
          render(); // redraw to remove banner
        } else {
          MediPal.Toast.error('Notifications blocked. Check your browser settings.');
        }
      });
    });

    return banner;
  }

  function buildEmptyState() {
    var el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML =
      '<div class="empty-state__icon">' +
        '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>' +
      '</div>' +
      '<div class="empty-state__title">No doses today</div>' +
      '<div class="empty-state__body">Add a medication to start tracking your schedule.</div>' +
      '<a href="#add-med" class="btn btn--primary" style="margin-top:var(--space-2)">Add your first medication</a>';
    return el;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { render };
})();
