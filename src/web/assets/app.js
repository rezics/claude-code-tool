(function () {
  "use strict";

  // Project switcher: navigate when the select changes or the form submits.
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.getAttribute("data-switch-project") === "true") {
      e.preventDefault();
      var sel = form.querySelector("select[name='id']");
      if (!sel) return;
      var v = sel.value;
      window.location.href = v ? "/p/" + encodeURIComponent(v) : "/projects";
    }
  });

  // Copy-to-clipboard buttons: <button data-copy-target="#id">
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (!(el instanceof HTMLElement)) return;
    var btn = el.closest("[data-copy-target]");
    if (!btn) return;
    var sel = btn.getAttribute("data-copy-target");
    if (!sel) return;
    var target = document.querySelector(sel);
    if (!target) return;
    var text = target.textContent || "";
    var original = btn.textContent;
    var reset = function () {
      btn.textContent = original;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          btn.textContent = "Copied!";
          setTimeout(reset, 1500);
        },
        function () {
          btn.textContent = "Copy failed";
          setTimeout(reset, 1500);
        }
      );
    } else {
      btn.textContent = "Clipboard unavailable";
      setTimeout(reset, 1500);
    }
  });
})();
