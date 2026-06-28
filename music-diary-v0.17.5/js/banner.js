import { defaultBanner } from "./firebase.js";
import { isLikelyImageUrl, imageUrlErrorMessage } from "./image-utils.js";
import { bindDropZone, uploadImageFile } from "./upload.js";

const DEFAULT_BANNER = Object.freeze({
  bannerDesktopX: 50,
  bannerDesktopY: 50,
  bannerDesktopZoom: 1,
  bannerMobileX: 50,
  bannerMobileY: 50,
  bannerMobileZoom: 1
});

const LIMITS = Object.freeze({
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 100,
  zoomMin: 1,
  zoomMax: 3
});

const DEVICE_PREFIX = {
  desktop: "bannerDesktop",
  mobile: "bannerMobile"
};

function cleanNumber(value, fallback, min, max) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cssNumber(value) {
  return String(Math.round(Number(value) * 100) / 100);
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fieldName(prefix, suffix) {
  return prefix + suffix;
}

function bannerFields(profile) {
  const normalized = normalizeBannerProfile(profile || {});

  return {
    banner: normalized.banner,
    bannerDesktopX: normalized.bannerDesktopX,
    bannerDesktopY: normalized.bannerDesktopY,
    bannerDesktopZoom: normalized.bannerDesktopZoom,
    bannerMobileX: normalized.bannerMobileX,
    bannerMobileY: normalized.bannerMobileY,
    bannerMobileZoom: normalized.bannerMobileZoom
  };
}

function getDeviceValues(state, device) {
  const prefix = DEVICE_PREFIX[device] || DEVICE_PREFIX.desktop;

  return {
    x: state[fieldName(prefix, "X")],
    y: state[fieldName(prefix, "Y")],
    zoom: state[fieldName(prefix, "Zoom")]
  };
}

function setDeviceValues(state, device, values) {
  const prefix = DEVICE_PREFIX[device] || DEVICE_PREFIX.desktop;
  const nextState = { ...state };

  nextState[fieldName(prefix, "X")] = cleanNumber(values.x, DEFAULT_BANNER[fieldName(prefix, "X")], LIMITS.xMin, LIMITS.xMax);
  nextState[fieldName(prefix, "Y")] = cleanNumber(values.y, DEFAULT_BANNER[fieldName(prefix, "Y")], LIMITS.yMin, LIMITS.yMax);
  nextState[fieldName(prefix, "Zoom")] = cleanNumber(values.zoom, DEFAULT_BANNER[fieldName(prefix, "Zoom")], LIMITS.zoomMin, LIMITS.zoomMax);

  return normalizeBannerProfile(nextState);
}

function defaultDeviceValues() {
  return {
    x: 50,
    y: 50,
    zoom: 1
  };
}

export function normalizeBannerProfile(profile = {}) {
  return {
    banner: profile.banner || defaultBanner,
    bannerDesktopX: cleanNumber(profile.bannerDesktopX, DEFAULT_BANNER.bannerDesktopX, LIMITS.xMin, LIMITS.xMax),
    bannerDesktopY: cleanNumber(profile.bannerDesktopY, DEFAULT_BANNER.bannerDesktopY, LIMITS.yMin, LIMITS.yMax),
    bannerDesktopZoom: cleanNumber(profile.bannerDesktopZoom, DEFAULT_BANNER.bannerDesktopZoom, LIMITS.zoomMin, LIMITS.zoomMax),
    bannerMobileX: cleanNumber(profile.bannerMobileX, DEFAULT_BANNER.bannerMobileX, LIMITS.xMin, LIMITS.xMax),
    bannerMobileY: cleanNumber(profile.bannerMobileY, DEFAULT_BANNER.bannerMobileY, LIMITS.yMin, LIMITS.yMax),
    bannerMobileZoom: cleanNumber(profile.bannerMobileZoom, DEFAULT_BANNER.bannerMobileZoom, LIMITS.zoomMin, LIMITS.zoomMax)
  };
}

export function bannerStyle(profile = {}) {
  const banner = normalizeBannerProfile(profile);

  return [
    "--banner-desktop-x:" + cssNumber(banner.bannerDesktopX) + "%",
    "--banner-desktop-y:" + cssNumber(banner.bannerDesktopY) + "%",
    "--banner-desktop-zoom:" + cssNumber(banner.bannerDesktopZoom),
    "--banner-desktop-size:" + cssNumber(banner.bannerDesktopZoom * 100) + "%",
    "--banner-mobile-x:" + cssNumber(banner.bannerMobileX) + "%",
    "--banner-mobile-y:" + cssNumber(banner.bannerMobileY) + "%",
    "--banner-mobile-zoom:" + cssNumber(banner.bannerMobileZoom),
    "--banner-mobile-size:" + cssNumber(banner.bannerMobileZoom * 100) + "%"
  ].join(";");
}

export function renderProfileBanner(profile = {}, options = {}) {
  const banner = normalizeBannerProfile(profile);
  const className = ["profile-cover", options.className].filter(Boolean).join(" ");
  const alt = options.alt || "Banner do perfil";

  return [
    "<div class=\"" + escapeAttribute(className) + "\" style=\"" + escapeAttribute(bannerStyle(banner)) + "\">",
    "  <img loading=\"lazy\" decoding=\"async\" draggable=\"false\" class=\"profile-banner\" src=\"" + escapeAttribute(banner.banner) + "\" alt=\"" + escapeAttribute(alt) + "\">",
    "</div>"
  ].join("\n");
}

export function getBannerSaveData(profile = {}, bannerUrl = "") {
  const normalized = normalizeBannerProfile({
    ...profile,
    banner: bannerUrl || profile.banner || defaultBanner
  });

  return bannerFields(normalized);
}

export function validateBannerUrl(url) {
  if (isLikelyImageUrl(url)) {
    return { ok: true, message: "" };
  }

  return { ok: false, message: imageUrlErrorMessage() };
}

function createBannerModal() {
  const existing = document.querySelector("#bannerEditorModal");
  if (existing) return existing;

  const modal = document.createElement("div");
  modal.id = "bannerEditorModal";
  modal.className = "banner-editor-modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = [
    "<div class=\"banner-editor-panel\">",
    "  <div class=\"banner-editor-header\">",
    "    <strong>Editar banner</strong>",
    "    <button type=\"button\" data-banner-action=\"close\" aria-label=\"Fechar editor\">x</button>",
    "  </div>",
    "  <div class=\"banner-editor-previews\">",
    "    <div class=\"banner-preview-card is-active\" role=\"button\" tabindex=\"0\" data-banner-device-card=\"desktop\">",
    "      <span>Computador</span>",
    "      <div class=\"banner-preview-slot\" data-banner-preview=\"desktop\"></div>",
    "    </div>",
    "    <div class=\"banner-preview-card\" role=\"button\" tabindex=\"0\" data-banner-device-card=\"mobile\">",
    "      <span>Celular</span>",
    "      <div class=\"banner-preview-slot\" data-banner-preview=\"mobile\"></div>",
    "    </div>",
    "  </div>",
    "  <div class=\"banner-editor-device-tabs\" aria-label=\"Modo de edicao\">",
    "    <button type=\"button\" class=\"is-active\" data-banner-device=\"desktop\">Computador</button>",
    "    <button type=\"button\" data-banner-device=\"mobile\">Celular</button>",
    "  </div>",
    "  <div class=\"banner-editor-controls\">",
    "    <label>",
    "      <span>Zoom <output data-banner-output=\"zoom\">1x</output></span>",
    "      <input data-banner-control=\"zoom\" type=\"range\" min=\"1\" max=\"3\" step=\"0.05\" value=\"1\">",
    "    </label>",
    "    <div class=\"banner-move-title\">Mover imagem</div>",
    "    <label>",
    "      <span>Lado <output data-banner-output=\"x\">50%</output></span>",
    "      <input data-banner-control=\"x\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" value=\"50\">",
    "    </label>",
    "    <label>",
    "      <span>Altura <output data-banner-output=\"y\">50%</output></span>",
    "      <input data-banner-control=\"y\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" value=\"50\">",
    "    </label>",
    "  </div>",
    "  <div class=\"banner-editor-actions\">",
    "    <button type=\"button\" data-banner-action=\"center\">Centralizar</button>",
    "    <button type=\"button\" data-banner-action=\"reset\">Redefinir</button>",
    "    <button type=\"button\" data-banner-action=\"save\">Salvar</button>",
    "  </div>",
    "</div>"
  ].join("\n");

  document.body.appendChild(modal);
  return modal;
}

export function initBannerEditor(options = {}) {
  const {
    input,
    fileInput,
    uploadButton,
    uploadBox,
    openButton,
    resetButton,
    getProfile,
    updateProfile,
    onChange,
    showToast
  } = options;

  const modal = createBannerModal();
  const previewSlots = {
    desktop: modal.querySelector('[data-banner-preview="desktop"]'),
    mobile: modal.querySelector('[data-banner-preview="mobile"]')
  };
  const controls = {
    zoom: modal.querySelector('[data-banner-control="zoom"]'),
    x: modal.querySelector('[data-banner-control="x"]'),
    y: modal.querySelector('[data-banner-control="y"]')
  };
  const outputs = {
    zoom: modal.querySelector('[data-banner-output="zoom"]'),
    x: modal.querySelector('[data-banner-output="x"]'),
    y: modal.querySelector('[data-banner-output="y"]')
  };

  let draft = normalizeBannerProfile();
  let activeDevice = "desktop";

  function notify(message, type) {
    if (typeof showToast === "function") showToast(message, type);
  }

  function readProfile() {
    return typeof getProfile === "function" ? getProfile() || {} : {};
  }

  function updateBannerProfile(nextState) {
    const cleanState = bannerFields(nextState);
    if (input) input.value = cleanState.banner;
    if (typeof updateProfile === "function") updateProfile(cleanState);
    if (typeof onChange === "function") onChange(cleanState);
  }

  function closeEditor() {
    modal.classList.add("hidden");
  }

  function setActiveDevice(device) {
    activeDevice = device === "mobile" ? "mobile" : "desktop";

    modal.querySelectorAll("[data-banner-device]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.bannerDevice === activeDevice);
    });

    modal.querySelectorAll("[data-banner-device-card]").forEach((card) => {
      card.classList.toggle("is-active", card.dataset.bannerDeviceCard === activeDevice);
    });

    syncControls();
  }

  function renderPreviews() {
    previewSlots.desktop.innerHTML = renderProfileBanner(draft, {
      className: "banner-editor-cover banner-preview-desktop",
      alt: "Preview do banner no computador"
    });

    previewSlots.mobile.innerHTML = renderProfileBanner(draft, {
      className: "banner-editor-cover banner-preview-mobile",
      alt: "Preview do banner no celular"
    });
  }

  function syncControls() {
    const values = getDeviceValues(draft, activeDevice);
    controls.zoom.value = values.zoom;
    controls.x.value = values.x;
    controls.y.value = values.y;

    outputs.zoom.textContent = cssNumber(values.zoom) + "x";
    outputs.x.textContent = cssNumber(values.x) + "%";
    outputs.y.textContent = cssNumber(values.y) + "%";
  }

  function readControlValues() {
    draft = setDeviceValues(draft, activeDevice, {
      zoom: controls.zoom.value,
      x: controls.x.value,
      y: controls.y.value
    });

    syncControls();
    renderPreviews();
  }

  function openEditor() {
    const url = input?.value.trim() || readProfile().banner || defaultBanner;
    const validation = validateBannerUrl(url);

    if (!validation.ok) {
      notify(validation.message, "error");
      return;
    }

    draft = normalizeBannerProfile({
      ...readProfile(),
      banner: url || defaultBanner
    });

    renderPreviews();
    setActiveDevice(activeDevice);
    modal.classList.remove("hidden");
  }

  function centerActiveDevice() {
    const values = getDeviceValues(draft, activeDevice);
    draft = setDeviceValues(draft, activeDevice, {
      ...values,
      x: 50,
      y: 50
    });

    syncControls();
    renderPreviews();
  }

  function resetActiveDevice() {
    draft = setDeviceValues(draft, activeDevice, defaultDeviceValues());
    syncControls();
    renderPreviews();
  }

  function resetAllDevices() {
    const url = input?.value.trim() || readProfile().banner || defaultBanner;
    const nextState = normalizeBannerProfile({
      banner: url,
      ...DEFAULT_BANNER
    });

    draft = nextState;
    updateBannerProfile(nextState);
    notify("Banner redefinido. Salve o perfil para gravar.");
  }

  function saveDraft() {
    const nextState = normalizeBannerProfile(draft);
    updateBannerProfile(nextState);
    closeEditor();
    notify("Banner aplicado. Salve o perfil para gravar.");
  }

  function openFromInput() {
    const url = input?.value.trim();
    if (!url) return;

    const validation = validateBannerUrl(url);
    if (!validation.ok) {
      notify(validation.message, "error");
      return;
    }

    openEditor();
  }

  function bindPreviewDrag(slot, device) {
    let dragStart = null;

    slot.addEventListener("pointerdown", (event) => {
      setActiveDevice(device);
      const rect = slot.getBoundingClientRect();
      dragStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        rect,
        values: getDeviceValues(draft, device)
      };
      slot.setPointerCapture(event.pointerId);
    });

    slot.addEventListener("pointermove", (event) => {
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;

      const deltaX = ((event.clientX - dragStart.x) / dragStart.rect.width) * 100;
      const deltaY = ((event.clientY - dragStart.y) / dragStart.rect.height) * 100;

      draft = setDeviceValues(draft, device, {
        ...dragStart.values,
        x: dragStart.values.x - deltaX,
        y: dragStart.values.y - deltaY
      });

      syncControls();
      renderPreviews();
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
      slot.addEventListener(eventName, () => {
        dragStart = null;
      });
    });
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeEditor();

    const action = event.target.closest("[data-banner-action]")?.dataset.bannerAction;
    if (action === "close") closeEditor();
    if (action === "center") centerActiveDevice();
    if (action === "reset") resetActiveDevice();
    if (action === "save") saveDraft();

    const device = event.target.closest("[data-banner-device]")?.dataset.bannerDevice
      || event.target.closest("[data-banner-device-card]")?.dataset.bannerDeviceCard;

    if (device) setActiveDevice(device);
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeEditor();
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-banner-device-card]")) {
      event.preventDefault();
      setActiveDevice(event.target.dataset.bannerDeviceCard);
    }
  });

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", readControlValues);
  });

  bindPreviewDrag(previewSlots.desktop, "desktop");
  bindPreviewDrag(previewSlots.mobile, "mobile");

  openButton?.addEventListener("click", openEditor);
  resetButton?.addEventListener("click", resetAllDevices);

  input?.addEventListener("change", openFromInput);
  input?.addEventListener("paste", () => {
    setTimeout(openFromInput, 100);
  });

  bindDropZone(uploadBox, fileInput, () => {
    notify("Banner selecionado. Clique em carregar arquivo local.");
  });

  uploadButton?.addEventListener("click", async () => {
    try {
      const file = fileInput?.files?.[0];

      if (!file) {
        notify("Escolha um banner primeiro.", "error");
        return;
      }

      uploadButton.disabled = true;
      uploadButton.textContent = "Enviando...";

      const url = await uploadImageFile(file, "banners");
      if (input) input.value = url;

      draft = normalizeBannerProfile({
        ...readProfile(),
        banner: url
      });

      updateBannerProfile(draft);
      openEditor();
      notify("Banner enviado.");
    } catch (error) {
      notify(error.message || "Erro ao enviar banner.", "error");
    } finally {
      uploadButton.disabled = false;
      uploadButton.textContent = "Carregar arquivo local";
    }
  });

  return {
    open: openEditor,
    reset: resetAllDevices,
    getSaveData() {
      const url = input?.value.trim() || readProfile().banner || defaultBanner;
      const validation = validateBannerUrl(url);

      if (!validation.ok) {
        return { ok: false, message: validation.message, data: null };
      }

      return {
        ok: true,
        message: "",
        data: getBannerSaveData(readProfile(), url)
      };
    }
  };
}
