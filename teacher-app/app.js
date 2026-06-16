/* =========================================================================
   App entry point: hash router. Dispatches to views/views.js.
   ========================================================================= */

(function () {
  var container = document.getElementById('app');

  // Route table: pattern → handler
  // Patterns can include :param placeholders.
  var routes = [
    { pattern: '#/',                      view: function (c, p) { Views.dashboard(c, p); } },
    { pattern: '#/lessons',               view: function (c, p) { Views.lessonsList(c, p); } },
    { pattern: '#/lessons/new',           view: function (c, p) { Views.lessonBuilder(c, p); } },
    { pattern: '#/lessons/:id/edit',      view: function (c, p) { Views.lessonBuilder(c, p); } },
    { pattern: '#/lessons/:id',           view: function (c, p) { Views.lessonView(c, p); } },
    { pattern: '#/weeks',                 view: function (c, p) { Views.weeksList(c, p); } },
    { pattern: '#/weeks/new',             view: function (c, p) { Views.weekEditor(c, p); } },
    { pattern: '#/weeks/:id',             view: function (c, p) { Views.weekEditor(c, p); } },
    { pattern: '#/activities',            view: function (c, p) { Views.activitiesList(c, p); } },
    { pattern: '#/activities/:id',        view: function (c, p) { Views.activityDetail(c, p); } },
    { pattern: '#/problems',              view: function (c, p) { Views.problemsList(c, p); } },
    { pattern: '#/problems/:id',          view: function (c, p) { Views.problemDetail(c, p); } }
  ];

  function matchRoute(hash) {
    if (!hash || hash === '#' || hash === '#/') {
      return { handler: routes[0].view, params: {} };
    }
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      var patternParts = r.pattern.split('/');
      var hashParts = hash.split('/');
      if (patternParts.length !== hashParts.length) continue;
      var params = {};
      var ok = true;
      for (var j = 0; j < patternParts.length; j++) {
        var p = patternParts[j], h = hashParts[j];
        if (p.charAt(0) === ':') {
          params[p.slice(1)] = h;
        } else if (p !== h) {
          ok = false;
          break;
        }
      }
      if (ok) return { handler: r.view, params: params };
    }
    return null;
  }

  function setActiveNav(hash) {
    var topRoute = '#/';
    if (hash.indexOf('#/lessons') === 0) topRoute = '#/lessons';
    else if (hash.indexOf('#/weeks') === 0) topRoute = '#/weeks';
    else if (hash.indexOf('#/activities') === 0) topRoute = '#/activities';
    else if (hash.indexOf('#/problems') === 0) topRoute = '#/problems';

    var links = document.querySelectorAll('.primary-nav a');
    Array.prototype.forEach.call(links, function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === topRoute);
    });
  }

  function dispatch() {
    var hash = window.location.hash || '#/';
    setActiveNav(hash);
    var matched = matchRoute(hash);
    if (matched) {
      try {
        matched.handler(container, matched.params);
      } catch (e) {
        console.error('View render error:', e);
        container.innerHTML = '<div class="empty-state"><h3>Something went wrong</h3><p class="muted">' + (e && e.message) + '</p><p><a href="#/">Back to dashboard</a></p></div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>Page not found</h3><p>Unknown route: <code>' + hash + '</code></p><p><a href="#/">Back to dashboard</a></p></div>';
    }
    window.scrollTo(0, 0);
  }

  // Print button on the topbar — context aware.
  document.getElementById('printBtn').addEventListener('click', function () {
    window.print();
  });

  window.addEventListener('hashchange', dispatch);
  dispatch();
})();
