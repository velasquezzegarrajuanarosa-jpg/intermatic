(function () {
  const SCENES = [
    "assets/images/auth-scene-01.webp",
    "assets/images/auth-scene-02.webp",
    "assets/images/auth-scene-03.webp",
    "assets/images/auth-scene-04.webp",
    "assets/images/auth-scene-05.webp",
    "assets/images/auth-scene-06.webp",
    "assets/images/auth-scene-07.webp",
    "assets/images/auth-scene-08.webp"
  ];

  const STORAGE_KEY = "pacifico-auth-scene";

  function readScene() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function writeScene(scene) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, scene);
    } catch (error) {
      // Storage may be unavailable in private or file contexts.
    }
  }

  window.PacBackdrop = {
    init: function (root, assetBase) {
      const base = assetBase || "";
      let scene = readScene();
      if (!SCENES.includes(scene)) {
        scene = SCENES[Math.floor(Math.random() * SCENES.length)];
        writeScene(scene);
      }
      root.style.setProperty("background-image", 'url("' + base + scene + '")');
    }
  };
})();
