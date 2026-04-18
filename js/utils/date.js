window.MediPal = window.MediPal || {};

MediPal.DateUtils = (function () {
  function pad(n) { return String(n).padStart(2, '0'); }

  function toLocalISOString(date) {
    return date.getFullYear() + '-' +
      pad(date.getMonth() + 1) + '-' +
      pad(date.getDate()) + 'T' +
      pad(date.getHours()) + ':' +
      pad(date.getMinutes()) + ':' +
      pad(date.getSeconds());
  }

  function todayString() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function isToday(dateStr) {
    return dateStr && dateStr.startsWith(todayString());
  }

  function minutesSince(isoString) {
    if (!isoString) return 0;
    return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  }

  function minutesUntil(isoString) {
    if (!isoString) return 0;
    return Math.floor((new Date(isoString).getTime() - Date.now()) / 60000);
  }

  // "08:30" + "2025-04-18" → Date object
  function timeStringToDate(timeStr, dateStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  // "2026-04-18T08:00:00" → "8:00 AM"
  function formatTime(isoString) {
    const d = new Date(isoString);
    let h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (m > 0 ? ':' + pad(m) : '') + ' ' + ampm;
  }

  // "08:00" → "8:00 AM"
  function formatTimeStr(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return hour + (m > 0 ? ':' + pad(m) : '') + ' ' + ampm;
  }

  // Friendly date: "Today", "Tomorrow", "Apr 20"
  function formatDateFriendly(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // "2026-04-20" → "Apr 20, 2026"
  function formatDateLong(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Today's ISO date string "YYYY-MM-DD"
  function today() { return todayString(); }

  // Returns scheduled ISO string for today's date given a "HH:MM" time string
  function scheduledTodayISO(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return toLocalISOString(d);
  }

  // Gets day-of-week index for today (0=Sun)
  function todayDow() { return new Date().getDay(); }

  return {
    pad, toLocalISOString, todayString, today, isToday,
    minutesSince, minutesUntil, timeStringToDate,
    formatTime, formatTimeStr, formatDateFriendly, formatDateLong,
    scheduledTodayISO, todayDow, uuid
  };
})();
