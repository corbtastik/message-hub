/* Appearance toggle.
 *
 * The stylesheet already follows prefers-color-scheme on its own, so this only
 * layers a manual override on top: data-theme="light"|"dark" on <html> wins
 * over the media query. Choosing whatever the system is already showing drops
 * the override instead of pinning it, so the page goes back to following the
 * system. The inline script in <head> applies the stored value before first
 * paint -- doing it here would flash the wrong theme. */
(function () {
  "use strict";

  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var icon = btn.querySelector("svg");

  // SF Symbols sun.max.fill / moon.fill
  var SUN =
    '<circle cx="8" cy="8" r="3.3" fill="currentColor"/>' +
    '<g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M8 1.2v1.7M8 13.1v1.7M14.8 8h-1.7M2.9 8H1.2' +
    'M12.81 3.19l-1.2 1.2M4.39 11.61l-1.2 1.2M12.81 12.81l-1.2-1.2M4.39 4.39l-1.2-1.2"/></g>';
  var MOON =
    '<path fill="currentColor" d="M6.1 1.5a6.7 6.7 0 1 0 8.4 8.4A5.5 5.5 0 0 1 6.1 1.5Z"/>';

  function isDark() {
    var set = root.getAttribute("data-theme");
    return set ? set === "dark" : mq.matches;
  }

  function paint() {
    var dark = isDark();
    icon.innerHTML = dark ? SUN : MOON;
    var label = "Switch to " + (dark ? "light" : "dark") + " appearance";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  }

  btn.addEventListener("click", function () {
    // Suppress colour transitions for this frame so the page switches as one.
    root.classList.add("theme-switching");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove("theme-switching"); });
    });

    var next = isDark() ? "light" : "dark";
    if ((next === "dark") === mq.matches) {
      // Back in step with the system, so stop overriding it.
      root.removeAttribute("data-theme");
      try { localStorage.removeItem("theme"); } catch (e) {}
    } else {
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    }
    paint();
  });

  if (mq.addEventListener) mq.addEventListener("change", paint);

  // The wrapper holds the palette button too, so reveal the pair.
  var wrap = btn.closest(".controls");
  if (wrap) wrap.hidden = false;
  paint();
})();
