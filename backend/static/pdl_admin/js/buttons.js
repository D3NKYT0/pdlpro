/* Shared pending state for native Django forms and explicit async actions.
   Never disable or rename submit controls: Django uses _save/_continue/etc.
   AJAX forms that preventDefault own their lifecycle and call setBusy explicitly. */
(function () {
    "use strict";
    if (window.PDLButtons) return;
    const busy = new Map();
    const forms = new Map();
    let sequence = 0;

    function restoreAttribute(element, name, value) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
    }

    function setBusy(control, pending, label = "Enviando…") {
        if (!control) return;
        if (!pending) {
            const previous = busy.get(control);
            if (!previous) return;
            for (const [name, value] of Object.entries(previous.attributes)) restoreAttribute(control, name, value);
            previous.status.remove();
            busy.delete(control);
            return;
        }
        if (busy.has(control)) return;
        const attributes = Object.fromEntries(["aria-busy", "aria-disabled", "aria-describedby"].map(name => [name, control.getAttribute(name)]));
        const status = document.createElement("span");
        status.id = `pdl-button-status-${++sequence}`;
        status.className = "pdl-button-status";
        status.setAttribute("role", "status");
        status.textContent = label;
        control.insertAdjacentElement("afterend", status);
        control.setAttribute("aria-busy", "true");
        control.setAttribute("aria-disabled", "true");
        control.setAttribute("aria-describedby", [attributes["aria-describedby"], status.id].filter(Boolean).join(" "));
        busy.set(control, { attributes, status });
    }

    function reset() {
        for (const control of busy.keys()) setBusy(control, false);
        for (const [form, previous] of forms) restoreAttribute(form, "aria-busy", previous);
        forms.clear();
    }

    document.addEventListener("click", event => {
        const control = event.target.closest?.("button, input[type='submit'], a.btn, a.pdl-button");
        if (control && (control.getAttribute("aria-disabled") === "true" || control.classList.contains("disabled"))) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);

    document.addEventListener("submit", event => {
        const form = event.target;
        if (!(form instanceof window.HTMLFormElement) || !form.closest(".pdl-backend, .login-page")) return;
        if (forms.has(form)) { event.preventDefault(); return; }
        const submitter = event.submitter;
        const method = submitter?.getAttribute("formmethod") || form.method;
        const target = submitter?.getAttribute("formtarget") || form.target;
        if (method.toLowerCase() !== "post" || (target && target !== "_self") || form.hasAttribute("data-pdl-manual-submit")) return;
        forms.set(form, form.getAttribute("aria-busy"));
        // Run after all submit handlers so prevented AJAX/confirmation flows stay unlocked.
        queueMicrotask(() => {
            if (!forms.has(form)) return;
            if (event.defaultPrevented) { forms.delete(form); return; }
            form.setAttribute("aria-busy", "true");
            setBusy(submitter || form.querySelector("button:not([type]), button[type='submit'], input[type='submit']"), true, submitter?.dataset.busyLabel || "Enviando…");
        });
    });
    window.addEventListener("pageshow", reset);
    window.PDLButtons = { setBusy, reset };
})();
