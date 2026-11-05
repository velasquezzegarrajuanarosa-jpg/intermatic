(function () {
  const stage = document.querySelector(".pac-stage");
  if (stage && window.PacBackdrop) {
    window.PacBackdrop.init(stage, "");
  }

  const gateway = document.querySelector(".pac-main");
  if (gateway && window.PacGateway) {
    window.PacGateway.init(gateway);
  }

  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });
})();
