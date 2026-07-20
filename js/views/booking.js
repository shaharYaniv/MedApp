window.MediPal = window.MediPal || {};
window.MediPal.Views = window.MediPal.Views || {};

MediPal.Views.Booking = (function () {
  function render() {
    var content = document.getElementById('app-content');
    content.innerHTML = '';
    content.className = 'view-enter';

    var booking = MediPal.Store.getBooking();

    var header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML =
      '<div class="view-header__titles">' +
        '<div class="view-header__eyebrow">Appointments</div>' +
        '<h1 class="view-header__title">Book a Visit</h1>' +
        '<div class="view-header__subtitle">' +
          (booking.url ? 'Live availability from Google Calendar' : 'Connect your Google Calendar booking page') +
        '</div>' +
      '</div>';
    content.appendChild(header);

    var view = document.createElement('div');
    view.className = 'view-content';
    view.style.paddingTop = '0';
    content.appendChild(view);

    if (booking.url) {
      renderBookingState(view, booking);
    } else {
      renderSetupState(view, booking);
    }
  }

  // ── Active state: embedded Google booking page ────────────────────
  function renderBookingState(container, booking) {
    var frameWrap = document.createElement('div');
    frameWrap.className = 'booking-frame';

    var iframe = document.createElement('iframe');
    iframe.className = 'booking-frame__iframe';
    iframe.src = toEmbedUrl(booking.url);
    iframe.setAttribute('title', 'Book an appointment');
    iframe.setAttribute('loading', 'lazy');
    frameWrap.appendChild(iframe);
    container.appendChild(frameWrap);

    // Some browsers block Google's booking page inside iframes —
    // always offer a direct link as fallback.
    var openBtn = document.createElement('a');
    openBtn.className = 'btn btn--primary btn--full';
    openBtn.style.marginTop = 'var(--space-4)';
    openBtn.href = booking.url;
    openBtn.target = '_blank';
    openBtn.rel = 'noopener';
    openBtn.textContent = '📅 Open booking page in a new tab';
    container.appendChild(openBtn);

    var infoCard = document.createElement('div');
    infoCard.className = 'buddy-card';
    infoCard.style.cssText = 'margin-top:var(--space-4);background:var(--color-burg-light);box-shadow:none;border:1.5px solid rgba(140,28,46,0.12);font-size:var(--font-size-sm);color:var(--color-text-light);line-height:var(--line-height-base)';
    infoCard.innerHTML =
      '<div style="font-weight:var(--font-weight-semibold);color:var(--color-burgundy);margin-bottom:var(--space-2)">Synced with Google Calendar</div>' +
      'Only open slots inside your business hours are shown. Times that are busy on your calendar — or outside the hours you set in Google Calendar — appear as unavailable automatically. Every booking lands straight in your calendar.';
    container.appendChild(infoCard);

    var changeBtn = document.createElement('button');
    changeBtn.className = 'btn btn--secondary btn--full';
    changeBtn.style.marginTop = 'var(--space-3)';
    changeBtn.textContent = '✏️ Change booking link';
    changeBtn.addEventListener('click', function () {
      MediPal.Store.saveBooking({ url: '' });
      render();
    });
    container.appendChild(changeBtn);
  }

  // ── Setup state: instructions + link form ─────────────────────────
  function renderSetupState(container, booking) {
    var explainer = document.createElement('div');
    explainer.className = 'buddy-card';
    explainer.style.cssText = 'font-size:var(--font-size-sm);color:var(--color-text-light);line-height:var(--line-height-base);margin-bottom:var(--space-3)';
    explainer.innerHTML =
      '<div style="font-size:var(--font-size-md);font-weight:var(--font-weight-semibold);margin-bottom:var(--space-3)">📅 Google Calendar booking</div>' +
      'Show clients your real availability and let them book directly into your Google Calendar. ' +
      'Google hides any time that is already busy or outside your business hours — no double bookings.' +
      '<ol style="list-style:decimal;margin:var(--space-3) 0 0;padding-left:var(--space-5)">' +
        '<li style="margin-bottom:var(--space-2)">Open <strong>Google Calendar</strong> (on a computer) and click <strong>Create → Appointment schedule</strong>.</li>' +
        '<li style="margin-bottom:var(--space-2)">Set your <strong>business hours</strong>, visit length, and breaks.</li>' +
        '<li style="margin-bottom:var(--space-2)">Under availability, keep <strong>"Check calendars for availability"</strong> on, so busy times are hidden.</li>' +
        '<li style="margin-bottom:var(--space-2)">Save, click <strong>Share</strong> on the schedule, and copy the booking page <strong>link</strong>.</li>' +
        '<li>Paste the link below.</li>' +
      '</ol>';
    container.appendChild(explainer);

    var form = document.createElement('div');
    form.className = 'buddy-card';
    form.innerHTML =
      '<div class="form-group">' +
        '<label class="form-label" for="booking-url">Booking page link</label>' +
        '<input class="form-input" type="url" id="booking-url" placeholder="https://calendar.app.google/..." value="' + escAttr(booking.url || '') + '" />' +
        '<div class="form-hint">Looks like calendar.app.google/… or calendar.google.com/…/appointments/…</div>' +
      '</div>' +
      '<button class="btn btn--primary btn--full btn--lg" id="booking-save">Connect booking page</button>';
    container.appendChild(form);

    form.querySelector('#booking-save').addEventListener('click', function () {
      var url = form.querySelector('#booking-url').value.trim();
      if (!isValidBookingUrl(url)) {
        MediPal.Toast.error('Please paste a Google Calendar booking link');
        return;
      }
      MediPal.Store.saveBooking({ url: url });
      MediPal.Toast.success('Booking page connected 📅');
      render();
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function isValidBookingUrl(url) {
    var parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return false;
    }
    if (parsed.protocol !== 'https:') return false;
    return parsed.hostname === 'calendar.app.google' ||
           parsed.hostname === 'calendar.google.com';
  }

  // Google's embed snippet uses ?gv=true on calendar.google.com URLs
  function toEmbedUrl(url) {
    try {
      var parsed = new URL(url);
      if (parsed.hostname === 'calendar.google.com' && !parsed.searchParams.has('gv')) {
        parsed.searchParams.set('gv', 'true');
        return parsed.toString();
      }
    } catch (e) { /* fall through */ }
    return url;
  }

  function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  return { render };
})();
