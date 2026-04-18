window.MediPal = window.MediPal || {};
window.MediPal.Views = window.MediPal.Views || {};

MediPal.Views.Inventory = (function () {
  function render() {
    var content = document.getElementById('app-content');
    content.innerHTML = '';
    content.className = 'view-enter';

    var header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML =
      '<div class="view-header__titles">' +
        '<div class="view-header__eyebrow">Medication Supply</div>' +
        '<h1 class="view-header__title">Inventory</h1>' +
        '<div class="view-header__subtitle">Track your pill supply</div>' +
      '</div>';
    content.appendChild(header);

    var meds = MediPal.Store.getMedications();

    if (meds.length === 0) {
      content.appendChild(buildEmptyState());
      return;
    }

    // Warning banner for low supply
    var warnings = [];
    meds.forEach(function (med) {
      var r = MediPal.Store.calculateRunOut(med.id);
      if (r && r.isWarning) warnings.push({ med: med, runOut: r });
    });

    if (warnings.length > 0) {
      var banner = document.createElement('div');
      banner.className = 'warning-banner';
      var names = warnings.map(function (w) { return w.med.name; }).join(', ');
      banner.innerHTML =
        '<div class="warning-banner__icon">⚠️</div>' +
        '<div class="warning-banner__text">' +
          '<div class="warning-banner__title">Low supply alert</div>' +
          '<div class="warning-banner__body">' + escHtml(names) + ' ' + (warnings.length === 1 ? 'is' : 'are') + ' running low. Consider refilling soon.</div>' +
        '</div>';
      content.appendChild(banner);
    }

    var list = document.createElement('div');
    list.className = 'view-content';
    list.style.paddingTop = 'var(--space-2)';

    meds.forEach(function (med) {
      list.appendChild(buildInventoryItem(med));
    });

    content.appendChild(list);
  }

  function buildInventoryItem(med) {
    var inv = MediPal.Store.getInventory(med.id);
    var runOut = MediPal.Store.calculateRunOut(med.id);
    var schedules = MediPal.Store.getSchedules(med.id);
    var dosesPerDay = schedules.reduce(function (sum, s) {
      return sum + (s.times ? s.times.length : 0);
    }, 0);

    var pct = 0;
    var maxDays = 90;
    if (runOut) {
      pct = Math.min(100, Math.round((runOut.daysRemaining / maxDays) * 100));
    }

    var fillClass = 'progress-bar__fill';
    if (runOut && runOut.isCritical) fillClass += ' progress-bar__fill--critical';
    else if (runOut && runOut.isWarning) fillClass += ' progress-bar__fill--warning';

    var runOutLabel = 'N/A';
    var runOutClass = 'inventory-item__run-out';
    if (inv.currentCount === 0) {
      runOutLabel = 'Out of stock';
      runOutClass += ' inventory-item__run-out--critical';
    } else if (runOut) {
      runOutLabel = 'Runs out in ' + runOut.daysRemaining + ' days (' + MediPal.DateUtils.formatDateFriendly(runOut.runOutDate) + ')';
      if (runOut.isCritical) runOutClass += ' inventory-item__run-out--critical';
      else if (runOut.isWarning) runOutClass += ' inventory-item__run-out--warning';
    } else if (inv.currentCount > 0) {
      runOutLabel = 'No schedule set';
    }

    var item = document.createElement('div');
    item.className = 'inventory-item';
    item.innerHTML =
      '<div class="inventory-item__header">' +
        '<div id="inv-pill-' + med.id + '" style="flex-shrink:0"></div>' +
        '<div class="inventory-item__info">' +
          '<div class="inventory-item__name">' + escHtml(med.name) + '</div>' +
          '<div class="inventory-item__meta">' + escHtml(med.dosage) + (dosesPerDay > 0 ? ' · ' + dosesPerDay + 'x daily' : '') + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="inventory-item__count">' + (inv.currentCount || 0) + '</div>' +
          '<div class="inventory-item__count-label">pills left</div>' +
        '</div>' +
      '</div>' +
      '<div class="progress-bar"><div class="' + fillClass + '" style="width:' + pct + '%"></div></div>' +
      '<div class="inventory-item__footer">' +
        '<div class="' + runOutClass + '">' + runOutLabel + '</div>' +
        '<button class="btn btn--secondary btn--sm refill-btn" data-med-id="' + med.id + '">Refill</button>' +
      '</div>';

    MediPal.PillRenderer.render(item.querySelector('#inv-pill-' + med.id), med, 'sm');

    item.querySelector('.refill-btn').addEventListener('click', function () {
      showRefillDialog(med, inv, runOut);
    });

    return item;
  }

  function showRefillDialog(med, inv, runOut) {
    var overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    var msg = MediPal.SMS.buildRefillMessage(med, inv, runOut);
    var smsLink = MediPal.SMS.buildRefillSMSLink(med, inv, runOut);

    var sheet = document.createElement('div');
    sheet.className = 'modal-sheet';
    sheet.innerHTML =
      '<div class="modal-handle"></div>' +
      '<div class="modal-title">Refill Request</div>' +
      '<div class="modal-subtitle">Send this message to your doctor or pharmacy.</div>' +
      '<div style="background:var(--color-white);border-radius:var(--radius-md);padding:var(--space-4);font-size:var(--font-size-sm);line-height:var(--line-height-base);color:var(--color-text);margin-bottom:var(--space-6)">' +
        escHtml(msg) +
      '</div>' +
      '<a href="' + smsLink + '" class="btn btn--primary btn--full btn--lg" style="margin-bottom:var(--space-3)">📱 Send via SMS</a>' +
      '<button class="btn btn--secondary btn--full" id="refill-copy">📋 Copy Message</button>' +
      '<button class="btn btn--ghost btn--full" id="refill-close" style="margin-top:var(--space-2);color:var(--color-muted)">Close</button>';

    overlay.appendChild(sheet);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    sheet.querySelector('#refill-copy').addEventListener('click', function () {
      MediPal.SMS.copyToClipboard(msg).then(function () {
        MediPal.Toast.success('Message copied to clipboard');
      });
    });

    sheet.querySelector('#refill-close').addEventListener('click', close);
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
        '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
      '</div>' +
      '<div class="empty-state__title">No medications yet</div>' +
      '<div class="empty-state__body">Add medications to track your supply and get refill reminders.</div>' +
      '<a href="#add-med" class="btn btn--primary" style="margin-top:var(--space-2)">Add a medication</a>';
    return el;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
