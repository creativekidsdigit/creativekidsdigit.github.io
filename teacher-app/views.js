/* =========================================================================
   Views: each function returns HTML and optionally wires events after render.
   The router calls render(container, params) for the active route.
   ========================================================================= */

window.Views = (function () {

  // ===== Helpers =====
  function escape(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function nl2br(s) {
    return escape(s).replace(/\n/g, '<br>');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function on(selector, event, handler, root) {
    var el = (root || document).querySelector(selector);
    if (el) el.addEventListener(event, handler);
  }
  function onAll(selector, event, handler, root) {
    var els = (root || document).querySelectorAll(selector);
    Array.prototype.forEach.call(els, function (el) {
      el.addEventListener(event, handler);
    });
  }

  function go(hash) { window.location.hash = hash; }

  // =========================================================================
  // Dashboard
  // =========================================================================
  function dashboard(container) {
    var lessons = Storage.getLessons();
    var weeks = Storage.getWeeks();
    var recentLessons = lessons.slice(0, 5);

    container.innerHTML = '' +
      '<h1>Welcome to your Lesson Planner</h1>' +
      '<p class="muted">A simple, distraction-free planner for novice teachers. Everything is saved in your browser.</p>' +

      '<div class="card-row" style="margin-top:1.5rem;">' +
        '<a class="tile" href="#/lessons/new"><span class="tile-icon">📝</span><h3>New lesson plan</h3><p>Build a 45-minute lesson, step by step.</p></a>' +
        '<a class="tile" href="#/weeks/new"><span class="tile-icon">📅</span><h3>Plan your week</h3><p>One grid for Monday through Friday.</p></a>' +
        '<a class="tile" href="#/activities"><span class="tile-icon">🎯</span><h3>Find an activity</h3><p>15 ready-to-use classroom activities.</p></a>' +
        '<a class="tile" href="#/problems"><span class="tile-icon">🚨</span><h3>Solve a problem</h3><p>Scripts for behavior, focus, and bad days.</p></a>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:2rem;">' +
        '<section>' +
          '<h2>Recent lesson plans</h2>' +
          (recentLessons.length === 0
            ? '<div class="empty-state"><p class="muted">No lesson plans yet. <a href="#/lessons/new">Create your first.</a></p></div>'
            : recentLessons.map(function (l) {
                return '<div class="list-item">' +
                  '<div class="list-item-main">' +
                    '<div class="list-item-title"><a href="#/lessons/' + l.id + '">' + (escape(l.topic) || '<em>(untitled)</em>') + '</a></div>' +
                    '<div class="list-item-meta">' + escape(l.className || '—') + ' · ' + formatDate(l.date) + '</div>' +
                  '</div>' +
                '</div>';
              }).join('')) +
        '</section>' +
        '<section>' +
          '<h2>Saved weeks</h2>' +
          (weeks.length === 0
            ? '<div class="empty-state"><p class="muted">No weeks yet. <a href="#/weeks/new">Plan your first week.</a></p></div>'
            : weeks.slice(0, 5).map(function (w) {
                return '<div class="list-item">' +
                  '<div class="list-item-main">' +
                    '<div class="list-item-title"><a href="#/weeks/' + w.id + '">Week of ' + formatDate(w.startDate) + '</a></div>' +
                    '<div class="list-item-meta">' + escape(w.className || '—') + '</div>' +
                  '</div>' +
                '</div>';
              }).join('')) +
        '</section>' +
      '</div>';
  }

  // =========================================================================
  // Lessons list
  // =========================================================================
  function lessonsList(container) {
    var lessons = Storage.getLessons();
    container.innerHTML = '' +
      '<div class="page-head">' +
        '<h1>Lesson Plans</h1>' +
        '<div class="page-actions"><a href="#/lessons/new" class="btn">+ New lesson plan</a></div>' +
      '</div>' +
      (lessons.length === 0
        ? '<div class="empty-state">' +
            '<h3>No lesson plans yet</h3>' +
            '<p>Click <a href="#/lessons/new">+ New lesson plan</a> to build your first one.</p>' +
            '<p class="muted">It takes about 10 minutes the first time. After that, 5.</p>' +
          '</div>'
        : '<div class="lessons-list">' + lessons.map(function (l) {
            return '<div class="list-item">' +
              '<div class="list-item-main">' +
                '<div class="list-item-title"><a href="#/lessons/' + l.id + '">' + (escape(l.topic) || '<em>(untitled)</em>') + '</a></div>' +
                '<div class="list-item-meta">' + escape(l.className || '—') + ' · ' + formatDate(l.date) + ' · ' + (l.duration || 45) + ' min</div>' +
              '</div>' +
              '<div class="list-item-actions">' +
                '<a href="#/lessons/' + l.id + '" class="btn btn-soft btn-sm">View</a>' +
                '<a href="#/lessons/' + l.id + '/edit" class="btn btn-soft btn-sm">Edit</a>' +
                '<button class="btn btn-danger btn-sm" data-delete="' + l.id + '">Delete</button>' +
              '</div>' +
            '</div>';
          }).join('') + '</div>');

    onAll('[data-delete]', 'click', function (e) {
      var id = e.target.getAttribute('data-delete');
      var lesson = Storage.getLesson(id);
      if (!lesson) return;
      if (confirm('Delete the lesson plan "' + (lesson.topic || 'untitled') + '"? This cannot be undone.')) {
        Storage.deleteLesson(id);
        lessonsList(container);
      }
    });
  }

  // =========================================================================
  // Lesson builder (multi-step wizard)
  // =========================================================================
  var WIZARD_STEPS = [
    { key: 'basics', title: 'Basics' },
    { key: 'objective', title: 'Objective' },
    { key: 'materials', title: 'Materials' },
    { key: 'hook', title: 'Hook' },
    { key: 'main', title: 'Main Activity' },
    { key: 'check', title: 'Check' },
    { key: 'wrap', title: 'Wrap-Up' },
    { key: 'review', title: 'Review & Save' }
  ];

  function lessonBuilder(container, params) {
    var lesson;
    if (params && params.id) {
      lesson = Storage.getLesson(params.id);
      if (!lesson) {
        container.innerHTML = '<p>Lesson not found. <a href="#/lessons">Back to list</a></p>';
        return;
      }
    } else {
      lesson = Storage.blankLesson();
    }
    var stepIndex = 0;

    function render() {
      var step = WIZARD_STEPS[stepIndex];

      var progress = '<div class="wizard-progress">' + WIZARD_STEPS.map(function (s, i) {
        var cls = 'wizard-step';
        if (i === stepIndex) cls += ' is-current';
        else if (i < stepIndex) cls += ' is-done';
        return '<div class="' + cls + '">' + (i + 1) + '. ' + s.title + '</div>';
      }).join('') + '</div>';

      var body = '';
      switch (step.key) {
        case 'basics':
          body = '' +
            '<h2>Step 1: Lesson basics</h2>' +
            '<p class="muted">Who, when, what topic. Keep it short.</p>' +
            '<div class="form-grid-2">' +
              '<div class="form-group"><label>Date</label><input type="date" id="f_date" value="' + escape(lesson.date) + '"></div>' +
              '<div class="form-group"><label>Class / Group</label><input type="text" id="f_class" value="' + escape(lesson.className) + '" placeholder="e.g. 2AS-B"></div>' +
            '</div>' +
            '<div class="form-grid-2">' +
              '<div class="form-group"><label>Topic</label><input type="text" id="f_topic" value="' + escape(lesson.topic) + '" placeholder="e.g. Reported Speech (intro)"><span class="form-help">If you can\'t summarize the topic in 4 words, the lesson is too big.</span></div>' +
              '<div class="form-group"><label>Duration (minutes)</label><input type="number" id="f_duration" value="' + escape(lesson.duration) + '" min="15" max="180"></div>' +
            '</div>';
          break;

        case 'objective':
          body = '' +
            '<h2>Step 2: The lesson objective</h2>' +
            '<p class="muted">Finish the sentence. The verb must be something you can SEE students do.</p>' +
            '<div class="form-group">' +
              '<label>By the end of this lesson, students will be able to…</label>' +
              '<textarea id="f_objective" rows="3" placeholder="e.g. transform 5 direct-speech sentences into reported speech.">' + escape(lesson.objective) + '</textarea>' +
              '<span class="form-help">Good verbs: write, list, identify, compare, explain, build, perform, draw, produce, choose. ' +
              'Avoid: understand, know, learn, appreciate, be aware of.</span>' +
            '</div>';
          break;

        case 'materials':
          body = '' +
            '<h2>Step 3: Materials needed</h2>' +
            '<p class="muted">Be specific. Anything not ready by 7:30am is your job at 7:31am.</p>' +
            '<div class="form-group">' +
              '<label>Materials list (one per line)</label>' +
              '<textarea id="f_materials" rows="6" placeholder="30 photocopies of Worksheet 4&#10;Whiteboard markers (red + blue)&#10;Phone for the audio clip">' + escape(lesson.materials) + '</textarea>' +
            '</div>';
          break;

        case 'hook':
          body = '' +
            '<h2>Step 4: The hook (first 3 minutes)</h2>' +
            '<p class="muted">How will you grab attention? "Write the date and the title" is not a hook.</p>' +
            '<div class="form-grid-2">' +
              '<div class="form-group"><label>Hook duration (minutes)</label><input type="number" id="f_hookDuration" value="' + escape(lesson.hookDuration) + '" min="1" max="10"></div>' +
              '<div class="form-group"></div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>What is the hook?</label>' +
              '<textarea id="f_hookDescription" rows="4" placeholder="e.g. Show a 30-second clip of a news anchor reporting what the president said. Question on the board: Why didn\'t they say it the same way?">' + escape(lesson.hookDescription) + '</textarea>' +
              '<span class="form-help">Ideas: short video, surprising statistic, physical demo, photo with no caption, controversial question.</span>' +
            '</div>';
          break;

        case 'main':
          body = '' +
            '<h2>Step 5: Main activity (I do · We do · You do)</h2>' +
            '<p class="muted">You demonstrate, then they help, then they do it alone.</p>' +
            '<div class="form-grid-2">' +
              '<div class="form-group"><label>I do — duration (min)</label><input type="number" id="f_iDoDuration" value="' + escape(lesson.iDoDuration) + '" min="1" max="20"></div>' +
              '<div class="form-group"></div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>I do — what you demonstrate</label>' +
              '<textarea id="f_iDoDescription" rows="3" placeholder="Demo on board: She said \'I am tired.\' → She said she was tired. Think aloud the tense shift.">' + escape(lesson.iDoDescription) + '</textarea>' +
            '</div>' +
            '<div class="form-grid-2">' +
              '<div class="form-group"><label>We do — duration (min)</label><input type="number" id="f_weDoDuration" value="' + escape(lesson.weDoDuration) + '" min="1" max="20"></div>' +
              '<div class="form-group"></div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>We do — what students help with</label>' +
              '<textarea id="f_weDoDescription" rows="3" placeholder="New example. Students dictate the steps. Write what they say on the board.">' + escape(lesson.weDoDescription) + '</textarea>' +
            '</div>' +
            '<div class="form-grid-2">' +
              '<div class="form-group"><label>You do — duration (min)</label><input type="number" id="f_youDoDuration" value="' + escape(lesson.youDoDuration) + '" min="1" max="30"></div>' +
              '<div class="form-group"></div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>You do — what students do alone or in pairs</label>' +
              '<textarea id="f_youDoDescription" rows="3" placeholder="Worksheet 4: 5 sentences. Pairs. I walk and check.">' + escape(lesson.youDoDescription) + '</textarea>' +
            '</div>';
          break;

        case 'check':
          body = '' +
            '<h2>Step 6: Check for understanding</h2>' +
            '<p class="muted">How will you know if they got it? Pick ONE method.</p>' +
            '<div class="form-group">' +
              '<label>Method</label>' +
              '<select id="f_checkMethod">' +
                '<option value="exit-ticket"' + (lesson.checkMethod === 'exit-ticket' ? ' selected' : '') + '>Exit ticket (one question on a sticky note)</option>' +
                '<option value="whiteboard"' + (lesson.checkMethod === 'whiteboard' ? ' selected' : '') + '>Whiteboard show-me</option>' +
                '<option value="thumbs"' + (lesson.checkMethod === 'thumbs' ? ' selected' : '') + '>Thumbs up / sideways / down</option>' +
                '<option value="one-word"' + (lesson.checkMethod === 'one-word' ? ' selected' : '') + '>One-word check-in</option>' +
                '<option value="3-2-1"' + (lesson.checkMethod === '3-2-1' ? ' selected' : '') + '>3-2-1 reflection</option>' +
                '<option value="other"' + (lesson.checkMethod === 'other' ? ' selected' : '') + '>Other (describe below)</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>What you are looking for</label>' +
              '<textarea id="f_checkDescription" rows="3" placeholder="e.g. Sticky note: Rewrite this sentence — \'They said: We are happy.\'">' + escape(lesson.checkDescription) + '</textarea>' +
            '</div>';
          break;

        case 'wrap':
          body = '' +
            '<h2>Step 7: Wrap-up & homework</h2>' +
            '<p class="muted">Last 5 minutes. Calm energy. Bell does not dismiss the class — you do.</p>' +
            '<div class="form-group">' +
              '<label>Recall question</label>' +
              '<input type="text" id="f_wrapUpRecall" value="' + escape(lesson.wrapUpRecall) + '" placeholder="e.g. Tell your partner: what is the rule we used today?">' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Preview of tomorrow</label>' +
              '<input type="text" id="f_wrapUpPreview" value="' + escape(lesson.wrapUpPreview) + '" placeholder="e.g. Tomorrow you will write a 5-sentence news report.">' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Homework (optional)</label>' +
              '<textarea id="f_homework" rows="2" placeholder="e.g. Worksheet 4 questions 6-10.">' + escape(lesson.homework) + '</textarea>' +
            '</div>';
          break;

        case 'review':
          body = '' +
            '<h2>Step 8: Review and save</h2>' +
            '<p class="muted">Quick check before saving.</p>' +
            renderLessonView(lesson, true) +
            '<p class="muted" style="margin-top:1rem;">Save this lesson? You can edit anything later.</p>';
          break;
      }

      var prevBtn = stepIndex > 0
        ? '<button class="btn btn-soft" id="prevBtn">← Back</button>'
        : '<a href="#/lessons" class="btn btn-soft">Cancel</a>';

      var nextBtn;
      if (stepIndex < WIZARD_STEPS.length - 1) {
        nextBtn = '<button class="btn" id="nextBtn">Next →</button>';
      } else {
        nextBtn = '<button class="btn btn-accent" id="saveBtn">💾 Save lesson plan</button>';
      }

      container.innerHTML = '' +
        '<div class="page-head"><h1>' + (lesson.id ? 'Edit lesson plan' : 'New lesson plan') + '</h1></div>' +
        progress +
        '<div class="card">' + body + '</div>' +
        '<div class="wizard-actions">' + prevBtn + nextBtn + '</div>';

      on('#prevBtn', 'click', function () { collectStep(); stepIndex--; render(); });
      on('#nextBtn', 'click', function () {
        if (!collectStep()) return;
        stepIndex++;
        render();
      });
      on('#saveBtn', 'click', function () {
        collectStep();
        var saved = Storage.saveLesson(lesson);
        go('#/lessons/' + saved.id);
      });
    }

    function collectStep() {
      var step = WIZARD_STEPS[stepIndex];
      switch (step.key) {
        case 'basics':
          lesson.date = document.getElementById('f_date').value;
          lesson.className = document.getElementById('f_class').value.trim();
          lesson.topic = document.getElementById('f_topic').value.trim();
          lesson.duration = parseInt(document.getElementById('f_duration').value, 10) || 45;
          break;
        case 'objective':
          lesson.objective = document.getElementById('f_objective').value.trim();
          break;
        case 'materials':
          lesson.materials = document.getElementById('f_materials').value;
          break;
        case 'hook':
          lesson.hookDuration = parseInt(document.getElementById('f_hookDuration').value, 10) || 3;
          lesson.hookDescription = document.getElementById('f_hookDescription').value;
          break;
        case 'main':
          lesson.iDoDuration = parseInt(document.getElementById('f_iDoDuration').value, 10) || 5;
          lesson.iDoDescription = document.getElementById('f_iDoDescription').value;
          lesson.weDoDuration = parseInt(document.getElementById('f_weDoDuration').value, 10) || 10;
          lesson.weDoDescription = document.getElementById('f_weDoDescription').value;
          lesson.youDoDuration = parseInt(document.getElementById('f_youDoDuration').value, 10) || 10;
          lesson.youDoDescription = document.getElementById('f_youDoDescription').value;
          break;
        case 'check':
          lesson.checkMethod = document.getElementById('f_checkMethod').value;
          lesson.checkDescription = document.getElementById('f_checkDescription').value;
          break;
        case 'wrap':
          lesson.wrapUpRecall = document.getElementById('f_wrapUpRecall').value;
          lesson.wrapUpPreview = document.getElementById('f_wrapUpPreview').value;
          lesson.homework = document.getElementById('f_homework').value;
          break;
      }
      return true;
    }

    render();
  }

  function renderLessonView(lesson, hideEditTip) {
    var checkLabels = {
      'exit-ticket': 'Exit ticket (one question on a sticky note)',
      'whiteboard': 'Whiteboard show-me',
      'thumbs': 'Thumbs up / sideways / down',
      'one-word': 'One-word check-in',
      '3-2-1': '3-2-1 reflection',
      'other': 'Other'
    };
    var materialsList = (lesson.materials || '').split('\n').filter(function (s) { return s.trim(); });

    return '' +
      '<div class="lesson-meta">' +
        '<div class="lesson-meta-item"><span class="label">Class</span><span class="value">' + (escape(lesson.className) || '—') + '</span></div>' +
        '<div class="lesson-meta-item"><span class="label">Date</span><span class="value">' + (formatDate(lesson.date) || '—') + '</span></div>' +
        '<div class="lesson-meta-item"><span class="label">Topic</span><span class="value">' + (escape(lesson.topic) || '—') + '</span></div>' +
        '<div class="lesson-meta-item"><span class="label">Duration</span><span class="value">' + (lesson.duration || 45) + ' min</span></div>' +
      '</div>' +
      '<div class="lesson-block">' +
        '<div class="lesson-block-title">Objective</div>' +
        '<div class="lesson-block-body">By the end of this lesson, students will be able to ' + (nl2br(lesson.objective) || '<em class="muted">— not set —</em>') + '</div>' +
      '</div>' +
      (materialsList.length
        ? '<div class="lesson-block">' +
            '<div class="lesson-block-title">Materials</div>' +
            '<ul style="margin:0;padding-left:1.2rem;">' + materialsList.map(function (m) { return '<li>' + escape(m) + '</li>'; }).join('') + '</ul>' +
          '</div>'
        : '') +
      '<div class="lesson-block">' +
        '<div class="lesson-block-title">Hook <span class="lesson-block-time">' + (lesson.hookDuration || 3) + ' min</span></div>' +
        '<div class="lesson-block-body">' + (nl2br(lesson.hookDescription) || '<em class="muted">— not set —</em>') + '</div>' +
      '</div>' +
      '<div class="lesson-block">' +
        '<div class="lesson-block-title">I do <span class="lesson-block-time">' + (lesson.iDoDuration || 5) + ' min</span></div>' +
        '<div class="lesson-block-body">' + (nl2br(lesson.iDoDescription) || '<em class="muted">— not set —</em>') + '</div>' +
      '</div>' +
      '<div class="lesson-block">' +
        '<div class="lesson-block-title">We do <span class="lesson-block-time">' + (lesson.weDoDuration || 10) + ' min</span></div>' +
        '<div class="lesson-block-body">' + (nl2br(lesson.weDoDescription) || '<em class="muted">— not set —</em>') + '</div>' +
      '</div>' +
      '<div class="lesson-block">' +
        '<div class="lesson-block-title">You do <span class="lesson-block-time">' + (lesson.youDoDuration || 10) + ' min</span></div>' +
        '<div class="lesson-block-body">' + (nl2br(lesson.youDoDescription) || '<em class="muted">— not set —</em>') + '</div>' +
      '</div>' +
      '<div class="lesson-block">' +
        '<div class="lesson-block-title">Check for understanding</div>' +
        '<div class="lesson-block-body"><strong>' + escape(checkLabels[lesson.checkMethod] || lesson.checkMethod) + '</strong><br>' + (nl2br(lesson.checkDescription) || '') + '</div>' +
      '</div>' +
      '<div class="lesson-block">' +
        '<div class="lesson-block-title">Wrap-up</div>' +
        '<div class="lesson-block-body">' +
          (lesson.wrapUpRecall ? '<p><strong>Recall:</strong> ' + escape(lesson.wrapUpRecall) + '</p>' : '') +
          (lesson.wrapUpPreview ? '<p><strong>Tomorrow:</strong> ' + escape(lesson.wrapUpPreview) + '</p>' : '') +
          (lesson.homework ? '<p><strong>Homework:</strong> ' + nl2br(lesson.homework) + '</p>' : '') +
          (!lesson.wrapUpRecall && !lesson.wrapUpPreview && !lesson.homework ? '<em class="muted">— not set —</em>' : '') +
        '</div>' +
      '</div>';
  }

  function lessonView(container, params) {
    var lesson = Storage.getLesson(params.id);
    if (!lesson) {
      container.innerHTML = '<p>Lesson not found. <a href="#/lessons">Back to list</a></p>';
      return;
    }
    container.innerHTML = '' +
      '<div class="page-head no-print">' +
        '<h1>' + (escape(lesson.topic) || '<em>(untitled lesson)</em>') + '</h1>' +
        '<div class="page-actions btn-row">' +
          '<a href="#/lessons" class="btn btn-soft">← All lessons</a>' +
          '<a href="#/lessons/' + lesson.id + '/edit" class="btn btn-soft">Edit</a>' +
          '<button class="btn btn-accent" id="printThis">🖨 Print / PDF</button>' +
        '</div>' +
      '</div>' +
      '<h1 class="print-only" style="display:none;">' + (escape(lesson.topic) || 'Lesson plan') + '</h1>' +
      renderLessonView(lesson);
    on('#printThis', 'click', function () { window.print(); });
  }

  // =========================================================================
  // Weeks list
  // =========================================================================
  function weeksList(container) {
    var weeks = Storage.getWeeks();
    container.innerHTML = '' +
      '<div class="page-head">' +
        '<h1>Weekly Planner</h1>' +
        '<div class="page-actions"><a href="#/weeks/new" class="btn">+ New week</a></div>' +
      '</div>' +
      (weeks.length === 0
        ? '<div class="empty-state">' +
            '<h3>No weeks planned yet</h3>' +
            '<p>Click <a href="#/weeks/new">+ New week</a> to plan Monday through Friday on one page.</p>' +
            '<p class="muted">Recommended: do this on Sunday for 30 minutes. Saves you 5 hours during the week.</p>' +
          '</div>'
        : weeks.map(function (w) {
            return '<div class="list-item">' +
              '<div class="list-item-main">' +
                '<div class="list-item-title"><a href="#/weeks/' + w.id + '">Week of ' + formatDate(w.startDate) + '</a></div>' +
                '<div class="list-item-meta">' + (escape(w.className) || '—') + ' · ' +
                  (w.progressiveThread ? '<em>"' + escape(w.progressiveThread) + '"</em>' : '<em class="muted">no thread set</em>') +
                '</div>' +
              '</div>' +
              '<div class="list-item-actions">' +
                '<a href="#/weeks/' + w.id + '" class="btn btn-soft btn-sm">Edit / Print</a>' +
                '<button class="btn btn-danger btn-sm" data-delete-week="' + w.id + '">Delete</button>' +
              '</div>' +
            '</div>';
          }).join(''));
    onAll('[data-delete-week]', 'click', function (e) {
      var id = e.target.getAttribute('data-delete-week');
      if (confirm('Delete this week? This cannot be undone.')) {
        Storage.deleteWeek(id);
        weeksList(container);
      }
    });
  }

  function weekEditor(container, params) {
    var week;
    if (params && params.id) {
      week = Storage.getWeek(params.id);
      if (!week) {
        container.innerHTML = '<p>Week not found. <a href="#/weeks">Back to list</a></p>';
        return;
      }
    } else {
      week = Storage.blankWeek();
    }
    var DAYS = [
      ['monday', 'Monday'],
      ['tuesday', 'Tuesday'],
      ['wednesday', 'Wednesday'],
      ['thursday', 'Thursday'],
      ['friday', 'Friday']
    ];
    var ROWS = [
      ['topic', 'Topic'],
      ['objective', 'Objective (SWBAT…)'],
      ['activity', 'Main activity'],
      ['assessment', 'Assessment'],
      ['materials', 'Materials'],
      ['homework', 'Homework']
    ];

    function header() {
      return '' +
        '<div class="page-head no-print">' +
          '<h1>' + (week.id ? 'Edit week' : 'New week') + '</h1>' +
          '<div class="page-actions btn-row">' +
            '<a href="#/weeks" class="btn btn-soft">← All weeks</a>' +
            '<button class="btn" id="saveWeek">💾 Save</button>' +
            '<button class="btn btn-accent" id="printWeek">🖨 Print / PDF</button>' +
          '</div>' +
        '</div>';
    }

    function topMeta() {
      return '' +
        '<div class="card no-print">' +
          '<div class="form-grid-2">' +
            '<div class="form-group"><label>Week starting (Monday)</label><input type="date" id="w_startDate" value="' + escape(week.startDate) + '"></div>' +
            '<div class="form-group"><label>Class / Group</label><input type="text" id="w_className" value="' + escape(week.className) + '" placeholder="e.g. 2AS-B"></div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Progressive thread for the week</label>' +
            '<input type="text" id="w_thread" value="' + escape(week.progressiveThread) + '" placeholder="e.g. By Friday, students can describe a moment in time using both tenses.">' +
            '<span class="form-help">One sentence connecting Monday → Friday. Don\'t skip this — it makes 5 lessons feel like one arc.</span>' +
          '</div>' +
        '</div>';
    }

    function gridHTML() {
      var html = '<div class="week-grid">';
      // Header row
      html += '<div class="week-row-label"></div>';
      DAYS.forEach(function (d) {
        html += '<div class="week-day-head">' + d[1] + '</div>';
      });
      // Data rows
      ROWS.forEach(function (r) {
        html += '<div class="week-row-label">' + r[1] + '</div>';
        DAYS.forEach(function (d) {
          var val = (week.days[d[0]] && week.days[d[0]][r[0]]) || '';
          html += '<div data-day="' + d[1] + ': ' + r[1] + '">' +
            '<textarea data-day-key="' + d[0] + '" data-row-key="' + r[0] + '">' + escape(val) + '</textarea>' +
            '</div>';
        });
      });
      html += '</div>';
      return html;
    }

    function bottomMeta() {
      return '' +
        '<div class="form-grid-2 no-print">' +
          '<div class="form-group">' +
            '<label>Photocopy list (one Monday-morning trip)</label>' +
            '<textarea id="w_photocopy" rows="4" placeholder="e.g. 30x Worksheet 4&#10;30x exit ticket sheet">' + escape(week.photocopyList) + '</textarea>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Friday reflection</label>' +
            '<textarea id="w_reflection" rows="4" placeholder="What worked? What didn\'t? Who needs help next week?">' + escape(week.reflection) + '</textarea>' +
          '</div>' +
        '</div>';
    }

    container.innerHTML = header() + topMeta() +
      '<h2 class="print-only" style="margin-bottom:1rem;">Week of ' + formatDate(week.startDate) + ' — ' + (escape(week.className) || '') + '</h2>' +
      (week.progressiveThread ? '<p class="print-only"><strong>Thread:</strong> ' + escape(week.progressiveThread) + '</p>' : '') +
      gridHTML() + bottomMeta();

    function collect() {
      week.startDate = document.getElementById('w_startDate').value;
      week.className = document.getElementById('w_className').value.trim();
      week.progressiveThread = document.getElementById('w_thread').value.trim();
      week.photocopyList = document.getElementById('w_photocopy').value;
      week.reflection = document.getElementById('w_reflection').value;
      onAll('.week-grid textarea', 'input', function () {}); // ensure we have refs
      var cells = document.querySelectorAll('.week-grid textarea');
      Array.prototype.forEach.call(cells, function (t) {
        var dayKey = t.getAttribute('data-day-key');
        var rowKey = t.getAttribute('data-row-key');
        if (!week.days[dayKey]) week.days[dayKey] = {};
        week.days[dayKey][rowKey] = t.value;
      });
    }

    on('#saveWeek', 'click', function () {
      collect();
      var saved = Storage.saveWeek(week);
      week.id = saved.id;
      alert('Week saved.');
      go('#/weeks/' + saved.id);
    });
    on('#printWeek', 'click', function () { collect(); window.print(); });
  }

  // =========================================================================
  // Activities
  // =========================================================================
  function activitiesList(container) {
    var state = { time: '', group: '', purpose: '', q: '' };

    function render() {
      var filtered = ACTIVITIES.filter(function (a) {
        if (state.time && !timeMatch(a.time, state.time)) return false;
        if (state.group && a.group !== state.group) return false;
        if (state.purpose && a.purpose !== state.purpose) return false;
        if (state.q) {
          var q = state.q.toLowerCase();
          var hay = (a.name + ' ' + a.blurb + ' ' + a.example).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      container.innerHTML = '' +
        '<div class="page-head"><h1>Activities</h1></div>' +
        '<p class="muted">15 ready-to-use classroom activities. Click any one for full details.</p>' +
        '<div class="activity-filters no-print">' +
          '<div class="filter-group"><label>Search</label><input type="text" id="af_q" value="' + escape(state.q) + '" placeholder="e.g. exit ticket"></div>' +
          '<div class="filter-group"><label>Time</label><select id="af_time">' +
            '<option value="">Any</option>' +
            '<option value="short"' + (state.time === 'short' ? ' selected' : '') + '>Under 5 min</option>' +
            '<option value="med"' + (state.time === 'med' ? ' selected' : '') + '>5–15 min</option>' +
            '<option value="long"' + (state.time === 'long' ? ' selected' : '') + '>15+ min</option>' +
          '</select></div>' +
          '<div class="filter-group"><label>Group</label><select id="af_group">' +
            '<option value="">Any</option>' +
            '<option value="individual"' + (state.group === 'individual' ? ' selected' : '') + '>Individual</option>' +
            '<option value="pair"' + (state.group === 'pair' ? ' selected' : '') + '>Pair</option>' +
            '<option value="group"' + (state.group === 'group' ? ' selected' : '') + '>Small group</option>' +
            '<option value="whole-class"' + (state.group === 'whole-class' ? ' selected' : '') + '>Whole class</option>' +
          '</select></div>' +
          '<div class="filter-group"><label>Purpose</label><select id="af_purpose">' +
            '<option value="">Any</option>' +
            '<option value="hook"' + (state.purpose === 'hook' ? ' selected' : '') + '>Hook</option>' +
            '<option value="practice"' + (state.purpose === 'practice' ? ' selected' : '') + '>Practice</option>' +
            '<option value="discussion"' + (state.purpose === 'discussion' ? ' selected' : '') + '>Discussion</option>' +
            '<option value="writing"' + (state.purpose === 'writing' ? ' selected' : '') + '>Writing</option>' +
            '<option value="review"' + (state.purpose === 'review' ? ' selected' : '') + '>Review</option>' +
            '<option value="assessment"' + (state.purpose === 'assessment' ? ' selected' : '') + '>Assessment</option>' +
          '</select></div>' +
        '</div>' +
        (filtered.length === 0
          ? '<div class="empty-state"><p class="muted">No activities match these filters.</p></div>'
          : '<div class="activity-grid">' + filtered.map(function (a) {
              return '<div class="activity-card" data-id="' + a.id + '">' +
                '<h3>' + escape(a.name) + '</h3>' +
                '<p class="activity-blurb">' + escape(a.blurb) + '</p>' +
                '<div class="activity-tags">' +
                  '<span class="tag tag-time">' + escape(a.timeLabel) + '</span>' +
                  '<span class="tag tag-group">' + escape(groupLabel(a.group)) + '</span>' +
                  '<span class="tag tag-purpose">' + escape(a.purpose) + '</span>' +
                '</div>' +
              '</div>';
            }).join('') + '</div>');

      on('#af_q', 'input', function (e) { state.q = e.target.value; render(); });
      on('#af_time', 'change', function (e) { state.time = e.target.value; render(); });
      on('#af_group', 'change', function (e) { state.group = e.target.value; render(); });
      on('#af_purpose', 'change', function (e) { state.purpose = e.target.value; render(); });
      onAll('.activity-card', 'click', function (e) {
        var card = e.target.closest('.activity-card');
        if (card) go('#/activities/' + card.getAttribute('data-id'));
      });
    }

    function timeMatch(t, bucket) {
      if (bucket === 'short') return t < 5;
      if (bucket === 'med') return t >= 5 && t <= 15;
      if (bucket === 'long') return t > 15;
      return true;
    }
    function groupLabel(g) {
      return ({ individual: 'Individual', pair: 'Pair', group: 'Group', 'whole-class': 'Whole class' })[g] || g;
    }

    render();
  }

  function activityDetail(container, params) {
    var a = ACTIVITIES.find(function (x) { return x.id === params.id; });
    if (!a) {
      container.innerHTML = '<p>Activity not found. <a href="#/activities">Back to list</a></p>';
      return;
    }
    var groupLabels = { individual: 'Individual', pair: 'Pair', group: 'Small group', 'whole-class': 'Whole class' };
    container.innerHTML = '' +
      '<div class="page-head no-print">' +
        '<a href="#/activities" class="btn btn-soft">← Back to activities</a>' +
        '<div class="page-actions"><button class="btn btn-soft" id="printActivity">🖨 Print / PDF</button></div>' +
      '</div>' +
      '<div class="activity-detail card">' +
        '<h2>' + escape(a.name) + '</h2>' +
        '<p>' + escape(a.blurb) + '</p>' +
        '<dl>' +
          '<dt>Time</dt><dd>' + escape(a.timeLabel) + '</dd>' +
          '<dt>Group size</dt><dd>' + escape(groupLabels[a.group] || a.group) + '</dd>' +
          '<dt>Purpose</dt><dd>' + escape(a.purpose) + '</dd>' +
          '<dt>Materials</dt><dd>' + escape(a.materials) + '</dd>' +
          '<dt>Setup</dt><dd>' + escape(a.setup) + '</dd>' +
        '</dl>' +
        '<h3>Steps</h3>' +
        '<ol style="padding-left:1.2rem;">' + a.steps.map(function (s) { return '<li>' + escape(s) + '</li>'; }).join('') + '</ol>' +
        '<div class="mistake-box">' +
          '<strong>Common mistake:</strong> ' + escape(a.mistake) +
        '</div>' +
        '<h3>Example</h3>' +
        '<p>' + escape(a.example) + '</p>' +
      '</div>';
    on('#printActivity', 'click', function () { window.print(); });
  }

  // =========================================================================
  // Problem solver
  // =========================================================================
  function problemsList(container) {
    container.innerHTML = '' +
      '<div class="page-head"><h1>Problem Solver</h1></div>' +
      '<p class="muted">Pick the situation. Get one specific script to use right now.</p>' +
      '<div class="problem-list">' + PROBLEMS.map(function (p) {
        return '<div class="problem-card" data-id="' + p.id + '">' +
          '<h3>' + escape(p.title) + '</h3>' +
          '<p>' + escape(p.summary) + '</p>' +
        '</div>';
      }).join('') + '</div>';
    onAll('.problem-card', 'click', function (e) {
      var card = e.target.closest('.problem-card');
      if (card) go('#/problems/' + card.getAttribute('data-id'));
    });
  }

  function problemDetail(container, params) {
    var p = PROBLEMS.find(function (x) { return x.id === params.id; });
    if (!p) {
      container.innerHTML = '<p>Problem not found. <a href="#/problems">Back to list</a></p>';
      return;
    }
    var sectionsHTML = p.sections.map(function (s) {
      var cls = 'next-step', label = 'Next';
      if (s.kind === 'dont') { cls = 'dont-say'; label = 'DO NOT'; }
      else if (s.kind === 'say') { cls = 'say-instead'; label = 'SAY / DO'; }
      else if (s.kind === 'next') { cls = 'next-step'; label = 'NEXT STEP'; }
      var why = s.why ? '<p class="muted" style="font-size:.9rem;margin-top:.4rem;"><em>Why: ' + escape(s.why) + '</em></p>' : '';
      return '<div class="' + cls + '">' +
        '<strong>' + label + '</strong>' +
        (s.title ? '<p style="margin-top:.2rem;font-weight:600;">' + escape(s.title) + '</p>' : '') +
        '<blockquote>"' + escape(s.text) + '"</blockquote>' +
        why +
      '</div>';
    }).join('');
    container.innerHTML = '' +
      '<div class="page-head no-print">' +
        '<a href="#/problems" class="btn btn-soft">← Back to problem solver</a>' +
        '<div class="page-actions"><button class="btn btn-soft" id="printProblem">🖨 Print / PDF</button></div>' +
      '</div>' +
      '<div class="problem-detail">' +
        '<h1>' + escape(p.title) + '</h1>' +
        '<p class="muted">' + escape(p.summary) + '</p>' +
        sectionsHTML +
      '</div>';
    on('#printProblem', 'click', function () { window.print(); });
  }

  // =========================================================================
  // Public
  // =========================================================================
  return {
    dashboard: dashboard,
    lessonsList: lessonsList,
    lessonBuilder: lessonBuilder,
    lessonView: lessonView,
    weeksList: weeksList,
    weekEditor: weekEditor,
    activitiesList: activitiesList,
    activityDetail: activityDetail,
    problemsList: problemsList,
    problemDetail: problemDetail
  };
})();
