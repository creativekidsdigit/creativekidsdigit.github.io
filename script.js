/* Fearless Creations — minimal interactions */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Mobile nav toggle ----------
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('primary-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close menu when a link is tapped on mobile
    menu.addEventListener('click', function (e) {
      var target = e.target;
      if (target.tagName === 'A' && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Tiny cart counter for "Add to cart" placeholders ----------
  var cartCount = document.querySelector('.cart-count');
  var count = 0;
  document.querySelectorAll('.product .btn-soft').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      count += 1;
      if (cartCount) cartCount.textContent = String(count);
      var original = btn.textContent;
      btn.textContent = 'Added \u2713';
      setTimeout(function () { btn.textContent = original; }, 1400);
    });
  });

  // ---------- FAQ accordion (single open at a time) ----------
  var faqs = document.querySelectorAll('.faq details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) {
        faqs.forEach(function (other) {
          if (other !== d) other.open = false;
        });
      }
    });
  });

  // ---------- Header shadow on scroll ----------
  var header = document.querySelector('.site-header');
  if (header) {
    var setHeaderState = function () {
      if (window.scrollY > 8) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    setHeaderState();
    window.addEventListener('scroll', setHeaderState, { passive: true });
  }

  // ---------- Back to top ----------
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    var setBackToTop = function () {
      var show = window.scrollY > 600;
      backToTop.classList.toggle('is-visible', show);
      backToTop.hidden = !show;
    };
    setBackToTop();
    window.addEventListener('scroll', setBackToTop, { passive: true });
    backToTop.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });
  }

  // ---------- Reveal on scroll ----------
  // Add data-reveal to opt in. We auto-tag common content blocks below.
  var revealSelectors = [
    '.section-head',
    '.benefit',
    '.lesson-product',
    '.cat-card',
    '.testimonial',
    '.method-item',
    '.lead-magnet',
    '.final-cta-home',
    '.about',
    '.stat',
    '.footer-trust'
  ];
  var revealTargets = document.querySelectorAll(revealSelectors.join(','));

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { el.classList.add('is-revealed'); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('reveal'); });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(function (el) { observer.observe(el); });
  }

  // ---------- Smooth-scroll active section highlight in nav ----------
  var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  var sections = [];
  navLinks.forEach(function (a) {
    var id = a.getAttribute('href');
    if (id && id.length > 1) {
      var sec = document.querySelector(id);
      if (sec) sections.push({ link: a, section: sec });
    }
  });
  if (sections.length && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          sections.forEach(function (s) {
            if (s.link.classList.contains('cart-btn')) return;
            s.link.classList.toggle('is-active', s.section === entry.target);
          });
        }
      });
    }, { threshold: 0.4, rootMargin: '-30% 0px -50% 0px' });
    sections.forEach(function (s) { navObserver.observe(s.section); });
  }

  // ---------- Mobile sticky CTA ----------
  var mobileCta = document.querySelector('.mobile-cta');
  var hero = document.querySelector('.hero');
  if (mobileCta && hero) {
    mobileCta.hidden = false;
    var setMobileCta = function () {
      var heroBottom = hero.getBoundingClientRect().bottom;
      var nearFooter = false;
      var footer = document.querySelector('.site-footer');
      if (footer) {
        var fr = footer.getBoundingClientRect();
        nearFooter = fr.top < (window.innerHeight - 60);
      }
      var show = heroBottom < 60 && !nearFooter;
      mobileCta.classList.toggle('is-visible', show);
    };
    setMobileCta();
    window.addEventListener('scroll', setMobileCta, { passive: true });
    window.addEventListener('resize', setMobileCta);
  }

  // ---------- Animated count-up for the stats strip ----------
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    var animate = function (el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10);
      if (isNaN(target)) return;
      if (prefersReducedMotion) { el.textContent = String(target); return; }
      var start = null;
      var duration = 1100;
      var step = function (ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      var statObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animate(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { statObserver.observe(el); });
    } else {
      counters.forEach(animate);
    }
  }
})();
