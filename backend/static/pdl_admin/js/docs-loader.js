/**
 * Hides the branded docs shell loader once Swagger UI or ReDoc has painted
 * meaningful content (or after a safety timeout).
 */
(function (window, document) {
  "use strict";

  var LOADER_ID = "pdl-docs-loader";
  var READY_CLASS = "pdl-docs-ready";
  var DONE_CLASS = "pdl-docs-loader--done";
  var FALLBACK_MS = 16000;
  var REMOVE_MS = 420;

  function isSwaggerReady(root) {
    if (!root) return false;
    return Boolean(
      root.querySelector(
        ".information-container .info, .errors-wrapper, .opblock-tag, section.models"
      )
    );
  }

  function isRedocReady(root) {
    if (!root) return false;
    return Boolean(
      root.querySelector(".redoc-wrap, .api-content, [data-section-id]")
    );
  }

  function contentReady() {
    var html = document.documentElement;
    if (html.classList.contains("pdl-docs--swagger")) {
      return isSwaggerReady(document.getElementById("swagger-ui"));
    }
    if (html.classList.contains("pdl-docs--redoc")) {
      var redocHost =
        document.getElementById("redoc-container") ||
        document.querySelector("redoc");
      return isRedocReady(redocHost) || isRedocReady(document.body);
    }
    return false;
  }

  function observeTargets() {
    var nodes = [
      document.getElementById("swagger-ui"),
      document.getElementById("redoc-container"),
      document.querySelector("redoc"),
    ].filter(Boolean);
    return nodes.length ? nodes : [document.body];
  }

  function dismiss(loader) {
    if (!loader || loader.dataset.pdlDocsLoaderDone === "1") return;
    loader.dataset.pdlDocsLoaderDone = "1";
    document.documentElement.classList.add(READY_CLASS);
    loader.classList.add(DONE_CLASS);
    loader.setAttribute("aria-busy", "false");
    window.setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, REMOVE_MS);
  }

  function init() {
    var loader = document.getElementById(LOADER_ID);
    if (!loader) return;

    function check() {
      if (contentReady()) dismiss(loader);
    }

    check();
    if (loader.dataset.pdlDocsLoaderDone === "1") return;

    var observer = new MutationObserver(check);
    observeTargets().forEach(function (node) {
      observer.observe(node, { childList: true, subtree: true });
    });

    window.setTimeout(function () {
      observer.disconnect();
      dismiss(loader);
    }, FALLBACK_MS);
  }

  window.PDLDocsLoader = {
    init: init,
    contentReady: contentReady,
    isSwaggerReady: isSwaggerReady,
    isRedocReady: isRedocReady,
    dismiss: dismiss,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
