import { auth, db, defaultAvatar, defaultBanner } from "./firebase.js";
import { showToast, firebaseErrorMessage, avatarHTML, escapeHTML } from "./utils.js";
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

let currentUser = null;
let currentProfile = null;

function backupKey(uid) {
  return `musicDiaryProfileBackup_${uid}`;
}

function saveLocalBackup(uid, profile) {
  localStorage.setItem(backupKey(uid), JSON.stringify(profile));
}

function getLocalBackup(uid) {
  try {
    return JSON.parse(localStorage.getItem(backupKey(uid)) || "{}");
  } catch {
    return {};
  }
}

function completeProfile(user, data = {}) {
  return {
    email: data.email || user.email || "",
    username: data.username || user.email.split("@")[0],
    displayName: data.displayName || data.username || user.email.split("@")[0],
    bio: data.bio || "Nova no Music Diary ✨",
    photo: data.photo || defaultAvatar,
    banner: data.banner || defaultBanner,
    photoZoom: Number(data.photoZoom || 1),
    photoX: Number(data.photoX || 0),
    photoY: Number(data.photoY || 0),
    theme: data.theme || "sakura",
    musicTitle: data.musicTitle || "",
    musicArtist: data.musicArtist || "",
    musicUrl: data.musicUrl || ""
  };
}

function applyPreview() {
  if (!preview) return;
  preview.style.transform = `translate(${posX.value}px, ${posY.value}px) scale(${zoom.value})`;
}

async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const firestoreData = snap.exists() ? snap.data() : {};
  const localData = getLocalBackup(user.uid);

  // Prioridade:
  // 1. Firestore com dados reais
  // 2. Backup local se o Firestore estiver incompleto
  // 3. Padrões só para campos realmente vazios
  const mergedData = {
    ...localData,
    ...firestoreData
  };

  if (!firestoreData.photo && localData.photo) mergedData.photo = localData.photo;
  if (!firestoreData.banner && localData.banner) mergedData.banner = localData.banner;
  if (!firestoreData.theme && localData.theme) mergedData.theme = localData.theme;
  if (!firestoreData.musicUrl && localData.musicUrl) mergedData.musicUrl = localData.musicUrl;
  if (!firestoreData.musicTitle && localData.musicTitle) mergedData.musicTitle = localData.musicTitle;
  if (!firestoreData.musicArtist && localData.musicArtist) mergedData.musicArtist = localData.musicArtist;
  if (!firestoreData.username && localData.username) mergedData.username = localData.username;
  if (!firestoreData.bio && localData.bio) mergedData.bio = localData.bio;

  currentProfile = completeProfile(user, mergedData);

  // Importante: NÃO grava padrões no Firestore ao carregar.
  // Só salva no Firestore quando o usuário clicar em "Salvar alterações".
  saveLocalBackup(user.uid, currentProfile);

  applyTheme(currentProfile.theme || "sakura");
  renderProfile();
  fillForm();
}

function renderProfile() {
  profileView.innerHTML = `
    <div class="profile-cover" style="background-image: linear-gradient(rgba(255,255,255,.15), rgba(255,180,235,.25)), url('${currentProfile.banner || defaultBanner}')">
      <div class="sparkle">✦ ✧ ✦</div>
    </div>

    <div class="profile-main">
      ${avatarHTML(currentProfile.photo || defaultAvatar, currentProfile.photoZoom || 1, currentProfile.photoX || 0, currentProfile.photoY || 0, "large")}
      <h2>@${escapeHTML(currentProfile.username)}</h2>
      <p class="muted">${escapeHTML(currentProfile.email)}</p>
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

editProfileBtn.addEventListener("click", () => editorPanel.classList.toggle("hidden"));

loadPhotoBtn.addEventListener("click", () => {
  const url = photoInput.value.trim();
  if (!url) {
    showToast("Cole o link da imagem primeiro.", "error");
    return;
  }
  preview.src = url;
  applyPreview();
});

[zoom, posX, posY].forEach((range) => range.addEventListener("input", applyPreview));

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const updatedProfile = {
    email: currentUser.email,
    username: profileForm.username.value.trim().replaceAll(" ", "").toLowerCase() || currentUser.email.split("@")[0],
    bio: profileForm.bio.value.trim(),
    theme: profileForm.theme.value || "sakura",
    musicTitle: profileForm.musicTitle?.value.trim() || "",
    musicArtist: profileForm.musicArtist?.value.trim() || "",
    musicUrl: profileForm.musicUrl?.value.trim() || "",
    photo: photoInput.value.trim() || defaultAvatar,
    banner: bannerInput.value.trim() || defaultBanner,
    photoZoom: Number(zoom.value || 1),
    photoX: Number(posX.value || 0),
    photoY: Number(posY.value || 0),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, "users", currentUser.uid), updatedProfile, { merge: true });

    currentProfile = completeProfile(currentUser, {
      ...currentProfile,
      ...updatedProfile
    });

    saveLocalBackup(currentUser.uid, currentProfile);
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
