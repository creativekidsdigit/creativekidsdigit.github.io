/* Fearless Creations — minimal interactions */
(function () {
  'use strict';

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('primary-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close menu when a link is tapped on mobile
    menu.addEventListener('click', function (e) {
      const target = e.target;
      if (target.tagName === 'A' && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Tiny cart counter for "Add to cart" placeholder buttons
  const cartCount = document.querySelector('.cart-count');
  let count = 0;
  document.querySelectorAll('.product .btn-soft').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      count += 1;
      if (cartCount) cartCount.textContent = String(count);
      btn.textContent = 'Added \u2713';
      setTimeout(function () { btn.textContent = 'Add to cart'; }, 1400);
    });
  });

  // Close any open FAQ when another is opened (clean accordion feel)
  const faqs = document.querySelectorAll('.faq details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) {
        faqs.forEach(function (other) {
          if (other !== d) other.open = false;
        });
      }
    });
  });
})();
