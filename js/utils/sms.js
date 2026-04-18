window.MediPal = window.MediPal || {};

MediPal.SMS = (function () {
  function buildRefillMessage(medication, inventory, runOut) {
    const daysLeft = runOut ? runOut.daysRemaining : '?';
    const dateStr = runOut ? MediPal.DateUtils.formatDateLong(
      runOut.runOutDate.toISOString().split('T')[0]
    ) : 'soon';
    return (
      `Hi, I need a refill for ${medication.name} ${medication.dosage}. ` +
      `I have approximately ${inventory.currentCount} pills remaining ` +
      `(estimated ${daysLeft} days supply, runs out around ${dateStr}). ` +
      `Please advise on next steps. Thank you.`
    );
  }

  function buildRefillSMSLink(medication, inventory, runOut) {
    const msg = buildRefillMessage(medication, inventory, runOut);
    return 'sms:?body=' + encodeURIComponent(msg);
  }

  function buildBuddyMessage(buddy, medication, minutesMissed) {
    const hours = Math.floor(minutesMissed / 60);
    const mins = minutesMissed % 60;
    const timeStr = hours > 0
      ? `${hours}h ${mins > 0 ? mins + 'm' : ''}`.trim()
      : `${mins} minutes`;
    return (
      `Hi ${buddy.name}, this is an automated reminder from Medi-Pal. ` +
      `Your loved one has missed their ${medication.name} (${medication.dosage}) dose ` +
      `by ${timeStr}. This is marked as a critical medication. ` +
      `Please check in with them if you can. Thank you.`
    );
  }

  function buildBuddySMSLink(buddy, medication, minutesMissed) {
    const msg = buildBuddyMessage(buddy, medication, minutesMissed);
    const phone = buddy.phone ? buddy.phone.replace(/[^+\d]/g, '') : '';
    return 'sms:' + phone + '?body=' + encodeURIComponent(msg);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  return { buildRefillMessage, buildRefillSMSLink, buildBuddyMessage, buildBuddySMSLink, copyToClipboard };
})();
