/* ===========================================================
   Yun-Ching Wu — Personal Website
   Scroll reveal (fade-in-up, staggered) + ZH/EN language switch
   Motion follows the guideline: gentle, never showy.
   =========================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "ycw-lang";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Language ---------- */

  var META = {
    zh: { lang: "zh-Hant", label: "EN", title: "吳昀慶 Yun-Ching Wu — 空間規劃研究者" },
    en: { lang: "en", label: "中文", title: "Yun-Ching Wu — Spatial Planning Researcher" }
  };

  function applyLang(lang) {
    var meta = META[lang] || META.zh;
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", meta.lang);
    document.title = meta.title;
    var label = document.getElementById("langLabel");
    if (label) label.textContent = meta.label;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
  }

  function initialLang() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
    if (stored === "zh" || stored === "en") return stored;
    var nav = (navigator.language || "").toLowerCase();
    return nav.indexOf("zh") === 0 ? "zh" : "en";
  }

  applyLang(initialLang());

  var toggle = document.getElementById("langSwitch");
  if (toggle) {
    toggle.addEventListener("click", function () {
      applyLang(root.getAttribute("data-lang") === "zh" ? "en" : "zh");
    });
  }

  /* ---------- Scroll reveal ---------- */

  var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        // Stagger 80ms per item within the same batch — a light rhythm.
        var delay = Math.min(i, 5) * 80;
        setTimeout(function () { entry.target.classList.add("is-in"); }, delay);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Footer year ---------- */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
