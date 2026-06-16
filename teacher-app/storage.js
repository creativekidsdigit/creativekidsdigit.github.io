/* =========================================================================
   Storage: localStorage wrapper for lessons and weeks.
   All data lives in the browser. No server, no account, no tracking.
   ========================================================================= */

window.Storage = (function () {
  var KEY_LESSONS = 'tnplanner.lessons.v1';
  var KEY_WEEKS = 'tnplanner.weeks.v1';

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Storage read failed:', e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write failed:', e);
      alert('Could not save. Your browser storage may be full.');
      return false;
    }
  }

  function uid() {
    return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  // ===== Lessons =====
  function getLessons() {
    var arr = read(KEY_LESSONS, []);
    arr.sort(function (a, b) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    return arr;
  }

  function getLesson(id) {
    return getLessons().find(function (l) { return l.id === id; }) || null;
  }

  function saveLesson(lesson) {
    var all = read(KEY_LESSONS, []);
    var now = new Date().toISOString();
    if (!lesson.id) {
      lesson.id = uid();
      lesson.createdAt = now;
    }
    lesson.updatedAt = now;
    var idx = all.findIndex(function (l) { return l.id === lesson.id; });
    if (idx >= 0) all[idx] = lesson;
    else all.push(lesson);
    write(KEY_LESSONS, all);
    return lesson;
  }

  function deleteLesson(id) {
    var all = read(KEY_LESSONS, []).filter(function (l) { return l.id !== id; });
    write(KEY_LESSONS, all);
  }

  // ===== Weeks =====
  function getWeeks() {
    var arr = read(KEY_WEEKS, []);
    arr.sort(function (a, b) {
      return (b.startDate || '').localeCompare(a.startDate || '');
    });
    return arr;
  }

  function getWeek(id) {
    return getWeeks().find(function (w) { return w.id === id; }) || null;
  }

  function saveWeek(week) {
    var all = read(KEY_WEEKS, []);
    var now = new Date().toISOString();
    if (!week.id) {
      week.id = uid();
      week.createdAt = now;
    }
    week.updatedAt = now;
    var idx = all.findIndex(function (w) { return w.id === week.id; });
    if (idx >= 0) all[idx] = week;
    else all.push(week);
    write(KEY_WEEKS, all);
    return week;
  }

  function deleteWeek(id) {
    var all = read(KEY_WEEKS, []).filter(function (w) { return w.id !== id; });
    write(KEY_WEEKS, all);
  }

  // ===== Templates =====
  function blankLesson() {
    return {
      id: '',
      date: new Date().toISOString().slice(0, 10),
      className: '',
      topic: '',
      duration: 45,
      objective: '',
      materials: '',
      hookDescription: '',
      hookDuration: 3,
      iDoDescription: '',
      iDoDuration: 5,
      weDoDescription: '',
      weDoDuration: 10,
      youDoDescription: '',
      youDoDuration: 10,
      checkMethod: 'exit-ticket',
      checkDescription: '',
      wrapUpRecall: '',
      wrapUpPreview: '',
      homework: '',
      reflection: { worked: '', didnt: '', tomorrow: '' }
    };
  }

  function blankWeek() {
    var today = new Date();
    var day = today.getDay();
    var diff = today.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(today.setDate(diff));
    return {
      id: '',
      startDate: monday.toISOString().slice(0, 10),
      className: '',
      progressiveThread: '',
      photocopyList: '',
      reflection: '',
      days: {
        monday: blankDay(),
        tuesday: blankDay(),
        wednesday: blankDay(),
        thursday: blankDay(),
        friday: blankDay()
      }
    };
  }

  function blankDay() {
    return {
      topic: '',
      objective: '',
      activity: '',
      assessment: '',
      materials: '',
      homework: ''
    };
  }

  return {
    getLessons: getLessons,
    getLesson: getLesson,
    saveLesson: saveLesson,
    deleteLesson: deleteLesson,
    getWeeks: getWeeks,
    getWeek: getWeek,
    saveWeek: saveWeek,
    deleteWeek: deleteWeek,
    blankLesson: blankLesson,
    blankWeek: blankWeek,
    uid: uid
  };
})();
