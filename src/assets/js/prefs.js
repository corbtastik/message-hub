/* The two things theme.js and palette.js both need.
 *
 * Both store a choice and both suppress transitions while the page repaints,
 * and each used to carry its own copy: four hand-written try/catch blocks and
 * two identical requestAnimationFrame dances.
 *
 * Loaded before either of them -- the scripts are deferred, so they run in
 * document order. */
window.Prefs = (function () {
  "use strict";

  /* Storage can throw rather than return null: Safari in private browsing,
     and any browser with site data blocked. A preference that cannot be saved
     should cost the reader nothing, so every path swallows it. */
  var store = {
    get: function (key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, value); } catch (e) {}
    },
    clear: function (key) {
      try { localStorage.removeItem(key); } catch (e) {}
    },
  };

  /* Repaint without animating. Colour transitions are per-property, so a
     theme change would otherwise sweep across the page one element at a time
     instead of switching as one. Two frames: one for the class to apply,
     one for the repaint it covers. */
  function withoutTransitions(change) {
    var root = document.documentElement;
    root.classList.add("theme-switching");
    change();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.remove("theme-switching");
      });
    });
  }

  return {
    store: store,
    withoutTransitions: withoutTransitions,
    /* Also hard-coded in the inline script in base.njk, which has to run
       before any external file to avoid a flash and so cannot import these.
       Changing one means changing both. */
    THEME: "theme",
    PALETTE: "palette",
  };
})();
