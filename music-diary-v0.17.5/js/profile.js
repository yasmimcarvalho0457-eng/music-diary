import { auth, db, defaultAvatar } from "./firebase.js";
import { showToast, firebaseErrorMessage, avatarHTML, escapeHTML } from "./utils.js";
import { isLikelyImageUrl, imageUrlErrorMessage } from "./image-utils.js";
import { uploadImageFile, bindDropZone, previewLocalImage } from "./upload.js";
import { protectPage } from "./auth.js";
import { applyTheme, applySavedTheme } from "./theme.js";
import { musicPlayerHTML } from "./music.js";
import { initBannerEditor, normalizeBannerProfile, renderProfileBanner } from "./banner.js";
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
const photoUploadBox = document.querySelector(".photo-upload-box");
const resetPhotoBtn = document.querySelector("#resetPhotoBtn");
const openPhotoCropBtn = document.querySelector("#openPhotoCropBtn");

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

let currentUser = null;
let currentProfile = null;

function openEditorFromHash() {
  const hash = window.location.hash.replace("#", "");
  const editorHashes = ["editar", "configuracoes", "temas"];

  if (!editorHashes.includes(hash)) return;

  editorPanel.classList.remove("hidden");

  const target = hash === "temas" ? profileForm.theme : editorPanel;
  setTimeout(() => target?.scrollIntoView({ block: "center" }), 0);
}

function completeProfile(user, data = {}) {
  const email = data.email || user?.email || "";
  const fallbackName = email ? email.split("@")[0] : "usuaria";

  return {
    ...data,
    email,
    username: data.username || fallbackName,
    displayName: data.displayName || data.username || fallbackName,
    bio: data.bio || "Nova no Music Diary \u2728",
    photo: data.photo || defaultAvatar,
    photoZoom: Number(data.photoZoom || 1),
    photoX: Number(data.photoX || 0),
    photoY: Number(data.photoY || 0),
    ...normalizeBannerProfile(data),
    theme: data.theme || "sakura",
    musicTitle: data.musicTitle || "",
    musicArtist: data.musicArtist || "",
    musicUrl: data.musicUrl || "",
    customStatus: data.customStatus || "\uD83C\uDFB5 ouvindo m\u00FAsica"
  };
}

function updateBannerProfile(bannerData) {
  currentProfile = completeProfile(currentUser, {
    ...currentProfile,
    ...bannerData
  });

  if (bannerInput) bannerInput.value = currentProfile.banner;
}

const bannerEditor = initBannerEditor({
  input: bannerInput,
  fileInput: document.querySelector("#bannerFileInput"),
  uploadButton: document.querySelector("#uploadBannerBtn"),
  uploadBox: document.querySelector(".banner-upload-box"),
  openButton: document.querySelector("#openBannerCropBtn"),
  resetButton: document.querySelector("#resetBannerBtn"),
  getProfile: () => currentProfile,
  updateProfile: updateBannerProfile,
  onChange: () => {
    if (currentProfile) renderProfile();
  },
  showToast
});

function updatePhotoCropPreview() {
  if (!cropImage) return;
  cropImage.style.transform = "translate(" + cropX.value + "px, " + cropY.value + "px) scale(" + cropZoom.value + ")";
}

function openPhotoCropModal() {
  const url = photoInput.value.trim() || defaultAvatar;

  cropTitle.textContent = "Cortar foto de perfil";
  cropImage.src = url;
  cropFrame.className = "crop-frame photo-frame";
  cropStage.style.backgroundImage = "";
  cropImage.style.opacity = "1";
  cropZoom.value = zoom.value || 1;
  cropX.min = -160;
  cropX.max = 160;
  cropY.min = -160;
  cropY.max = 160;
  cropX.value = posX.value || 0;
  cropY.value = posY.value || 0;

  cropModal.classList.remove("hidden");
  updatePhotoCropPreview();
}

function closePhotoCropModal() {
  cropModal.classList.add("hidden");
}

function applyPreview() {
  if (!preview) return;
  preview.style.transform = "translate(" + posX.value + "px, " + posY.value + "px) scale(" + zoom.value + ")";
}

async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const firestoreData = snap.exists() ? snap.data() : {};

  currentProfile = completeProfile(user, firestoreData);

  applyTheme(currentProfile.theme || "sakura");
  renderProfile();
  fillForm();
}

function renderProfile() {
  profileView.innerHTML = [
    renderProfileBanner(currentProfile),
    "<div class=\"profile-main\">",
    avatarHTML(currentProfile.photo || defaultAvatar, currentProfile.photoZoom || 1, currentProfile.photoX || 0, currentProfile.photoY || 0, "large"),
    "<h2>@" + escapeHTML(currentProfile.username) + "</h2>",
    "<p class=\"status-box\">" + escapeHTML(currentProfile.customStatus || "\u2728 online no Music Diary") + "</p>",
    "<p class=\"bio-box\">" + escapeHTML(currentProfile.bio || "Sem bio ainda.") + "</p>",
    "<div class=\"profile-widgets\">",
    "<div class=\"mini-window\"><strong>\uD83C\uDFB5 M\u00FAsica do perfil</strong>" + musicPlayerHTML(currentProfile) + "</div>",
    "<div class=\"mini-window\"><strong>\uD83D\uDCD4 Di\u00E1rio</strong><p>Seu espa\u00E7o para notas privadas e p\u00FAblicas.</p></div>",
    "<div class=\"mini-window\"><strong>\uD83D\uDCBF Playlists</strong><p><a class=\"soft-link\" href=\"playlists.html\">Ver playlists</a></p></div>",
    "<div class=\"mini-window\"><strong>\u2B50 Badges</strong><p>Novas conquistas v\u00E3o aparecer aqui.</p></div>",
    "</div>",
    "</div>"
  ].join("\n");
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
  bannerInput.value = currentProfile.banner || "";
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
    openPhotoCropModal();
    showToast("Foto enviada.");
  } catch (error) {
    showToast(error.message || "Erro ao enviar foto.", "error");
  } finally {
    uploadPhotoBtn.disabled = false;
    uploadPhotoBtn.textContent = "Carregar arquivo local";
  }
});

editProfileBtn.addEventListener("click", () => editorPanel.classList.toggle("hidden"));
window.addEventListener("hashchange", openEditorFromHash);

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
  openPhotoCropModal();
});

resetPhotoBtn?.addEventListener("click", () => {
  zoom.value = 1;
  posX.value = 0;
  posY.value = 0;
  applyPreview();
  showToast("Enquadramento da foto redefinido.");
});

openPhotoCropBtn?.addEventListener("click", openPhotoCropModal);
closeCropBtn?.addEventListener("click", closePhotoCropModal);

cropModal?.addEventListener("click", (event) => {
  if (event.target === cropModal) closePhotoCropModal();
});

[cropZoom, cropX, cropY].forEach((range) => {
  range?.addEventListener("input", updatePhotoCropPreview);
});

resetCropBtn?.addEventListener("click", () => {
  cropZoom.value = 1;
  cropX.value = 0;
  cropY.value = 0;
  updatePhotoCropPreview();
});

applyCropBtn?.addEventListener("click", () => {
  zoom.value = cropZoom.value;
  posX.value = cropX.value;
  posY.value = cropY.value;
  preview.src = photoInput.value.trim() || defaultAvatar;
  applyPreview();
  closePhotoCropModal();
  showToast("Enquadramento da foto aplicado.");
});

[zoom, posX, posY].forEach((range) => range.addEventListener("input", applyPreview));

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const photoLink = photoInput.value.trim();
  const bannerResult = bannerEditor.getSaveData();

  if (photoLink && !isLikelyImageUrl(photoLink)) {
    showToast(imageUrlErrorMessage(), "error");
    return;
  }

  if (!bannerResult.ok) {
    showToast(bannerResult.message, "error");
    return;
  }

  const cleanUsername = profileForm.username.value.trim().replaceAll(" ", "").toLowerCase() || currentUser.email.split("@")[0];
  const updatedProfile = {
    email: currentUser.email,
    username: cleanUsername,
    displayName: cleanUsername,
    bio: profileForm.bio.value.trim(),
    theme: profileForm.theme.value || "sakura",
    customStatus: profileForm.customStatus?.value.trim() || "",
    musicTitle: profileForm.musicTitle?.value.trim() || "",
    musicArtist: profileForm.musicArtist?.value.trim() || "",
    musicUrl: profileForm.musicUrl?.value.trim() || "",
    photo: photoLink || defaultAvatar,
    photoZoom: Number(zoom.value || 1),
    photoX: Number(posX.value || 0),
    photoY: Number(posY.value || 0),
    ...bannerResult.data,
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
    showToast("Perfil atualizado.");
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadProfile(user);
  openEditorFromHash();
});
