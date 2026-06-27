import { auth, db, defaultAvatar, defaultBanner } from "./firebase.js";
import { showToast, firebaseErrorMessage, avatarHTML, escapeHTML } from "./utils.js";
import { isLikelyImageUrl, imageUrlErrorMessage } from "./image-utils.js";
import { uploadImageFile, bindDropZone, previewLocalImage } from "./upload.js";
import { protectPage } from "./auth.js";
import { applyTheme, applySavedTheme } from "./theme.js";
import { musicPlayerHTML } from "./music.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applySavedTheme();

const profileView = document.querySelector("#profileView");
const profileForm = document.querySelector("#profileForm");
const editProfileBtn = document.querySelector("#editProfileBtn");
const editorPanel = document.querySelector("#editorPanel");

const photoInput = document.querySelector("#photo");
const bannerInput = document.querySelector("#banner");
const preview = document.querySelector("#avatarPreview");
const zoom = document.querySelector("#photoZoom");
const posX = document.querySelector("#photoX");
const posY = document.querySelector("#photoY");
const loadPhotoBtn = document.querySelector("#loadPhotoBtn");
const photoFileInput = document.querySelector("#photoFileInput");
const uploadPhotoBtn = document.querySelector("#uploadPhotoBtn");
const bannerFileInput = document.querySelector("#bannerFileInput");
const uploadBannerBtn = document.querySelector("#uploadBannerBtn");
const photoUploadBox = document.querySelector(".photo-upload-box");
const bannerUploadBox = document.querySelector(".banner-upload-box");
const resetPhotoBtn = document.querySelector("#resetPhotoBtn");
const resetBannerBtn = document.querySelector("#resetBannerBtn");
const openPhotoCropBtn = document.querySelector("#openPhotoCropBtn");
const openBannerCropBtn = document.querySelector("#openBannerCropBtn");
const cropModal = document.querySelector("#cropModal");
const cropTitle = document.querySelector("#cropTitle");
const closeCropBtn = document.querySelector("#closeCropBtn");
const cropImage = document.querySelector("#cropImage");
const cropStage = document.querySelector("#cropStage");
const cropFrame = document.querySelector("#cropFrame");
const cropZoom = document.querySelector("#cropZoom");
const cropX = document.querySelector("#cropX");
const cropY = document.querySelector("#cropY");
const applyCropBtn = document.querySelector("#applyCropBtn");
const resetCropBtn = document.querySelector("#resetCropBtn");
const cropDeviceMode = document.querySelector("#cropDeviceMode");

let currentUser = null;
let currentProfile = null;
let cropMode = null;

function completeProfile(user, data = {}) {
  return {
    ...data,
    email: data.email || user.email || "",
    username: data.username || user.email.split("@")[0],
    displayName: data.displayName || data.username || user.email.split("@")[0],
    bio: data.bio || "Nova no Music Diary ✨",
    photo: data.photo || defaultAvatar,
    banner: data.banner || defaultBanner,
    photoZoom: Number(data.photoZoom || 1),
    photoX: Number(data.photoX || 0),
    photoY: Number(data.photoY || 0),
    bannerZoom: Number(data.bannerZoom || 1),
    bannerX: Number(data.bannerX || 0),
    bannerY: Number(data.bannerY || 0),
    bannerDesktopZoom: Number(data.bannerDesktopZoom ?? data.bannerZoom ?? 1),
    bannerDesktopX: Number(data.bannerDesktopX ?? data.bannerX ?? 0),
    bannerDesktopY: Number(data.bannerDesktopY ?? data.bannerY ?? 0),
    bannerMobileZoom: Number(data.bannerMobileZoom ?? 1),
    bannerMobileX: Number(data.bannerMobileX ?? 0),
    bannerMobileY: Number(data.bannerMobileY ?? 0),
    theme: data.theme || "sakura",
    musicTitle: data.musicTitle || "",
    musicArtist: data.musicArtist || "",
    musicUrl: data.musicUrl || "",
    customStatus: data.customStatus || "🎵 ouvindo música"
  };
}


function updateCropPreview() {
  if (!cropImage) return;

  if (cropMode === "banner") {
    cropStage.style.backgroundImage = `url('${cropImage.src}')`;
    cropStage.style.backgroundSize = `${Number(cropZoom.value || 1) * 100}% auto`;
    cropStage.style.backgroundPosition = `${cropX.value}% ${cropY.value}%`;
    cropImage.style.opacity = "0";
    return;
  }

  cropStage.style.backgroundImage = "";
  cropImage.style.opacity = "1";
  cropImage.style.transform = `translate(${cropX.value}px, ${cropY.value}px) scale(${cropZoom.value})`;
}


function openCropModal(mode) {
  cropMode = mode;

  if (mode === "photo") {
    const url = photoInput.value.trim() || defaultAvatar;
    cropTitle.textContent = "Cortar foto de perfil";
    cropImage.src = url;
    cropFrame.className = "crop-frame photo-frame";
    cropStage?.classList.remove("banner-mode", "mobile-banner-mode");
    cropZoom.value = zoom.value || 1;
    cropX.min = -160;
    cropX.max = 160;
    cropY.min = -160;
    cropY.max = 160;
    cropX.value = posX.value || 0;
    cropY.value = posY.value || 0;
  }

  if (mode === "banner") {
    const url = bannerInput.value.trim() || defaultBanner;
    const device = cropDeviceMode?.value || "desktop";

    cropTitle.textContent = device === "desktop" ? "Ajustar banner do computador" : "Ajustar banner do celular";
    cropImage.src = url;
    cropFrame.className = device === "desktop" ? "crop-frame banner-frame desktop-banner-frame" : "crop-frame banner-frame mobile-banner-frame";
    cropStage?.classList.add("banner-mode");
    cropStage?.classList.toggle("mobile-banner-mode", device === "mobile");

    cropX.min = 0;
    cropX.max = 100;
    cropY.min = 0;
    cropY.max = 100;

    if (device === "desktop") {
      cropZoom.value = currentProfile?.bannerDesktopZoom ?? currentProfile?.bannerZoom ?? 1;
      cropX.value = currentProfile?.bannerDesktopX ?? currentProfile?.bannerX ?? 50;
      cropY.value = currentProfile?.bannerDesktopY ?? currentProfile?.bannerY ?? 50;
    } else {
      cropZoom.value = currentProfile?.bannerMobileZoom ?? 1;
      cropX.value = currentProfile?.bannerMobileX ?? 50;
      cropY.value = currentProfile?.bannerMobileY ?? 50;
    }
  }

  cropModal.classList.remove("hidden");
  updateCropPreview();
}


function closeCropModal() {
  cropModal.classList.add("hidden");
  cropStage?.classList.remove("mobile-banner-mode");
  cropMode = null;
}


function applyPreview() {
  if (!preview) return;
  preview.style.transform = `translate(${posX.value}px, ${posY.value}px) scale(${zoom.value})`;
}

async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const firestoreData = snap.exists() ? snap.data() : {};
  currentProfile = completeProfile(user, firestoreData);

  // Não salva nada automaticamente ao carregar.
  // Isso evita sobrescrever foto/banner/tema/música com valores padrão.

  applyTheme(currentProfile.theme || "sakura");
  renderProfile();
  fillForm();
}

function renderProfile() {
  profileView.innerHTML = `
    <div class="profile-cover banner-bg" style="background-image: linear-gradient(rgba(255,255,255,.15), rgba(255,180,235,.25)), url('${currentProfile.banner || defaultBanner}'); --banner-desktop-size:${currentProfile.bannerDesktopZoom ?? currentProfile.bannerZoom ?? 1}; --banner-desktop-x:${currentProfile.bannerDesktopX ?? currentProfile.bannerX ?? 50}%; --banner-desktop-y:${currentProfile.bannerDesktopY ?? currentProfile.bannerY ?? 50}%; --banner-mobile-size:${currentProfile.bannerMobileZoom ?? 1}; --banner-mobile-x:${currentProfile.bannerMobileX ?? 50}%; --banner-mobile-y:${currentProfile.bannerMobileY ?? 50}%;">
      <div class="sparkle">✦ ✧ ✦</div>
    </div>

    <div class="profile-main">
      ${avatarHTML(currentProfile.photo || defaultAvatar, currentProfile.photoZoom || 1, currentProfile.photoX || 0, currentProfile.photoY || 0, "large")}
      <h2>@${escapeHTML(currentProfile.username)}</h2>
      <p class="muted">${escapeHTML(currentProfile.email)}</p>
      <p class="status-box">${escapeHTML(currentProfile.customStatus || "✨ online no Music Diary")}</p>
      <p class="bio-box">${escapeHTML(currentProfile.bio || "Sem bio ainda.")}</p>

      <div class="profile-widgets">
        <div class="mini-window">
          <strong>🎵 Música do perfil</strong>
          ${musicPlayerHTML(currentProfile)}
        </div>
        <div class="mini-window">
          <strong>📔 Diário</strong>
          <p>Seu espaço para notas privadas e públicas.</p>
        </div>
        <div class="mini-window">
          <strong>💿 Playlists</strong>
          <p><a class="soft-link" href="playlists.html">Ver playlists</a></p>
        </div>
        <div class="mini-window">
          <strong>⭐ Badges</strong>
          <p>Novas conquistas vão aparecer aqui.</p>
        </div>
      </div>
    </div>
  `;
}

function fillForm() {
  profileForm.username.value = currentProfile.username || "";
  profileForm.bio.value = currentProfile.bio || "";
  profileForm.theme.value = currentProfile.theme || "sakura";

  if (profileForm.customStatus) profileForm.customStatus.value = currentProfile.customStatus || "";
  if (profileForm.musicTitle) profileForm.musicTitle.value = currentProfile.musicTitle || "";
  if (profileForm.musicArtist) profileForm.musicArtist.value = currentProfile.musicArtist || "";
  if (profileForm.musicUrl) profileForm.musicUrl.value = currentProfile.musicUrl || "";

  photoInput.value = currentProfile.photo || defaultAvatar;
  bannerInput.value = currentProfile.banner || defaultBanner;
  preview.src = currentProfile.photo || defaultAvatar;
  zoom.value = currentProfile.photoZoom || 1;
  posX.value = currentProfile.photoX || 0;
  posY.value = currentProfile.photoY || 0;
  applyPreview();
}



bindDropZone(photoUploadBox, photoFileInput, (file) => {
  previewLocalImage(file, preview);
  showToast("Foto selecionada. Clique em carregar arquivo local.");
});

bindDropZone(bannerUploadBox, bannerFileInput, () => {
  showToast("Banner selecionado. Clique em carregar arquivo local.");
});


uploadPhotoBtn?.addEventListener("click", async () => {
  try {
    const file = photoFileInput?.files?.[0];

    if (!file) {
      showToast("Escolha uma foto primeiro.", "error");
      return;
    }

    uploadPhotoBtn.disabled = true;
    uploadPhotoBtn.textContent = "Enviando...";

    const url = await uploadImageFile(file, "profile-photos");
    photoInput.value = url;
    preview.src = url;
    applyPreview();

    if (typeof openCropModal === "function") openCropModal("photo");

    showToast("Foto enviada ✨");
  } catch (error) {
    showToast(error.message || "Erro ao enviar foto.", "error");
  } finally {
    uploadPhotoBtn.disabled = false;
    uploadPhotoBtn.textContent = "Carregar arquivo local";
  }
});

uploadBannerBtn?.addEventListener("click", async () => {
  try {
    const file = bannerFileInput?.files?.[0];

    if (!file) {
      showToast("Escolha um banner primeiro.", "error");
      return;
    }

    uploadBannerBtn.disabled = true;
    uploadBannerBtn.textContent = "Enviando...";

    const url = await uploadImageFile(file, "banners");
    bannerInput.value = url;

    if (currentProfile) {
      currentProfile.banner = url;
      currentProfile.bannerZoom = currentProfile.bannerZoom || 1;
      currentProfile.bannerX = currentProfile.bannerX || 0;
      currentProfile.bannerY = currentProfile.bannerY || 0;
    }

    if (typeof openCropModal === "function") openCropModal("banner");

    showToast("Banner enviado ✨");
  } catch (error) {
    showToast(error.message || "Erro ao enviar banner.", "error");
  } finally {
    uploadBannerBtn.disabled = false;
    uploadBannerBtn.textContent = "Carregar arquivo local";
  }
});


editProfileBtn.addEventListener("click", () => editorPanel.classList.toggle("hidden"));

loadPhotoBtn.addEventListener("click", () => {
  const url = photoInput.value.trim();
  if (!url) {
    showToast("Cole o link da imagem primeiro.", "error");
    return;
  }

  if (!isLikelyImageUrl(url)) {
    showToast(imageUrlErrorMessage(), "error");
    return;
  }
  preview.src = url;
  applyPreview();
  openCropModal("photo");
});

resetPhotoBtn?.addEventListener("click", () => {
  zoom.value = 1;
  posX.value = 0;
  posY.value = 0;
  applyPreview();
  showToast("Enquadramento da foto redefinido ✨");
});

resetBannerBtn?.addEventListener("click", () => {
  currentProfile.bannerZoom = 1;
  currentProfile.bannerX = 50;
  currentProfile.bannerY = 50;
  currentProfile.bannerDesktopZoom = 1;
  currentProfile.bannerDesktopX = 50;
  currentProfile.bannerDesktopY = 50;
  currentProfile.bannerMobileZoom = 1;
  currentProfile.bannerMobileX = 50;
  currentProfile.bannerMobileY = 50;
  if (!bannerInput.value.trim()) bannerInput.value = defaultBanner;
  renderProfile();
  showToast("Banner centralizado no PC e celular. Salve para aplicar.");
});




bannerInput?.addEventListener("change", () => {
  if (bannerInput.value.trim()) {
    if (!isLikelyImageUrl(bannerInput.value.trim())) {
      showToast(imageUrlErrorMessage(), "error");
      return;
    }
    openCropModal("banner");
  }
});

bannerInput?.addEventListener("paste", () => {
  setTimeout(() => {
    if (bannerInput.value.trim()) {
    if (!isLikelyImageUrl(bannerInput.value.trim())) {
      showToast(imageUrlErrorMessage(), "error");
      return;
    }
    openCropModal("banner");
  }
  }, 100);
});

openPhotoCropBtn?.addEventListener("click", () => openCropModal("photo"));
openBannerCropBtn?.addEventListener("click", () => openCropModal("banner"));

cropDeviceMode?.addEventListener("change", () => {
  if (cropMode === "banner") openCropModal("banner");
});

closeCropBtn?.addEventListener("click", closeCropModal);

cropModal?.addEventListener("click", (event) => {
  if (event.target === cropModal) closeCropModal();
});

[cropZoom, cropX, cropY].forEach((range) => {
  range?.addEventListener("input", updateCropPreview);
});

resetCropBtn?.addEventListener("click", () => {
  cropZoom.value = 1;
  cropX.value = 0;
  cropY.value = 0;
  updateCropPreview();
});

applyCropBtn?.addEventListener("click", () => {
  if (cropMode === "photo") {
    zoom.value = cropZoom.value;
    posX.value = cropX.value;
    posY.value = cropY.value;
    preview.src = photoInput.value.trim() || defaultAvatar;
    applyPreview();
    showToast("Enquadramento da foto aplicado ✨");
  }

  if (cropMode === "banner") {
    const device = cropDeviceMode?.value || "desktop";

    if (device === "desktop") {
      currentProfile.bannerDesktopZoom = Number(cropZoom.value || 1);
      currentProfile.bannerDesktopX = Number(cropX.value || 50);
      currentProfile.bannerDesktopY = Number(cropY.value || 50);

      currentProfile.bannerZoom = currentProfile.bannerDesktopZoom;
      currentProfile.bannerX = currentProfile.bannerDesktopX;
      currentProfile.bannerY = currentProfile.bannerDesktopY;
    } else {
      currentProfile.bannerMobileZoom = Number(cropZoom.value || 1);
      currentProfile.bannerMobileX = Number(cropX.value || 50);
      currentProfile.bannerMobileY = Number(cropY.value || 50);
    }

    renderProfile();
    showToast(device === "desktop" ? "Banner do PC aplicado ✨" : "Banner do celular aplicado ✨");
  }

  closeCropModal();
});


[zoom, posX, posY].forEach((range) => range.addEventListener("input", applyPreview));

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const photoLink = photoInput.value.trim();
  const bannerLink = bannerInput.value.trim();

  if (photoLink && !isLikelyImageUrl(photoLink)) {
    showToast(imageUrlErrorMessage(), "error");
    return;
  }

  if (bannerLink && !isLikelyImageUrl(bannerLink)) {
    showToast(imageUrlErrorMessage(), "error");
    return;
  }

  const updatedProfile = {
    email: currentUser.email,
    username: profileForm.username.value.trim().replaceAll(" ", "").toLowerCase() || currentUser.email.split("@")[0],
    displayName: profileForm.username.value.trim().replaceAll(" ", "").toLowerCase() || currentUser.email.split("@")[0],
    bio: profileForm.bio.value.trim(),
    theme: profileForm.theme.value || "sakura",
    customStatus: profileForm.customStatus?.value.trim() || "",
    musicTitle: profileForm.musicTitle?.value.trim() || "",
    musicArtist: profileForm.musicArtist?.value.trim() || "",
    musicUrl: profileForm.musicUrl?.value.trim() || "",
    photo: photoLink || defaultAvatar,
    banner: bannerLink || defaultBanner,
    photoZoom: Number(zoom.value || 1),
    photoX: Number(posX.value || 0),
    photoY: Number(posY.value || 0),
    bannerZoom: Number(currentProfile?.bannerZoom || 1),
    bannerX: Number(currentProfile?.bannerX || 0),
    bannerY: Number(currentProfile?.bannerY || 0),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, "users", currentUser.uid), updatedProfile, { merge: true });

    currentProfile = completeProfile(currentUser, {
      ...currentProfile,
      ...updatedProfile
    });

    applyTheme(updatedProfile.theme || "sakura");
    renderProfile();
    fillForm();
    showToast("Perfil atualizado 💖");
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadProfile(user);
});
