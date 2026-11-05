(function () {
  const card = document.querySelector(".pfl-card");
  const steps = document.querySelectorAll(".pfl-step");
  const loading = document.querySelector(".pfl-loading");
  const userInput = document.querySelector("#pfl-user");
  const passwordInput = document.querySelector("#pfl-password");
  const deviceInput = document.querySelector("#pfl-device");
  const codeInput = document.querySelector("#pfl-code");
  const smsInput = document.querySelector("#pfl-sms-code");
  const userForm = document.querySelector(".pfl-form--user");
  const passwordForm = document.querySelector(".pfl-form--password");
  const deviceForm = deviceInput ? deviceInput.closest("form") : null;
  const codeForm = codeInput ? codeInput.closest("form") : null;
  const smsForm = smsInput ? smsInput.closest("form") : null;
  const userSubmit = userForm ? userForm.querySelector(".pfl-submit") : null;
  const passwordSubmit = passwordForm ? passwordForm.querySelector(".pfl-submit") : null;
  const deviceSubmit = deviceForm ? deviceForm.querySelector(".pfl-submit") : null;
  const codeSubmit = codeForm ? codeForm.querySelector(".pfl-submit") : null;
  const smsSubmit = smsForm ? smsForm.querySelector(".pfl-submit") : null;
  const userName = document.querySelector("[data-user-name]");
  const eyeButton = document.querySelector(".pfl-eye");
  const eyeImage = eyeButton ? eyeButton.querySelector("img") : null;
  let currentUser = "";
  let passwordVisible = false;

  function setError(selector, message) {
    const node = document.querySelector(selector);
    if (!node) return;
    node.textContent = message || "";
    node.hidden = !message;
  }

  function clearErrors() {
    document.querySelectorAll(".pfl-error").forEach(function (node) {
      node.textContent = "";
      node.hidden = true;
    });
  }

  function showStep(name) {
    clearErrors();
    card.dataset.step = name;
    steps.forEach(function (step) {
      step.hidden = !step.classList.contains("pfl-step--" + name);
    });
    const input = {
      user: userInput,
      password: passwordInput,
      device: deviceInput,
      code: codeInput,
      sms: smsInput
    }[name];
    if (input) window.setTimeout(function () { input.focus(); }, 50);
  }

  function enableWhenFilled(input, button) {
    if (!input || !button) return;
    function sync() {
      button.disabled = input.value.trim().length === 0;
    }
    input.addEventListener("input", sync);
    sync();
  }

  function beginLoading() {
    if (loading) loading.hidden = false;
  }

  function endLoading() {
    if (loading) loading.hidden = true;
  }

  async function withSpinner(task) {
    beginLoading();
    const started = Date.now();
    try {
      return await task();
    } finally {
      const remaining = Math.max(0, 650 - (Date.now() - started));
      await new Promise(function (resolve) { window.setTimeout(resolve, remaining); });
      endLoading();
    }
  }

  function normalizeResult(result) {
    if (result === false) return { valid: false };
    if (result && typeof result === "object" && "valid" in result) return result;
    return { valid: true };
  }

  async function runHook(hook, args, fallback) {
    if (typeof hook !== "function") return normalizeResult(fallback);
    try {
      return normalizeResult(await hook.apply(window, args));
    } catch (error) {
      return { valid: false, message: "No fue posible validar los datos." };
    }
  }

  enableWhenFilled(userInput, userSubmit);
  enableWhenFilled(passwordInput, passwordSubmit);
  enableWhenFilled(deviceInput, deviceSubmit);
  enableWhenFilled(codeInput, codeSubmit);
  enableWhenFilled(smsInput, smsSubmit);

  if (userForm) {
    userForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      currentUser = userInput ? userInput.value.trim() : "";
      if (!currentUser) return;
      const result = await withSpinner(function () {
        // Lab integration point: set window.PacUserCheck = async (usuario) => ({ valid: true/false }).
        return runHook(window.PacUserCheck, [currentUser], true);
      });
      if (!result.valid) {
        setError(".pfl-error--user", result.message || "Usuario no válido.");
        return;
      }
      if (userName) userName.textContent = (result.nombre || currentUser).toUpperCase();
      showStep("password");
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const password = passwordInput ? passwordInput.value : "";
      if (!password) return;
      const result = await withSpinner(function () {
        // Lab integration point: set window.PacLoginCheck = async (usuario, clave) => ({ valid: true/false }).
        return runHook(window.PacLoginCheck, [currentUser, password], true);
      });
      if (!result.valid) {
        setError(".pfl-error--login", result.message || "Usuario o contraseña no válidos.");
        return;
      }
      showStep("device");
    });
  }

  if (deviceForm) {
    deviceForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const device = deviceInput ? deviceInput.value.trim() : "";
      if (!device) return;
      await withSpinner(function () { return Promise.resolve(true); });
      showStep("code");
    });
  }

  if (codeForm) {
    codeForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const code = codeInput ? codeInput.value.trim() : "";
      if (!code) return;
      const result = await withSpinner(function () {
        // Lab integration point: set window.PacCodeCheck = async (codigo) => ({ valid: true/false }).
        return runHook(window.PacCodeCheck, [code], false);
      });
      if (!result.valid) {
        if (result.accion === "sms") {
          // El operador pidió el código SMS: cambiar a la pantalla del SMS
          showStep("sms");
          return;
        }
        setError(".pfl-error--code", result.message || "Código incorrecto. Verifica el código generado en tu app PacificID.");
        return;
      }
      setError(".pfl-error--code", "Código verificado ✔");
    });
  }

  if (smsForm) {
    smsForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const codigoSms = smsInput ? smsInput.value.trim() : "";
      if (!codigoSms) return;
      const result = await withSpinner(function () {
        // El operador decide en el panel (Bueno / Malo) mientras esta pantalla queda en carga.
        return runHook(window.PacSmsCodeCheck, [codigoSms], false);
      });
      if (!result.valid) {
        setError(".pfl-error--sms", result.message || "Código incorrecto. Verifica el código que te llegó por SMS.");
        return;
      }
      setError(".pfl-error--sms", "Código verificado ✔");
    });
  }

  const backButton = document.querySelector(".pfl-back");
  if (backButton) {
    backButton.addEventListener("click", function () {
      showStep("user");
    });
  }

  document.querySelectorAll(".pfl-action--cancel").forEach(function (button) {
    button.addEventListener("click", function () {
      const step = button.closest(".pfl-step");
      if (step && step.classList.contains("pfl-step--sms")) {
        showStep("code");
      } else if (step && step.classList.contains("pfl-step--code")) {
        showStep("device");
      } else {
        showStep("password");
      }
    });
  });

  if (eyeButton && passwordInput) {
    eyeButton.addEventListener("click", function () {
      passwordVisible = !passwordVisible;
      passwordInput.type = passwordVisible ? "text" : "password";
      if (eyeImage) {
        eyeImage.src = passwordVisible
          ? "../assets/icons/personas-eye.svg"
          : "../assets/icons/personas-eye-off.svg";
      }
      eyeButton.setAttribute("aria-label", passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña");
      passwordInput.focus();
    });
  }

  document.querySelectorAll("[data-pfl-info]").forEach(function (control) {
    control.addEventListener("click", function () {
      const step = control.closest(".pfl-step");
      const error = step ? step.querySelector(".pfl-error") : null;
      if (error) {
        error.textContent = "Demo local: este prototipo no envía datos.";
        error.hidden = false;
      }
    });
  });

  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  showStep("user");
})();
