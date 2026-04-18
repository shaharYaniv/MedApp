window.MediPal = window.MediPal || {};

MediPal.Notify = (function () {
  var _timers = [];   // active setTimeout handles, cleared on reschedule
  var STORAGE_KEY = 'medipal_notify_enabled';

  function isSupported() {
    return 'Notification' in window;
  }

  function isEnabled() {
    return isSupported() &&
      Notification.permission === 'granted' &&
      localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function setEnabled(val) {
    localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
  }

  async function requestPermission() {
    if (!isSupported()) return false;
    var result = await Notification.requestPermission();
    var granted = result === 'granted';
    setEnabled(granted);
    return granted;
  }

  function show(title, options) {
    if (!isSupported() || Notification.permission !== 'granted') return null;
    options = options || {};
    return new Notification(title, {
      icon: 'assets/icons/icon-192.png',
      badge: 'assets/icons/icon-192.png',
      requireInteraction: false,
      silent: false,
      ...options
    });
  }

  function cancelAll() {
    _timers.forEach(function (t) { clearTimeout(t); });
    _timers = [];
  }

  /**
   * Schedule browser notifications for all of today's upcoming doses.
   * Called on app open and after any schedule change.
   */
  function scheduleToday() {
    if (!isEnabled()) return;
    cancelAll();

    var medications = MediPal.Store.getMedications();
    var todayLog = MediPal.Store.getTodayDoseLog();
    var dow = MediPal.DateUtils.todayDow();
    var now = Date.now();

    medications.forEach(function (med) {
      var schedules = MediPal.Store.getSchedules(med.id);
      schedules.forEach(function (sched) {
        if (!sched.times) return;
        if (sched.daysOfWeek && sched.daysOfWeek.indexOf(dow) === -1) return;

        sched.times.forEach(function (timeStr) {
          var scheduledISO = MediPal.DateUtils.scheduledTodayISO(timeStr);
          var fireAt = new Date(scheduledISO).getTime();
          var msUntil = fireAt - now;

          // Only schedule future doses not already taken/skipped
          if (msUntil <= 0) return;
          var alreadyDone = todayLog.some(function (d) {
            return d.medicationId === med.id &&
              d.scheduledTime === scheduledISO &&
              (d.status === 'taken' || d.status === 'skipped');
          });
          if (alreadyDone) return;

          var handle = setTimeout(function () {
            var n = show('Time for ' + med.name, {
              body: med.dosage + ' dose is due now.' + (med.notes ? ' ' + med.notes : ''),
              tag: 'dose-' + med.id + '-' + timeStr,
              requireInteraction: med.isCritical  // stays until dismissed if critical
            });
            if (n) {
              n.onclick = function () {
                window.focus();
                window.location.hash = '#dashboard';
                n.close();
              };
            }
            // Also schedule a follow-up missed-dose notification after 30 min
            scheduleMissedFollowUp(med, scheduledISO);
          }, msUntil);

          _timers.push(handle);
        });
      });
    });
  }

  function scheduleMissedFollowUp(med, scheduledISO) {
    var FOLLOW_UP_MS = 30 * 60 * 1000; // 30 minutes
    var handle = setTimeout(function () {
      // Check if taken by now
      var log = MediPal.Store.getTodayDoseLog();
      var entry = log.find(function (d) {
        return d.medicationId === med.id && d.scheduledTime === scheduledISO;
      });
      if (entry && (entry.status === 'taken' || entry.status === 'skipped' || entry.status === 'snoozed')) return;

      show('Missed dose — ' + med.name, {
        body: 'You haven\'t taken your ' + med.dosage + ' yet. Open Medi-Pal to log it.',
        tag: 'missed-' + med.id + '-' + scheduledISO,
        requireInteraction: true
      });
    }, FOLLOW_UP_MS);
    _timers.push(handle);
  }

  return {
    isSupported,
    isEnabled,
    setEnabled,
    requestPermission,
    show,
    scheduleToday,
    cancelAll
  };
})();
