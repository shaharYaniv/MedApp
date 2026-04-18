window.MediPal = window.MediPal || {};
window.MediPal.Views = window.MediPal.Views || {};

MediPal.Views.Buddy = (function () {
  function render() {
    var content = document.getElementById('app-content');
    content.innerHTML = '';
    content.className = 'view-enter';

    var buddy = MediPal.Store.getBuddy();

    var header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML =
      '<div class="view-header__titles">' +
        '<div class="view-header__eyebrow">Support System</div>' +
        '<h1 class="view-header__title">Buddy</h1>' +
        '<div class="view-header__subtitle">' +
          (buddy.enabled && buddy.name ? buddy.name + ' is your buddy' : 'Set up a trusted contact') +
        '</div>' +
      '</div>';
    content.appendChild(header);

    var view = document.createElement('div');
    view.className = 'view-content';
    view.style.paddingTop = '0';
    content.appendChild(view);

    if (buddy.enabled && buddy.name) {
      renderActiveState(view, buddy);
    } else {
      renderSetupState(view, buddy);
    }
  }

  function renderActiveState(container, buddy) {
    // Avatar + buddy info card
    var initial = buddy.name ? buddy.name[0].toUpperCase() : '?';
    var lastNotified = buddy.lastNotifiedAt
      ? MediPal.DateUtils.formatDateFriendly(buddy.lastNotifiedAt)
      : 'Never';

    var card = document.createElement('div');
    card.className = 'buddy-card';
    card.style.cssText = 'display:flex;align-items:center;gap:var(--space-5)';
    card.innerHTML =
      '<div class="buddy-avatar">' + escHtml(initial) + '</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold)">' + escHtml(buddy.name) + '</div>' +
        (buddy.phone ? '<div style="color:var(--color-muted);font-size:var(--font-size-sm);margin-top:2px">' + escHtml(buddy.phone) + '</div>' : '') +
        '<div style="font-size:var(--font-size-xs);color:var(--color-muted);margin-top:var(--space-2)">Last notified: ' + lastNotified + '</div>' +
      '</div>';
    container.appendChild(card);

    // Info card
    var infoCard = document.createElement('div');
    infoCard.className = 'buddy-card';
    infoCard.style.cssText = 'background:var(--color-burg-light);box-shadow:none;border:1.5px solid rgba(140,28,46,0.12);font-size:var(--font-size-sm);color:var(--color-text-light);line-height:var(--line-height-base)';
    infoCard.innerHTML =
      '<div style="font-weight:var(--font-weight-semibold);color:var(--color-burgundy);margin-bottom:var(--space-2)">How it works</div>' +
      escHtml(buddy.name) + ' only receives a message if you miss a <strong>critical dose</strong> by more than ' +
      (buddy.notifyAfterMinutes || 120) + ' minutes. They never see your full schedule.';
    container.appendChild(infoCard);

    // Critical meds preview
    var critMeds = MediPal.Store.getMedications().filter(function (m) { return m.isCritical; });
    if (critMeds.length > 0) {
      var label = document.createElement('div');
      label.className = 'section-label';
      label.style.padding = 'var(--space-5) 0 var(--space-2)';
      label.textContent = 'What ' + buddy.name + ' monitors';
      container.appendChild(label);

      critMeds.forEach(function (med) {
        var todayLog = MediPal.Store.getTodayDoseLog();
        var takenToday = todayLog.some(function (d) {
          return d.medicationId === med.id && d.status === 'taken';
        });

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:var(--space-4);background:var(--color-white);border-radius:var(--radius-lg);padding:var(--space-4);box-shadow:var(--shadow-card);margin-bottom:var(--space-3)';
        row.innerHTML = '<div id="buddy-pill-' + med.id + '"></div>' +
          '<div style="flex:1">' +
            '<div style="font-weight:var(--font-weight-semibold)">' + escHtml(med.name) + '</div>' +
            '<div style="font-size:var(--font-size-sm);color:var(--color-muted)">' + escHtml(med.dosage) + '</div>' +
          '</div>' +
          '<span class="badge ' + (takenToday ? 'badge--success' : 'badge--muted') + '">' +
            (takenToday ? '✓ Taken' : 'Not yet') +
          '</span>';

        MediPal.PillRenderer.render(row.querySelector('#buddy-pill-' + med.id), med, 'sm');
        container.appendChild(row);
      });
    } else {
      var noCrit = document.createElement('div');
      noCrit.style.cssText = 'background:var(--color-white);border-radius:var(--radius-lg);padding:var(--space-4);font-size:var(--font-size-sm);color:var(--color-muted);box-shadow:var(--shadow-card);margin-bottom:var(--space-3)';
      noCrit.textContent = 'No critical medications. Mark a medication as "Critical" to enable buddy notifications.';
      container.appendChild(noCrit);
    }

    // Test message button
    var testBtn = document.createElement('button');
    testBtn.className = 'btn btn--secondary btn--full';
    testBtn.style.marginBottom = 'var(--space-3)';
    testBtn.textContent = '📨 Send test message';
    testBtn.addEventListener('click', function () {
      var firstCrit = critMeds[0] || { name: 'your medication', dosage: '' };
      var link = MediPal.SMS.buildBuddySMSLink(buddy, firstCrit, 130);
      window.open(link, '_blank');
    });
    container.appendChild(testBtn);

    // Edit
    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn--secondary btn--full';
    editBtn.style.marginBottom = 'var(--space-3)';
    editBtn.textContent = '✏️ Edit buddy';
    editBtn.addEventListener('click', function () {
      renderEditForm(container, buddy);
    });
    container.appendChild(editBtn);

    // Remove
    var removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn--danger btn--full';
    removeBtn.textContent = 'Remove buddy';
    removeBtn.addEventListener('click', function () {
      if (confirm('Remove ' + buddy.name + ' as your buddy?')) {
        MediPal.Store.saveBuddy({ enabled: false, name: '', phone: '', notifyAfterMinutes: 120 });
        MediPal.Toast.info('Buddy removed');
        render();
      }
    });
    container.appendChild(removeBtn);
  }

  function renderSetupState(container, buddy) {
    // Explainer
    var explainer = document.createElement('div');
    explainer.className = 'buddy-card';
    explainer.style.cssText = 'font-size:var(--font-size-sm);color:var(--color-text-light);line-height:var(--line-height-base);margin-bottom:var(--space-3)';
    explainer.innerHTML =
      '<div style="font-size:var(--font-size-md);font-weight:var(--font-weight-semibold);margin-bottom:var(--space-3)">💛 What is the Buddy System?</div>' +
      'Add one trusted person — a family member or friend — who will receive a quiet notification <em>only</em> if you miss a critical dose by 2+ hours. ' +
      'They won\'t get nagged, and they won\'t see your full schedule. Just a gentle check-in when it truly matters.';
    container.appendChild(explainer);

    renderEditForm(container, buddy || {});
  }

  function renderEditForm(container, buddy) {
    // Clear any existing form
    var existing = container.querySelector('#buddy-form');
    if (existing) existing.remove();

    var form = document.createElement('div');
    form.id = 'buddy-form';
    form.className = 'buddy-card';
    form.innerHTML =
      '<div class="form-group">' +
        '<label class="form-label" for="buddy-name">Name</label>' +
        '<input class="form-input" type="text" id="buddy-name" placeholder="e.g. Sarah" value="' + escAttr(buddy.name || '') + '" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="buddy-phone">Phone Number</label>' +
        '<input class="form-input" type="tel" id="buddy-phone" placeholder="+1 555 000 0000" value="' + escAttr(buddy.phone || '') + '" />' +
        '<div class="form-hint">Used to send an SMS if a critical dose is missed</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="buddy-delay">Notify after how long?</label>' +
        '<select class="form-input" id="buddy-delay">' +
          '<option value="60" ' + ((buddy.notifyAfterMinutes || 120) === 60 ? 'selected' : '') + '>1 hour</option>' +
          '<option value="120" ' + ((buddy.notifyAfterMinutes || 120) === 120 ? 'selected' : '') + '>2 hours</option>' +
          '<option value="180" ' + ((buddy.notifyAfterMinutes || 120) === 180 ? 'selected' : '') + '>3 hours</option>' +
          '<option value="240" ' + ((buddy.notifyAfterMinutes || 120) === 240 ? 'selected' : '') + '>4 hours</option>' +
        '</select>' +
      '</div>' +
      '<button class="btn btn--primary btn--full btn--lg" id="buddy-save">Save Buddy</button>';

    container.appendChild(form);

    form.querySelector('#buddy-save').addEventListener('click', function () {
      var name = form.querySelector('#buddy-name').value.trim();
      var phone = form.querySelector('#buddy-phone').value.trim();
      var delay = parseInt(form.querySelector('#buddy-delay').value, 10);
      if (!name) { MediPal.Toast.error('Please enter a name'); return; }
      if (!phone) { MediPal.Toast.error('Please enter a phone number'); return; }
      MediPal.Store.saveBuddy({
        enabled: true,
        name: name,
        phone: phone,
        notifyAfterMinutes: delay,
        lastNotifiedAt: buddy.lastNotifiedAt || null
      });
      MediPal.Toast.success(name + ' saved as your buddy 💛');
      render();
    });
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  return { render };
})();
