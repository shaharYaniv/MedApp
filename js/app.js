window.MediPal = window.MediPal || {};

MediPal.App = (function () {
  function init() {
    MediPal.BottomNav.init();
    MediPal.Router.init();

    // Schedule today's notifications on load
    MediPal.Notify.scheduleToday();

    // On tab focus: check missed doses + reschedule notifications
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        setTimeout(checkMissedDoses, 500);
        MediPal.Notify.scheduleToday();
      }
    });
  }

  function checkMissedDoses() {
    var today = MediPal.DateUtils.todayString();
    var medications = MediPal.Store.getMedications();
    var todayLog = MediPal.Store.getTodayDoseLog();

    medications.forEach(function (med) {
      var schedules = MediPal.Store.getSchedules(med.id);
      schedules.forEach(function (sched) {
        if (!sched.times) return;
        var dow = MediPal.DateUtils.todayDow();
        if (sched.daysOfWeek && sched.daysOfWeek.indexOf(dow) === -1) return;

        sched.times.forEach(function (timeStr) {
          var scheduledISO = MediPal.DateUtils.scheduledTodayISO(timeStr);
          var minutesPast = MediPal.DateUtils.minutesSince(scheduledISO);

          if (minutesPast < 15) return;

          var existing = todayLog.find(function (d) {
            return d.medicationId === med.id &&
              d.scheduleId === sched.id &&
              d.scheduledTime === scheduledISO;
          });

          if (!existing || existing.status === 'missed') {
            if (!existing) {
              MediPal.Store.logDose({
                medicationId: med.id,
                scheduleId: sched.id,
                scheduledTime: scheduledISO,
                takenAt: null,
                status: 'missed',
                snoozeUntil: null,
                missedReason: null
              });
            }
            MediPal.MissedDoseModal.show(
              existing || MediPal.Store.getTodayDoseLog().find(function (d) {
                return d.medicationId === med.id && d.scheduledTime === scheduledISO;
              }),
              med
            );
            return;
          }
        });
      });
    });
  }

  // Reschedule notifications after any medication/schedule change
  function onScheduleChanged() {
    MediPal.Notify.scheduleToday();
  }

  return { init, onScheduleChanged };
})();

document.addEventListener('DOMContentLoaded', function () {
  MediPal.App.init();
});
