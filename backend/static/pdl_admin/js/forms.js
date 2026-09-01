(function () {
    "use strict";

    if (window.PDLFormSystem) {
        window.PDLFormSystem.enhance(document);
        return;
    }

    const masks = {
        cpf(value) {
            return value.replace(/\D/g, "")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})/, "$1-$2")
                .replace(/(-\d{2})\d+?$/, "$1");
        },
        cnpj(value) {
            return value.replace(/\D/g, "")
                .replace(/(\d{2})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1/$2")
                .replace(/(\d{4})(\d{1,2})/, "$1-$2")
                .replace(/(-\d{2})\d+?$/, "$1");
        },
        phone(value) {
            const digits = value.replace(/\D/g, "").slice(0, 11);
            if (digits.length <= 2) return digits ? `(${digits}` : "";
            if (digits.length <= 10) {
                return digits.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
            }
            return digits.replace(/^(\d{2})(\d{0,5})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
        },
        cep(value) {
            return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
        },
        money(value) {
            const digits = value.replace(/\D/g, "");
            if (!digits) return "";
            const number = Number.parseInt(digits, 10) / 100;
            return new Intl.NumberFormat("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(number);
        }
    };

    function inferKind(control) {
        if (control.dataset.pdlKind) return control.dataset.pdlKind;
        const name = (control.name || control.id || "").toLowerCase();
        const type = (control.type || "").toLowerCase();
        const isPercentage = /(^|_)(multiplier|percent|percentage|rate|ratio)($|_)/.test(name);
        if (!isPercentage && (control.dataset.pdlMask === "money" || /(^|_)(price|amount|balance|bid|cost|fee|total|valor)($|_)/.test(name))) return "money";
        if (/(payload|metadata|settings)/.test(name)) return "json";
        if (type === "datetime-local" || /(_at|datetime)/.test(name)) return "datetime";
        if (type === "date") return "date";
        if (type === "email") return "email";
        if (type === "url") return "url";
        if (/(slug|uuid|token|code|reference)/.test(name)) return "code";
        if (type === "checkbox" || type === "radio") return "boolean";
        if (control.tagName === "SELECT") return "choice";
        if (control.tagName === "TEXTAREA") return "longtext";
        if (type === "number") return "number";
        return "text";
    }

    function getFieldShell(control) {
        return control.closest(".form-group, .fieldBox, .form-row, .pdl-field-shell");
    }

    function syncFieldState(control) {
        const shell = getFieldShell(control);
        if (!shell) return;
        const hasValue = control.type === "checkbox" || control.type === "radio"
            ? control.checked
            : String(control.value || "").trim().length > 0;
        shell.classList.toggle("has-value", hasValue);
        shell.classList.toggle("has-errors", control.matches(".is-invalid, [aria-invalid='true']"));
    }

    function applyControlClasses(control) {
        if (control.matches("input[type='hidden'], input[type='submit'], input[type='button'], button")) return;
        if (control.matches(".select2-hidden-accessible, .select2-search__field") || control.closest(".select2-container")) return;
        if (control.tagName === "SELECT") {
            control.classList.add("pdl-control");
            if (!control.classList.contains("select2-hidden-accessible")) control.classList.add("form-select", "pdl-select");
        } else if (control.tagName === "TEXTAREA") {
            control.classList.add("pdl-control", "form-control", "pdl-textarea");
        } else if (control.type === "checkbox" || control.type === "radio") {
            control.classList.add("form-check-input", "pdl-check");
        } else if (control.type === "file") {
            control.classList.add("pdl-control", "form-control", "pdl-file");
        } else {
            control.classList.add("pdl-control", "form-control", "pdl-input");
        }
    }

    function bindMask(control) {
        const maskName = control.dataset.pdlMask;
        if (!maskName || !masks[maskName] || control.dataset.pdlMaskBound) return;
        const apply = () => { control.value = masks[maskName](control.value); };
        control.addEventListener("input", apply);
        if (control.value) apply();
        control.dataset.pdlMaskBound = "true";
    }

    function enhanceControl(control) {
        if (!control || control.dataset.pdlEnhanced) return;
        if (control.matches("input[type='hidden'], input[type='submit'], input[type='button'], button")) return;
        if (control.matches(".select2-search__field")) {
            if (!control.placeholder) control.placeholder = "Pesquisar e selecionar...";
            return;
        }
        if (control.matches(".select2-hidden-accessible") || control.closest(".select2-container")) return;

        applyControlClasses(control);
        control.dataset.pdlKind = inferKind(control);
        if (control.dataset.pdlKind === "money" && !control.dataset.pdlMask) control.dataset.pdlMask = "money";
        if (control.dataset.pdlKind === "json") {
            control.classList.add("pdl-json");
            control.spellcheck = false;
        }

        const shell = getFieldShell(control);
        if (shell) {
            shell.classList.add("pdl-field-shell");
            shell.dataset.pdlKind = control.dataset.pdlKind;
            if (control.dataset.pdlCurrency) shell.dataset.pdlCurrency = control.dataset.pdlCurrency;
            if (control.required) shell.dataset.pdlRequired = "true";
        }

        control.addEventListener("focus", () => shell && shell.classList.add("is-focused"));
        control.addEventListener("blur", () => {
            if (shell) shell.classList.remove("is-focused");
            syncFieldState(control);
        });
        control.addEventListener("change", () => syncFieldState(control));
        control.addEventListener("input", () => syncFieldState(control));

        bindMask(control);
        syncFieldState(control);
        control.dataset.pdlEnhanced = "true";
    }

    function normalizeMoneyBeforeSubmit(form) {
        form.querySelectorAll("[data-pdl-mask='money']").forEach((control) => {
            const digits = control.value.replace(/\D/g, "");
            control.value = digits ? (Number.parseInt(digits, 10) / 100).toFixed(2) : "";
        });
    }

    function enhanceForm(form) {
        if (!form || form.matches(".pdl-account-menu__logout")) return;
        form.classList.add("pdl-form-system");
        form.querySelectorAll("input, select, textarea").forEach(enhanceControl);

        if (!form.dataset.pdlSubmitBound) {
            form.addEventListener("submit", () => normalizeMoneyBeforeSubmit(form));
            form.dataset.pdlSubmitBound = "true";
        }
    }

    function enhance(root) {
        if (!root) return;
        if (root.matches && root.matches("form")) enhanceForm(root);
        if (root.matches && root.matches("input, select, textarea")) enhanceControl(root);
        root.querySelectorAll("#content-main form, #change-list-filters form, .inline-group form").forEach(enhanceForm);
        root.querySelectorAll("#content-main input, #content-main select, #content-main textarea, #change-list-filters input, #change-list-filters select").forEach(enhanceControl);
        const actions = document.querySelector("#jazzy-actions");
        if (actions) actions.classList.add("pdl-form-actions");
    }

    window.PDLFormSystem = { enhance };

    const start = () => {
        enhance(document);
        const target = document.querySelector("#content-main") || document.body;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
                });
            }
        });
        observer.observe(target, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
