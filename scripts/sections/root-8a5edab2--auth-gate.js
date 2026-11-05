(function () {
  const VIEW_PATHS = {
    personas: "personas/index.html",
    empresas: "empresas/index.html"
  };

  window.PacGateway = {
    init: function (root) {
      const controls = root.querySelectorAll("[data-pac-view]");
      controls.forEach(function (control) {
        control.addEventListener("click", function () {
          const destination = VIEW_PATHS[control.dataset.pacView];
          if (destination) {
            window.location.href = destination;
          }
        });
      });
    }
  };
})();

