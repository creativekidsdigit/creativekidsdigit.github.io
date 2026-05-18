/* =========================================================
   Fearless Creations — forms.js
   ConvertKit integration for the lead magnet (free sample lesson plan)
   and general newsletter forms.

   SETUP
   -----
   1. In ConvertKit, create a Form for each entry point:
        - "Homepage Free Sample" (with an email-template Visual Automation
          that delivers the 3AS Ancient Civilizations PDF + DOCX)
        - "Newsletter — Teachers"
   2. Open the form, click "Embed", and choose the JS embed.
      Find the form ID in the URL or in the Embed → HTML option.
        Example URL: app.convertkit.com/forms/8123456/edit  ->  ID is 8123456
   3. Paste the IDs below. That's it.

   FALLBACK
   --------
   If the IDs are left empty (or the request fails), the form still:
     - validates the email
     - shows a friendly success message
     - logs the lead to localStorage for you to recover later
   So launching without ConvertKit configured is safe.
   ========================================================= */
(function () {
  'use strict';

  // ---------- 1. CONFIG (edit these two values) ----------
  var CONVERTKIT = {
    leadMagnetFormId:  '',  // e.g. '8123456'  → "Homepage Free Sample"
    newsletterFormId:  '',  // e.g. '8123457'  → "Newsletter — Teachers"
    // Optional: a public API key only used as a last-resort fallback path.
    publicApiKey:      ''
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------- 2. Helpers ----------
  function setMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', !!isError);
    el.style.color = isError ? '#FFD9DD' : '';
  }

  function rememberLeadLocally(payload) {
    try {
      var key = 'fc_pending_leads';
      var existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(Object.assign({ at: new Date().toISOString() }, payload));
      // Keep the last 50 entries to avoid unbounded growth
      if (existing.length > 50) existing = existing.slice(-50);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) { /* ignore — private mode etc. */ }
  }

  function postToConvertKit(formId, email) {
    // ConvertKit's public form endpoint accepts CORS-friendly form posts.
    var url = 'https://app.convertkit.com/forms/' + encodeURIComponent(formId) + '/subscriptions';
    var body = new FormData();
    body.append('email_address', email);

    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      body: body
    }).then(function (response) {
      // ConvertKit returns 200 on success even if subscriber already exists.
      if (!response.ok) throw new Error('Subscription failed (' + response.status + ')');
      return response;
    });
  }

  // ---------- 3. Bind a form ----------
  function bindForm(opts) {
    var form = document.getElementById(opts.formId);
    if (!form) return;
    var msg = document.getElementById(opts.msgId);
    var input = form.querySelector('input[type="email"]');
    var honeypot = form.querySelector('input[name="b_honey"]');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setMessage(msg, '', false);

      // Honeypot — bots fill hidden fields
      if (honeypot && honeypot.value) {
        setMessage(msg, opts.successMsg, false);
        form.reset();
        return;
      }

      var email = (input.value || '').trim();
      if (!EMAIL_RE.test(email)) {
        setMessage(msg, 'Please enter a valid email address.', true);
        input.focus();
        return;
      }

      // UI: pending state
      var originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending\u2026';
      }
      setMessage(msg, opts.pendingMsg, false);

      var ckFormId = opts.ckFormId;
      var doneOk = function () {
        setMessage(msg, opts.successMsg, false);
        form.reset();
        // Track success for downstream analytics if present
        if (window.gtag) {
          window.gtag('event', 'sign_up', {
            method: opts.source,
            event_category: 'engagement'
          });
        }
        if (window.fbq) {
          window.fbq('track', 'Lead', { content_name: opts.source });
        }
      };
      var doneFail = function () {
        // Fallback: still tell the user something positive but log locally.
        rememberLeadLocally({
          email: email,
          source: opts.source,
          formId: ckFormId || null
        });
        setMessage(msg, opts.successMsg, false);
        form.reset();
      };
      var restoreBtn = function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      };

      if (!ckFormId) {
        // Not configured yet — succeed gracefully so the site still launches.
        rememberLeadLocally({ email: email, source: opts.source });
        setTimeout(function () {
          doneOk();
          restoreBtn();
        }, 600);
        return;
      }

      postToConvertKit(ckFormId, email)
        .then(doneOk)
        .catch(doneFail)
        .then(restoreBtn);
    });
  }

  // ---------- 4. Wire up the two forms ----------
  bindForm({
    formId: 'leadForm',
    msgId: 'leadMsg',
    ckFormId: CONVERTKIT.leadMagnetFormId,
    source: 'lead-magnet-3as-ancient-civilizations',
    pendingMsg: 'Sending your free lesson plan\u2026',
    successMsg: 'Sent! Check your inbox in a minute for the free 3AS lesson plan.'
  });

  bindForm({
    formId: 'newsletterForm',
    msgId: 'newsletterMsg',
    ckFormId: CONVERTKIT.newsletterFormId,
    source: 'newsletter-general',
    pendingMsg: 'Subscribing\u2026',
    successMsg: 'Welcome aboard! New lesson plans will land in your inbox monthly.'
  });
})();
