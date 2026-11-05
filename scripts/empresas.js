(function () {
  const stage = document.querySelector(".pac-stage");
  if (stage && window.PacBackdrop) {
    window.PacBackdrop.init(stage, "../");
  }

  const userWrap = document.querySelector(".emp-form-wrap--user");
  const passWrap = document.querySelector(".emp-form-wrap--password");
  const userForm = document.querySelector(".emp-form--user");
  const passForm = document.querySelector(".emp-form--password");
  const userInput = document.querySelector("#emp-user");
  const passInput = document.querySelector("#emp-pass");
  const loading = document.querySelector(".emp-loading");
  const note = document.querySelector(".emp-note");
  const back = document.querySelector(".emp-back");
  let currentUser = "";

  function showLoading() {
    if (loading) loading.hidden = false;
  }

  function hideLoading() {
    if (loading) loading.hidden = true;
  }

  async function withSpinner(task) {
    showLoading();
    const started = Date.now();
    try {
      return await task();
    } finally {
      const remaining = Math.max(0, 650 - (Date.now() - started));
      await new Promise(function (resolve) { window.setTimeout(resolve, remaining); });
      hideLoading();
    }
  }

  function showPassword() {
    if (userWrap) userWrap.hidden = true;
    if (passWrap) passWrap.hidden = false;
    if (note) {
      note.hidden = true;
      note.style.color = "";
    }
    if (passInput) window.setTimeout(function () { passInput.focus(); }, 50);
  }

  function showUser() {
    if (passWrap) passWrap.hidden = true;
    if (userWrap) userWrap.hidden = false;
    if (passInput) passInput.value = "";
    if (userInput) window.setTimeout(function () { userInput.focus(); }, 50);
  }

  function normalizeResult(result) {
    if (result === false) return { valid: false };
    if (result && typeof result === "object" && "valid" in result) return result;
    return { valid: true };
  }

  async function runHook(hook, args) {
    if (typeof hook !== "function") return { valid: true };
    try {
      return normalizeResult(await hook.apply(window, args));
    } catch (error) {
      return { valid: false, message: "No fue posible validar los datos." };
    }
  }

  if (userForm) {
    userForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      currentUser = userInput ? userInput.value.trim() : "";
      if (!currentUser) return;
      await withSpinner(function () { return Promise.resolve(true); });
      showPassword();
    });
  }

  if (passForm) {
    passForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const password = passInput ? passInput.value : "";
      if (!password) return;
      const result = await withSpinner(function () {
        // Lab integration point: set window.PacBusinessLoginCheck = async (usuario, clave) => ({ valid: true/false }).
        return runHook(window.PacBusinessLoginCheck, [currentUser, password]);
      });
      if (note) {
        note.hidden = false;
        note.style.color = result.valid ? "rgb(0, 94, 184)" : "rgb(204, 0, 0)";
        note.textContent = result.valid
          ? "Credenciales verificadas. Ingresando..."
          : (result.message || "Usuario o contraseña no válidos.");
      }
      if (result.valid) {
        // Credenciales buenas: quedarse cargando mientras llega el panel de empresas.
        showLoading();
      }
    });
  }

  if (back) {
    back.addEventListener("click", showUser);
  }

  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });
})();
