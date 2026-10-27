/* Colour palettes.
 *
 * The palettes themselves are plain CSS: assets/css/palettes.css carries one
 * `:root[data-palette="..."]` rule per palette, generated at build time from
 * lib/palette.js. Each value is a light-dark() pair, so the browser picks the
 * side matching `color-scheme` -- which means palette and appearance are
 * independent axes and this file never has to know which mode is showing.
 *
 * So all that happens here is setting one attribute, and the inline script in
 * <head> has already done that for the stored choice before first paint. */
(function () {
  "use strict";

  var root = document.documentElement;
  var wrap = document.querySelector(".controls");
  var btn = document.getElementById("palette-btn");
  var panel = document.getElementById("palette-panel");
  if (!wrap || !btn || !panel) return;

  var swatches = Array.prototype.slice.call(panel.querySelectorAll(".swatch"));

  function current() {
    return root.getAttribute("data-palette") || "";
  }

  function mark() {
    var now = current();
    swatches.forEach(function (s) {
      s.setAttribute("aria-selected", String(s.dataset.palette === now));
    });
  }

  function apply(id) {
    // Suppress colour transitions for this frame, the way the appearance
    // toggle does, so the whole page changes at once rather than in pieces.
    root.classList.add("theme-switching");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove("theme-switching"); });
    });

    if (id) {
      root.setAttribute("data-palette", id);
      try { localStorage.setItem("palette", id); } catch (e) {}
    } else {
      root.removeAttribute("data-palette");
      try { localStorage.removeItem("palette"); } catch (e) {}
    }
    mark();
  }

  function open(yes) {
    panel.hidden = !yes;
    btn.setAttribute("aria-expanded", String(yes));
    if (yes) {
      var sel = panel.querySelector('[aria-selected="true"]') || swatches[0];
      if (sel) sel.focus();
    }
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    open(panel.hidden);
  });

  panel.addEventListener("click", function (e) {
    var s = e.target.closest ? e.target.closest(".swatch") : null;
    if (!s) return;
    apply(s.dataset.palette);
  });

  // Anywhere outside closes it, as a popover should.
  document.addEventListener("click", function (e) {
    if (!panel.hidden && !wrap.contains(e.target)) open(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) {
      open(false);
      btn.focus();
    }
  });

  // Left/right walk the grid while the panel is open.
  panel.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var i = swatches.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    var next = i + (e.key === "ArrowRight" ? 1 : -1);
    if (next >= 0 && next < swatches.length) swatches[next].focus();
  });

  mark();
})();
