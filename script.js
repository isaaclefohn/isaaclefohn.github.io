// Footer "Dark theme" toggle: the only script on the site.
// Light is the default for every visitor. Dark applies only after a visitor
// presses this button; the choice is saved as 'dark' or 'light' under the
// localStorage key 'theme-2026' (older keys are ignored on purpose). The inline
// <head> snippet applies a saved 'dark' before first paint. Without JS the
// button stays hidden and the page is light.
(function () {
  var KEY = 'theme-2026';
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  function apply(theme) {
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', theme === 'dark' ? '#162131' : '#ffffff');
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }
  function saved() {
    try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return isDark() ? 'dark' : 'light'; }
  }

  apply(isDark() ? 'dark' : 'light');
  btn.hidden = false;

  btn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked: applies to this page only */ }
  });

  // Keep pages restored from the back/forward cache, and other tabs, in step.
  window.addEventListener('pageshow', function (e) { if (e.persisted) apply(saved()); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(saved()); });
})();
