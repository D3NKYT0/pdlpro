/* Demonstration only: no requests, persistence or administrative operations. */
document.querySelectorAll("[data-demo-action]").forEach(button => {
    button.addEventListener("click", () => {
        document.getElementById("pdl-demo-result").textContent = button.dataset.demoAction;
    });
});
document.querySelectorAll("[data-demo-pending]").forEach(button => {
    button.addEventListener("click", event => {
        event.preventDefault();
        window.PDLButtons.setBusy(button, true, "Salvando exemplo…");
        setTimeout(() => {
            window.PDLButtons.setBusy(button, false);
            document.getElementById("pdl-demo-result").textContent = "Exemplo concluído. O nome e o valor do botão foram preservados.";
        }, 800);
    });
});
