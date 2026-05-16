// Fearless Creations — small interactions
(function () {
  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav__toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    // Close on link click (mobile)
    nav.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Newsletter (Mailchimp) — light client-side validation + friendly status.
  // The form posts directly to Mailchimp via its action URL. We do NOT preventDefault
  // on success, so the user is taken to Mailchimp's confirmation page (in a new tab).
  var form = document.querySelector('.mc-form');
  var note = document.getElementById('newsletter-note');
  if (form && note) {
    var defaultMessage = note.textContent;

    form.addEventListener('submit', function (e) {
      var input = form.querySelector('input[type="email"]');
      var value = (input && input.value || '').trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      note.classList.remove('is-success', 'is-error');

      if (!emailOk) {
        e.preventDefault();
        note.textContent = 'Please enter a valid email so we can send your free pack.';
        note.classList.add('is-error');
        if (input) input.focus();
        return;
      }

      // Let Mailchimp handle the actual subscribe (form opens in a new tab via target="_blank").
      note.textContent = 'Opening Mailchimp to confirm your subscription…';
      note.classList.add('is-success');

      // Reset the field shortly after, and restore the helper text.
      window.setTimeout(function () {
        try { form.reset(); } catch (_) {}
      }, 400);
      window.setTimeout(function () {
        note.classList.remove('is-success', 'is-error');
        note.textContent = defaultMessage;
      }, 6000);
    });
  }

  // Subtle reveal on scroll
  if ('IntersectionObserver' in window) {
    var revealTargets = document.querySelectorAll(
      '.section__head, .collection__head, .cat, .product, .quote, .testimonials__stats > div, .newsletter__card'
    );
    revealTargets.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      el.style.transition = 'opacity .6s ease, transform .6s ease';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(function (el) { io.observe(el); });
  }
})();
