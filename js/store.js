window.MediPal = window.MediPal || {};

MediPal.Store = (function () {
  const KEYS = {
    MEDICATIONS: 'medipal_medications',
    SCHEDULES:   'medipal_schedules',
    DOSE_LOG:    'medipal_dose_log',
    INVENTORY:   'medipal_inventory',
    BUDDY:       'medipal_buddy',
    STATE:       'medipal_app_state',
  };

  function get(key, fallback) {
    if (fallback === undefined) fallback = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('MediPal: localStorage write failed', e);
    }
  }

  const { uuid } = MediPal.DateUtils;

  // ── Medications ──────────────────────────────────────────────────
  function getMedications() { return get(KEYS.MEDICATIONS); }

  function getMedication(id) {
    return getMedications().find(m => m.id === id) || null;
  }

  function saveMedication(med) {
    const list = getMedications();
    if (!med.id) med.id = uuid();
    if (!med.createdAt) med.createdAt = new Date().toISOString();
    const idx = list.findIndex(m => m.id === med.id);
    if (idx >= 0) list[idx] = med; else list.push(med);
    set(KEYS.MEDICATIONS, list);
    return med;
  }

  function deleteMedication(id) {
    set(KEYS.MEDICATIONS, getMedications().filter(m => m.id !== id));
    // also clean up related data
    set(KEYS.SCHEDULES, getSchedules().filter(s => s.medicationId !== id));
    set(KEYS.DOSE_LOG, getDoseLog().filter(d => d.medicationId !== id));
    set(KEYS.INVENTORY, get(KEYS.INVENTORY).filter(i => i.medicationId !== id));
  }

  // ── Schedules ────────────────────────────────────────────────────
  function getSchedules(medicationId) {
    const all = get(KEYS.SCHEDULES);
    return medicationId ? all.filter(s => s.medicationId === medicationId) : all;
  }

  function saveSchedule(sched) {
    const list = get(KEYS.SCHEDULES);
    if (!sched.id) sched.id = uuid();
    const idx = list.findIndex(s => s.id === sched.id);
    if (idx >= 0) list[idx] = sched; else list.push(sched);
    set(KEYS.SCHEDULES, list);
    return sched;
  }

  function deleteSchedule(id) {
    set(KEYS.SCHEDULES, get(KEYS.SCHEDULES).filter(s => s.id !== id));
  }

  // ── Dose Log ─────────────────────────────────────────────────────
  function getDoseLog(medicationId, dateStr) {
    let log = get(KEYS.DOSE_LOG);
    if (medicationId) log = log.filter(d => d.medicationId === medicationId);
    if (dateStr) log = log.filter(d => d.scheduledTime && d.scheduledTime.startsWith(dateStr));
    return log;
  }

  function getTodayDoseLog() {
    const today = MediPal.DateUtils.todayString();
    return getDoseLog(null, today);
  }

  function logDose(entry) {
    const log = get(KEYS.DOSE_LOG);
    if (!entry.id) entry.id = uuid();
    log.push(entry);
    set(KEYS.DOSE_LOG, log);
    return entry;
  }

  function updateDoseEntry(id, patch) {
    const log = get(KEYS.DOSE_LOG);
    const idx = log.findIndex(d => d.id === id);
    if (idx >= 0) {
      log[idx] = Object.assign({}, log[idx], patch);
      set(KEYS.DOSE_LOG, log);
      return log[idx];
    }
    return null;
  }

  function getDoseEntry(id) {
    return get(KEYS.DOSE_LOG).find(d => d.id === id) || null;
  }

  // ── Inventory ────────────────────────────────────────────────────
  function getInventory(medicationId) {
    const all = get(KEYS.INVENTORY);
    if (medicationId) {
      return all.find(i => i.medicationId === medicationId) || {
        medicationId, currentCount: 0, pillsPerDose: 1,
        lastUpdated: new Date().toISOString()
      };
    }
    return all;
  }

  function saveInventory(entry) {
    const all = get(KEYS.INVENTORY);
    const idx = all.findIndex(i => i.medicationId === entry.medicationId);
    entry.lastUpdated = new Date().toISOString();
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    set(KEYS.INVENTORY, all);
    return entry;
  }

  function decrementInventory(medicationId) {
    const inv = getInventory(medicationId);
    inv.currentCount = Math.max(0, (inv.currentCount || 0) - (inv.pillsPerDose || 1));
    return saveInventory(inv);
  }

  // ── Run-Out Prediction ───────────────────────────────────────────
  function calculateRunOut(medicationId) {
    const inv = getInventory(medicationId);
    const schedules = getSchedules(medicationId);
    const today = MediPal.DateUtils.today();

    const dosesPerDay = schedules
      .filter(s => {
        if (s.endDate && s.endDate < today) return false;
        return true;
      })
      .reduce((sum, s) => sum + (s.times ? s.times.length : 0), 0);

    if (dosesPerDay === 0 || !inv.currentCount) return null;

    const daysRemaining = Math.floor((inv.currentCount / (inv.pillsPerDose || 1)) / dosesPerDay);
    const runOutDate = new Date();
    runOutDate.setDate(runOutDate.getDate() + daysRemaining);

    return {
      daysRemaining,
      runOutDate,
      isWarning: daysRemaining <= 7,
      isCritical: daysRemaining <= 3
    };
  }

  // ── Buddy ────────────────────────────────────────────────────────
  function getBuddy() {
    return get(KEYS.BUDDY, { enabled: false, name: '', phone: '', notifyAfterMinutes: 120 });
  }

  function saveBuddy(buddy) {
    set(KEYS.BUDDY, buddy);
    return buddy;
  }

  // ── App State ────────────────────────────────────────────────────
  function getState() {
    return get(KEYS.STATE, { onboardingComplete: false, activeView: 'dashboard' });
  }

  function saveState(patch) {
    const state = Object.assign(getState(), patch);
    set(KEYS.STATE, state);
    return state;
  }

  return {
    getMedications, getMedication, saveMedication, deleteMedication,
    getSchedules, saveSchedule, deleteSchedule,
    getDoseLog, getTodayDoseLog, logDose, updateDoseEntry, getDoseEntry,
    getInventory, saveInventory, decrementInventory, calculateRunOut,
    getBuddy, saveBuddy,
    getState, saveState
  };
})();
